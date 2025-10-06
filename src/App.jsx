import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Search, TrendingUp, Users, Building2, MapPin, Download, Filter, ChevronDown, Loader2 } from 'lucide-react';

const KOLADA_API = 'https://api.kolada.se/v2';

// KPI IDs from Kolada
const KPIS = {
  POPULATION: 'N01951',
  EMPLOYMENT: 'N00956',
  INCOME: 'N01993',
};

export default function App() {
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState('1280'); // Stockholm
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [populationData, setPopulationData] = useState([]);
  const [employmentData, setEmploymentData] = useState([]);
  const [currentStats, setCurrentStats] = useState({
    population: null,
    employment: null,
    income: null,
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'economy', label: 'Economy', icon: Building2 },
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
      
      // Set Stockholm as default if available
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
      // Fetch population trend for selected municipality
      await fetchPopulationTrend();
      
      // Fetch employment data for comparison across municipalities
      await fetchEmploymentComparison();
      
      // Fetch current statistics
      await fetchCurrentStats();
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoading(false);
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
          .slice(-5); // Last 5 years
        
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

  const fetchEmploymentComparison = async () => {
    try {
      // Fetch for top 5 municipalities
      const topMunicIds = ['1280', '1480', '1281', '0380', '1980']; // Stockholm, Göteborg, Malmö, Uppsala, Västerås
      
      const promises = topMunicIds.map(async (id) => {
        const response = await fetch(
          `${KOLADA_API}/data/kpi/${KPIS.EMPLOYMENT}/municipality/${id}`
        );
        const data = await response.json();
        
        if (data.values && data.values[0] && data.values[0].values.length > 0) {
          const latestValue = data.values[0].values
            .filter(v => v.value !== null)
            .sort((a, b) => b.period - a.period)[0];
          
          const municName = municipalities.find(m => m.id === id)?.title || id;
          
          return {
            municipality: municName,
            rate: latestValue ? parseFloat(latestValue.value.toFixed(1)) : 0
          };
        }
        return null;
      });
      
      const results = (await Promise.all(promises)).filter(r => r !== null);
      setEmploymentData(results);
    } catch (err) {
      console.error('Failed to fetch employment data:', err);
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

      // Fetch latest employment rate
      const empResponse = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.EMPLOYMENT}/municipality/${selectedMunicipality}`
      );
      const empData = await empResponse.json();
      
      if (empData.values && empData.values[0] && empData.values[0].values.length > 0) {
        const latest = empData.values[0].values
          .filter(v => v.value !== null)
          .sort((a, b) => b.period - a.period)[0];
        
        setCurrentStats(prev => ({
          ...prev,
          employment: latest ? parseFloat(latest.value.toFixed(1)) : null
        }));
      }

      // Fetch median income
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
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export Data
            </button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600 mb-1">Population</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-slate-900">
                    {currentStats.population ? currentStats.population.toLocaleString() : 'Loading...'}
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
                    {currentStats.employment ? `${currentStats.employment}%` : 'Loading...'}
                  </p>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    Live
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600 mb-1">Median Income</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-slate-900">
                    {currentStats.income ? `${currentStats.income.toLocaleString()} kr` : 'Loading...'}
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
              {populationData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Population Trend (Last 5 Years)</h3>
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
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
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

              {employmentData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Employment Rate by Municipality</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="municipality" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Bar dataKey="rate" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Municipal Budget Distribution (MSEK)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis dataKey="category" type="category" stroke="#64748b" width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-500 mt-2">Note: Budget data is sample data (not yet available in Kolada API)</p>
              </div>

              {populationData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Population Growth</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={populationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="year" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Data Statistics</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Indicator</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Value</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-900">Population</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right">
                        {currentStats.population ? currentStats.population.toLocaleString() : 'Loading...'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 text-right">Kolada API</td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-900">Employment Rate</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right">
                        {currentStats.employment ? `${currentStats.employment}%` : 'Loading...'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 text-right">Kolada API</td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-900">Median Income (kr)</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right">
                        {currentStats.income ? currentStats.income.toLocaleString() : 'Loading...'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 text-right">Kolada API</td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-900">Available Municipalities</td>
                      <td className="py-3 px-4 text-sm text-slate-900 text-right">{municipalities.length}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 text-right">Kolada API</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}