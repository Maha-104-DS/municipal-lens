import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Target,
  Download,
  CheckCircle2,
  XCircle,
  Minus,
  AlertCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';

const KOLADA_API = 'https://api.kolada.se/v2';

// Key KPI IDs for KKiK report
const KPIS = {
  POPULATION: 'N01951',
  EMPLOYMENT: 'N00956',
  INCOME: 'N01993',
  GRADUATION_RATE: 'N00932',
  EDUCATION_LEVEL: 'N00929',
  LIFE_EXPECTANCY_MEN: 'N00923',
  LIFE_EXPECTANCY_WOMEN: 'N00924',
  TAX_BASE: 'N00945',
  PUBLIC_DEBT: 'N00946',
  ELECTION_PARTICIPATION: 'N00991',
};

const KKiK_CATEGORIES = [
  {
    id: 'education',
    name: 'Utbildning',
    kpis: [
      { id: KPIS.GRADUATION_RATE, title: 'Gymnasieelever med examen inom 3 år' },
      { id: KPIS.EDUCATION_LEVEL, title: 'Andel med eftergymnasial utbildning' }
    ]
  },
  {
    id: 'economy',
    name: 'Ekonomi',
    kpis: [
      { id: KPIS.INCOME, title: 'Medianinkomst' },
      { id: KPIS.EMPLOYMENT, title: 'Sysselsättningsgrad' },
      { id: KPIS.TAX_BASE, title: 'Skattebas per invånare' }
    ]
  },
  {
    id: 'health',
    name: 'Hälsa',
    kpis: [
      { id: KPIS.LIFE_EXPECTANCY_MEN, title: 'Livslängd, män' },
      { id: KPIS.LIFE_EXPECTANCY_WOMEN, title: 'Livslängd, kvinnor' }
    ]
  },
  {
    id: 'democracy',
    name: 'Demokrati',
    kpis: [
      { id: KPIS.ELECTION_PARTICIPATION, title: 'Valdeltagande' }
    ]
  }
];

