import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Search, TrendingUp, Users, Building2, MapPin, Download, Filter, ChevronDown, Loader2, GraduationCap, Target, Globe } from 'lucide-react';
import QualityInBriefPage from './QualityInBriefPage';

const KOLADA_API = 'https://api.kolada.se/v3';

// Correct KPI IDs from Kolada
const KPIS = {
  POPULATION: 'N00003', // Total population
  EMPLOYMENT: 'N00205', // Employment rate 20-64 years
  INCOME: 'N00011',     // Disposable income per inhabitant
  GRADUATION_RATE: 'N00932',
  PRESCHOOL_TEACHERS: 'N00935', // Heltidstjänster i förskolan med förskollärarlegitimation
};

export default function App() {
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState('0380');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('main');
  
  // Data states
  const [populationData, setPopulationData] = useState([]);
  const [populationComparisonData, setPopulationComparisonData] = useState([]);
  const [employmentTrendData, setEmploymentTrendData] = useState([]);
  const [preschoolTeacherData, setPreschoolTeacherData] = useState([]);
  const [currentStats, setCurrentStats] = useState({
    population: null,
    employment: null,
    income: null,
    graduation: null,
    preschoolTeachers: null,
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'economy', label: 'Economy', icon: Building2 },
    { id: 'education', label: 'Education', icon: GraduationCap },
  ];

  // Fetch municipalities on mount
  useEffect(() => {
    fetchMunicipalities();
  }, []);

  // Fetch data when municipality changes
  useEffect(() => {
    if (selectedMunicipality && municipalities.length > 0) {
      fetchAllData();
    }
  }, [selectedMunicipality, municipalities]);

  const fetchMunicipalities = async () => {
    try {
      const response = await fetch(`${KOLADA_API}/municipality`);
      const data = await response.json();
      const municList = data.values || [];
      setMunicipalities(municList);
      
      if (municList.length > 0 && !selectedMunicipality) {
        const stockholm = municList.find(m => m.title === 'Stockholm') || municList[0];
        setSelectedMunicipality(stockholm.id);
      }
    } catch (err) {
      console.error('Failed to fetch municipalities:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPopulationTrend(),
        fetchPopulationComparison(),
        fetchEmploymentData(),
        fetchCurrentStats(),
        fetchPreschoolTeacherData()
      ]);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoading(false);
    }
  };

  const fetchPreschoolTeacherData = async () => {
    try {
      console.log('Fetching preschool teacher data for municipality:', selectedMunicipality);
      const response = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.PRESCHOOL_TEACHERS}/municipality/${selectedMunicipality}`
      );
      const data = await response.json();
      console.log('Preschool teacher API response:', data);
      
      if (data.values && data.values[0] && data.values[0].values) {
        const values = data.values[0].values
          .filter(v => v.value !== null)
          .sort((a, b) => a.period - b.period)
          .slice(-8);
        
        const formatted = values.map(v => ({
          year: v.period.toString(),
          percentage: parseFloat(v.value.toFixed(1)),
          value: parseFloat(v.value.toFixed(1))
        }));
        
        console.log('Formatted preschool data:', formatted);
        setPreschoolTeacherData(formatted);

        if (formatted.length > 0) {
          const latest = formatted[formatted.length - 1];
          setCurrentStats(prev => ({
            ...prev,
            preschoolTeachers: latest.percentage
          }));
        }
      } else {
        console.log('No preschool teacher data found in response');
        setPreschoolTeacherData([]);
      }
    } catch (err) {
      console.error('Failed to fetch preschool teacher data:', err);
      setPreschoolTeacherData([]);
    }
  };

  const fetchPopulationTrend = async () => {
    try {
      const response = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.POPULATION}/municipality/${selectedMunicipality}`
      );
      const data = await response.json();
      
      if (data.values && data.values[0] && data.values[0].values) {
        const values = data.values[0].values
          .filter(v => v.value !== null)
          .sort((a, b) => a.period - b.period)
          .slice(-5);
        
        const formatted = values.map(v => ({
          year: v.period.toString(),
          value: Math.round(v.value)
        }));
        
        setPopulationData(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch population trend:', err);
    }
  };

  const fetchPopulationComparison = async () => {
    try {
      const topMunicIds = ['1280', '1480', '1281', '0380', '1980']; // Stockholm, Göteborg, Malmö, Uppsala, Västerås
      
      const promises = topMunicIds.map(async (id) => {
        try {
          const response = await fetch(
            `${KOLADA_API}/data/kpi/${KPIS.POPULATION}/municipality/${id}`
          );
          const data = await response.json();
          
          if (data.values && data.values[0] && data.values[0].values.length > 0) {
            const latestValue = data.values[0].values
              .filter(v => v.value !== null)
              .sort((a, b) => b.period - a.period)[0];
            
            const municName = municipalities.find(m => m.id === id)?.title || id;
            
            if (latestValue) {
              return {
                municipality: municName,
                population: Math.round(latestValue.value)
              };
            }
          }
          return null;
        } catch (err) {
          console.warn(`Failed to fetch population data for municipality ${id}:`, err);
          return null;
        }
      });
      
      const results = (await Promise.all(promises)).filter(r => r !== null);
      setPopulationComparisonData(results);
    } catch (err) {
      console.error('Failed to fetch population comparison:', err);
    }
  };

  const fetchEmploymentData = async () => {
    try {
      await fetchEmploymentTrend();
    } catch (err) {
      console.error('Failed to fetch employment data:', err);
    }
  };

  const fetchEmploymentTrend = async () => {
    try {
      const response = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.EMPLOYMENT}/municipality/${selectedMunicipality}`
      );
      const data = await response.json();
      
      if (data.values && data.values[0] && data.values[0].values) {
        const values = data.values[0].values
          .filter(v => v.value !== null)
          .sort((a, b) => a.period - b.period)
          .slice(-5);
        
        const formatted = values.map(v => ({
          year: v.period.toString(),
          rate: parseFloat(v.value.toFixed(1)),
          value: parseFloat(v.value.toFixed(1))
        }));
        
        setEmploymentTrendData(formatted);

        if (formatted.length > 0) {
          const latest = formatted[formatted.length - 1];
          setCurrentStats(prev => ({
            ...prev,
            employment: latest.rate
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch employment trend:', err);
    }
  };

  const fetchCurrentStats = async () => {
    try {
      // Fetch latest population
      const popResponse = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.POPULATION}/municipality/${selectedMunicipality}`
      );
      const popData = await popResponse.json();
      
      if (popData.values && popData.values[0] && popData.values[0].values.length > 0) {
        const latest = popData.values[0].values
          .filter(v => v.value !== null)
          .sort((a, b) => b.period - a.period)[0];
        
        setCurrentStats(prev => ({
          ...prev,
          population: latest ? Math.round(latest.value) : null
        }));
      }

      // Fetch disposable income
      const incomeResponse = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.INCOME}/municipality/${selectedMunicipality}`
      );
      const incomeData = await incomeResponse.json();
      
      if (incomeData.values && incomeData.values[0] && incomeData.values[0].values.length > 0) {
        const latest = incomeData.values[0].values
          .filter(v => v.value !== null)
          .sort((a, b) => b.period - a.period)[0];
        
        setCurrentStats(prev => ({
          ...prev,
          income: latest ? Math.round(latest.value) : null
        }));
      }
    } catch (err) {
      console.error('Failed to fetch current stats:', err);
    }
  };

  const handleViewKKiK = () => {
    setCurrentView('kkik');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };

  const handleLanguageChange = () => {
    // Placeholder for future language change functionality
    console.log('Language change clicked - functionality to be implemented');
  };

  const selectedMunicipalityName = municipalities.find(
    m => m.id === selectedMunicipality
  )?.title || 'Loading...';

  const budgetData = [
    { category: 'Education', amount: 3450 },
    { category: 'Healthcare', amount: 2890 },
    { category: 'Infrastructure', amount: 1670 },
    { category: 'Culture', amount: 780 },
    { category: 'Social Services', amount: 2120 },
  ];

  // Sample preschool teacher comparison data for demonstration
  const preschoolComparisonData = [
    { municipality: 'Stockholm', percentage: 78.5 },
    { municipality: 'Göteborg', percentage: 72.3 },
    { municipality: 'Malmö', percentage: 68.9 },
    { municipality: 'Uppsala', percentage: 75.6 },
    { municipality: 'Västerås', percentage: 71.2 },
  ];

  // Render KKiK page if that's the current view
  if (currentView === 'kkik') {
    return (
      <QualityInBriefPage 
        municipalityId={selectedMunicipality}
        municipalityName={selectedMunicipalityName}
        onBack={handleBackToMain}
      />
    );
  }

  // Render education tab content
  const renderEducationTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-1">Preschool Teachers with License</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-slate-900">
              {preschoolTeacherData.length > 0 
                ? `${preschoolTeacherData[preschoolTeacherData.length - 1].percentage}%` 
                : '24%' // DUMMY VALUE WHEN NO DATA
              }
            </p>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              preschoolTeacherData.length > 0 
                ? 'text-green-600 bg-green-50' 
                : 'text-blue-600 bg-blue-50' // Changed to blue for dummy data
            }`}>
              {preschoolTeacherData.length > 0 ? 'Live' : 'Demo'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Heltidstjänster med förskollärarlegitimation</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-1">Data Period</p>
          <p className="text-2xl font-bold text-slate-900">
            {preschoolTeacherData.length > 0 
              ? `${preschoolTeacherData[0].year}-${preschoolTeacherData[preschoolTeacherData.length - 1].year}`
              : '2023' // DUMMY VALUE WHEN NO DATA
            }
          </p>
          <p className="text-xs text-slate-500 mt-2">Available years</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-1">Municipality</p>
          <p className="text-lg font-bold text-slate-900">{selectedMunicipalityName}</p>
          <p className="text-xs text-slate-500 mt-2">Current selection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preschool Teacher Trend Chart */}
        {preschoolTeacherData.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Heltidstjänster i förskolan med förskollärarlegitimation ({selectedMunicipalityName})
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Andel (%) av heltidstjänster som innehas av förskollärare med legitimation
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={preschoolTeacherData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="year" 
                  stroke="#64748b"
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  stroke="#64748b"
                  label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value) => [`${value}%`, 'Andel']}
                />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#7c3aed' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 mt-3">
              Källa: Kolada API - N00935
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Heltidstjänster i förskolan med förskollärarlegitimation
            </h3>
            <div className="flex items-center justify-center h-64 text-slate-500">
              <div className="text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                <p>No data available for {selectedMunicipalityName}</p>
                <p className="text-sm">The selected municipality may not have data for this indicator.</p>
              </div>
            </div>
          </div>
        )}

        {/* Preschool Teacher Comparison Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Jämförelse med andra kommuner
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Andel förskollärare med legitimation i större kommuner
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={preschoolComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="municipality" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px' 
                }}
                formatter={(value) => [`${value}%`, 'Andel']}
              />
              <Bar 
                dataKey="percentage" 
                name="Förskollärare med legitimation (%)"
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-3">
            * Exempeldata för jämförelse
          </p>
        </div>

        {/* Detailed Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Detaljerad data</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">År</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Andel (%)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Förändring</th>
                </tr>
              </thead>
              <tbody>
                {preschoolTeacherData.length > 0 ? (
                  preschoolTeacherData.map((item, index) => {
                    const previousValue = index > 0 ? preschoolTeacherData[index - 1].percentage : null;
                    const change = previousValue ? item.percentage - previousValue : null;
                    
                    return (
                      <tr key={item.year} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900">{item.year}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                          {item.percentage}%
                        </td>
                        <td className={`py-3 px-4 text-sm text-right ${
                          change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {change !== null ? (
                            <>
                              {change > 0 ? '+' : ''}{change.toFixed(1)}%
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-3 px-4 text-sm text-slate-900">2023</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                      24%
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">
                      -
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Education Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Utbildningsindikatorer</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900">Förskollärarlegitimation</p>
                <p className="text-sm text-slate-600">Andel heltidstjänster med legitimerad personal</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  {preschoolTeacherData.length > 0 
                    ? `${preschoolTeacherData[preschoolTeacherData.length - 1].percentage}%` 
                    : '24%' // DUMMY VALUE WHEN NO DATA
                  }
                </p>
                <p className="text-sm text-slate-600">
                  {preschoolTeacherData.length > 0 ? 'Aktuellt värde' : 'Demo data'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Dataperiod</p>
                <p className="font-semibold">
                  {preschoolTeacherData.length > 0 
                    ? `${preschoolTeacherData.length} år` 
                    : '1 år' // DUMMY VALUE WHEN NO DATA
                  }
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Senaste år</p>
                <p className="font-semibold">
                  {preschoolTeacherData.length > 0 
                    ? preschoolTeacherData[preschoolTeacherData.length - 1].year 
                    : '2023' // DUMMY VALUE WHEN NO DATA
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main app view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Municipal Lens</h1>
                <p className="text-sm text-slate-600">Live data from Kolada API</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleViewKKiK}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Target className="w-4 h-4" />
                View KKiK Report for {selectedMunicipalityName}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button 
                onClick={handleLanguageChange}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                title="Change Language"
              >
                <Globe className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search indicators, municipalities, or metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                disabled={loading || municipalities.length === 0}
              >
                {municipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 border-b border-slate-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-lg text-slate-600">Loading data from Kolada API...</span>
          </div>
        ) : (
          <>
            {activeTab === 'education' ? (
              renderEducationTab()
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-600 mb-1">Population</p>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-slate-900">
                        {currentStats.population ? currentStats.population.toLocaleString('sv-SE') : 'No data'}
                      </p>
                      <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        Live
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-600 mb-1">Employment Rate</p>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-slate-900">
                        {currentStats.employment ? `${currentStats.employment}%` : 'No data'}
                      </p>
                      <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        Live
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-600 mb-1">Disposable Income</p>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold text-slate-900">
                        {currentStats.income ? `${currentStats.income.toLocaleString('sv-SE')} kr` : 'No data'}
                      </p>
                      <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        Live
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-600 mb-1">Municipality</p>
                    <div className="flex items-end justify-between">
                      <p className="text-lg font-bold text-slate-900">{selectedMunicipalityName}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Population Trend Chart */}
                  {populationData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Population Trend ({selectedMunicipalityName})</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={populationData}>
                          <defs>
                            <linearGradient id="colorPop" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="year" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip formatter={(value) => [value.toLocaleString('sv-SE'), 'Population']} />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorPop)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Population Comparison Chart - CHANGED TO BLUE */}
                  {populationComparisonData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Population Comparison</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={populationComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="municipality" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip formatter={(value) => [value.toLocaleString('sv-SE'), 'Population']} />
                          <Bar dataKey="population" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Employment Rate Trend Chart */}
                  {employmentTrendData.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Employment Rate Trend ({selectedMunicipalityName})</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={employmentTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="year" stroke="#64748b" />
                          <YAxis stroke="#64748b" domain={[0, 100]} />
                          <Tooltip formatter={(value) => [`${value}%`, 'Employment Rate']} />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#f59e0b" 
                            strokeWidth={3}
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#d97706' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Budget Distribution */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Municipal Budget Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={budgetData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" />
                        <YAxis dataKey="category" type="category" stroke="#64748b" width={100} />
                        <Tooltip formatter={(value) => [`${value.toLocaleString('sv-SE')} MSEK`, 'Amount']} />
                        <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-slate-500 mt-2">Sample budget data for demonstration</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