const QualityInBriefPage = ({ municipalityId, municipalityName, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [kkikData, setKkikData] = useState(null);
  const [nationalAverages, setNationalAverages] = useState({});

  useEffect(() => {
    if (municipalityId) {
      fetchKKiKData();
    }
  }, [municipalityId]);

  const fetchKKiKData = async () => {
    setLoading(true);
    try {
      await fetchNationalAverages();
      const municipalityData = await fetchMunicipalityData(municipalityId);
      const kkikReport = await prepareKKiKReport(municipalityData);
      setKkikData(kkikReport);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch KKiK data:', err);
      setLoading(false);
    }
  };

  const fetchNationalAverages = async () => {
    const averages = {};
    
    try {
      for (const category of KKiK_CATEGORIES) {
        for (const kpi of category.kpis) {
          try {
            const response = await fetch(`${KOLADA_API}/data/kpi/${kpi.id}/municipality/0000`);
            const data = await response.json();
            
            if (data.values && data.values[0] && data.values[0].values.length > 0) {
              const latestValue = data.values[0].values
                .filter(v => v.value !== null)
                .sort((a, b) => b.period - a.period)[0];
              
              if (latestValue) {
                averages[kpi.id] = latestValue.value;
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch national average for ${kpi.id}:`, err);
          }
        }
      }
      setNationalAverages(averages);
    } catch (err) {
      console.error('Failed to fetch national averages:', err);
    }
  };

  const fetchMunicipalityData = async (municipalityId) => {
    const municipalityData = {};
    
    try {
      for (const category of KKiK_CATEGORIES) {
        for (const kpi of category.kpis) {
          try {
            const response = await fetch(`${KOLADA_API}/data/kpi/${kpi.id}/municipality/${municipalityId}`);
            const data = await response.json();
            
            if (data.values && data.values[0] && data.values[0].values.length > 0) {
              const values = data.values[0].values
                .filter(v => v.value !== null)
                .sort((a, b) => b.period - a.period)
                .slice(0, 3);
              
              municipalityData[kpi.id] = {
                current: values[0]?.value,
                trend: values,
                metadata: data.values[0]?.kpi
              };
            } else {
              municipalityData[kpi.id] = {
                current: null,
                trend: [],
                metadata: null
              };
            }
          } catch (err) {
            console.warn(`Failed to fetch data for ${kpi.id}:`, err);
            municipalityData[kpi.id] = {
              current: null,
              trend: [],
              metadata: null
            };
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch municipality data:', err);
    }
    
    return municipalityData;
  };

  const prepareKKiKReport = (municipalityData) => {
    // Calculate trend
    const calculateTrend = (values) => {
      if (!values || values.length < 2) return 'stable';
      const current = values[0]?.value;
      const previous = values[1]?.value;
      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'stable';
    };

    // Calculate comparison to national average
    const calculateComparison = (currentValue, nationalAverage) => {
      if (!currentValue || !nationalAverage) return 'unknown';
      const difference = ((currentValue - nationalAverage) / nationalAverage) * 100;
      if (difference > 5) return 'above';
      if (difference < -5) return 'below';
      return 'equal';
    };

    // Calculate category score (1-5)
    const calculateCategoryScore = (indicators) => {
      if (!indicators || indicators.length === 0) return 3;
      
      let totalScore = 0;
      let validIndicators = 0;
      
      indicators.forEach(indicator => {
        if (indicator.value !== null && nationalAverages[indicator.kpiId]) {
          const comparison = calculateComparison(indicator.value, nationalAverages[indicator.kpiId]);
          let score = 3;
          if (comparison === 'above') score = 4;
          if (comparison === 'below') score = 2;
          if (indicator.trend === 'up' && comparison === 'above') score = 5;
          if (indicator.trend === 'down' && comparison === 'below') score = 1;
          
          totalScore += score;
          validIndicators++;
        }
      });
      
      return validIndicators > 0 ? Math.round((totalScore / validIndicators) * 10) / 10 : 3;
    };

    const categories = KKiK_CATEGORIES.map(category => {
      const indicators = category.kpis.map(kpi => {
        const data = municipalityData[kpi.id];
        if (!data || data.current === undefined || data.current === null) return null;
        
        return {
          id: kpi.id,
          name: kpi.title,
          value: data.current,
          unit: getUnitForKPI(kpi.id),
          trend: calculateTrend(data.trend),
          comparison: calculateComparison(data.current, nationalAverages[kpi.id]),
          description: data.metadata?.description || '',
          kpiId: kpi.id
        };
      }).filter(Boolean);

      return {
        id: category.id,
        name: category.name,
        score: calculateCategoryScore(indicators),
        weight: 25,
        indicators
      };
    });

    // Calculate overall score
    const overallScore = categories.length > 0 
      ? categories.reduce((sum, category) => sum + category.score, 0) / categories.length
      : 3;

    return {
      municipality: {
        id: municipalityId,
        name: municipalityName,
        region: 'Länsinformation'
      },
      year: new Date().getFullYear(),
      overallScore: Math.round(overallScore * 10) / 10,
      categories,
      summary: generateSummary(categories)
    };
  };

  const getUnitForKPI = (kpi) => {
    const units = {
      [KPIS.POPULATION]: '',
      [KPIS.EMPLOYMENT]: '%',
      [KPIS.INCOME]: 'kr',
      [KPIS.GRADUATION_RATE]: '%',
      [KPIS.EDUCATION_LEVEL]: '%',
      [KPIS.LIFE_EXPECTANCY_MEN]: 'år',
      [KPIS.LIFE_EXPECTANCY_WOMEN]: 'år',
      [KPIS.TAX_BASE]: 'kr',
      [KPIS.PUBLIC_DEBT]: 'kr',
      [KPIS.ELECTION_PARTICIPATION]: '%'
    };
    return units[kpi] || '';
  };

  const generateSummary = (categories) => {
    const strengths = [];
    const challenges = [];
    const recommendations = [];

    categories.forEach(category => {
      if (category.score >= 4) {
        strengths.push(`Starka resultat inom ${category.name.toLowerCase()}`);
      } else if (category.score <= 2) {
        challenges.push(`Utvecklingspotential inom ${category.name.toLowerCase()}`);
        recommendations.push(`Förbättra insatser inom ${category.name.toLowerCase()}`);
      }
    });

    return {
      strengths: strengths.length > 0 ? strengths : ['God prestanda inom flera områden'],
      challenges: challenges.length > 0 ? challenges : ['Inga större utmaningar identifierade'],
      recommendations: recommendations.length > 0 ? recommendations : ['Fortsatt fokus på kvalitetsutveckling']
    };
  };

  // UI Helper functions
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getComparisonIcon = (comparison) => {
    switch (comparison) {
      case 'above':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'below':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'equal':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 3) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return 'Saknas';
    
    if (typeof value === 'number') {
      if (unit === 'kr') {
        return `${Math.round(value).toLocaleString('sv-SE')} ${unit}`;
      }
      if (unit === '%') {
        return `${value.toFixed(1)}${unit}`;
      }
      if (unit === 'år') {
        return `${value.toFixed(1)} ${unit}`;
      }
      return `${value.toFixed(1)} ${unit}`;
    }
    
    return `${value} ${unit}`;
  };

  const getComparisonText = (comparison) => {
    switch (comparison) {
      case 'above':
        return 'Över genomsnitt';
      case 'below':
        return 'Under genomsnitt';
      case 'equal':
        return 'I genomsnitt';
      default:
        return 'Ej jämförbar';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Laddar KKiK-data för {municipalityName}...</p>
        </div>
      </div>
    );
  }

  if (!kkikData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Kunde inte ladda data</h2>
          <p className="text-slate-600 mb-4">Det gick inte att hämta KKiK-information för {municipalityName}.</p>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tillbaka
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Tillbaka till översikt
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Kvalitet i korta drag - KKiK</h1>
                <p className="text-sm text-slate-600">{municipalityName} • {kkikData.year}</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Ladda ner rapport
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Totalpoäng</h3>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${getScoreColor(kkikData.overallScore)}`}>
                <span className="text-2xl font-bold">{kkikData.overallScore.toFixed(1)}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">Av 5.0 möjliga</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Kommuninformation</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Kommun:</span>
                  <span className="font-semibold">{municipalityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">KKiK-år:</span>
                  <span className="font-semibold">{kkikData.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Indikatorer:</span>
                  <span className="font-semibold">
                    {kkikData.categories.reduce((total, cat) => total + cat.indicators.length, 0)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Sammanfattning</h3>
              <p className="text-slate-600 text-sm">
                {municipalityName} presterar {kkikData.overallScore >= 3.5 ? 'mycket bra' : 
                 kkikData.overallScore >= 3 ? 'bra' : 
                 kkikData.overallScore >= 2.5 ? 'tillfredsställande' : 'mindre bra'} 
                inom de flesta kvalitetsområden jämfört med riksgenomsnittet.
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {kkikData.categories.map((category) => (
            <div key={category.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-6 bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${getScoreColor(category.score)}`}>
                    <span className="font-bold text-lg">{category.score.toFixed(1)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
                    <p className="text-sm text-slate-600">Vikt: {category.weight}%</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4">
                  {category.indicators.length > 0 ? (
                    category.indicators.map((indicator) => (
                      <div key={indicator.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{indicator.name}</h4>
                          <p className="text-sm text-slate-600">{indicator.description}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900 mb-1">
                              {formatValue(indicator.value, indicator.unit)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              {getTrendIcon(indicator.trend)}
                              {getComparisonIcon(indicator.comparison)}
                              <span>{getComparisonText(indicator.comparison)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>Ingen data tillgänglig för denna kategori</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Styrkor
            </h3>
            <ul className="space-y-2">
              {kkikData.summary.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-green-800">• {strength}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Utmaningar
            </h3>
            <ul className="space-y-2">
              {kkikData.summary.challenges.map((challenge, index) => (
                <li key={index} className="text-sm text-yellow-800">• {challenge}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Rekommendationer
            </h3>
            <ul className="space-y-2">
              {kkikData.summary.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-blue-800">• {recommendation}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            KKiK-data hämtas från Kolada API. Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QualityInBriefPage;