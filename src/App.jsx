import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Search, TrendingUp, Users, Building2, MapPin, Download, Filter, ChevronDown } from 'lucide-react';

// Sample data representing municipal statistics
const municipalities = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås'];

const populationData = [
  { year: '2019', Stockholm: 975551, Göteborg: 579281, Malmö: 344166, Uppsala: 233839, Västerås: 154049 },
  { year: '2020', Stockholm: 978770, Göteborg: 583056, Malmö: 347949, Uppsala: 237467, Västerås: 155551 },
  { year: '2021', Stockholm: 984748, Göteborg: 586947, Malmö: 350647, Uppsala: 240832, Västerås: 156941 },
  { year: '2022', Stockholm: 990079, Göteborg: 590923, Malmö: 354972, Uppsala: 244147, Västerås: 158340 },
  { year: '2023', Stockholm: 995000, Göteborg: 595000, Malmö: 358000, Uppsala: 247500, Västerås: 160000 },
];

const employmentData = [
  { municipality: 'Stockholm', rate: 85.2 },
  { municipality: 'Göteborg', rate: 82.7 },
  { municipality: 'Malmö', rate: 78.4 },
  { municipality: 'Uppsala', rate: 84.1 },
  { municipality: 'Västerås', rate: 81.9 },
];

const budgetData = [
  { category: 'Education', amount: 3450 },
  { category: 'Healthcare', amount: 2890 },
  { category: 'Infrastructure', amount: 1670 },
  { category: 'Culture', amount: 780 },
  { category: 'Social Services', amount: 2120 },
];

export default function App() {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Stockholm');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'economy', label: 'Economy', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Municipal Lens</h1>
                <p className="text-sm text-slate-600">Enhanced data visualization platform</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
      </header>

      {/* Search & Filter Bar */}
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
              >
                {municipalities.map(m => (
                  <option key={m} value={m}>{m}</option>
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

      {/* Tabs */}
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Population', value: '995,000', change: '+2.1%', trend: 'up' },
            { label: 'Employment Rate', value: '85.2%', change: '+1.3%', trend: 'up' },
            { label: 'Median Income', value: '345,000 kr', change: '+3.4%', trend: 'up' },
            { label: 'Education Index', value: '8.7/10', change: '+0.2', trend: 'up' },
          ].map((metric, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-sm text-slate-600 mb-1">{metric.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Population Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Population Trend (2019-2023)</h3>
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
                  dataKey={selectedMunicipality} 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPop)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Employment Rate Comparison */}
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

          {/* Budget Distribution */}
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
          </div>

          {/* Multi-line Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Population Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={populationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Stockholm" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Göteborg" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="Malmö" stroke="#ec4899" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Detailed Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Indicator</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">2023</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">2022</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Change</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Population', val2023: '995,000', val2022: '990,079', change: '+0.5%' },
                  { name: 'Employment Rate', val2023: '85.2%', val2022: '84.1%', change: '+1.1%' },
                  { name: 'Median Income (kr)', val2023: '345,000', val2022: '334,000', change: '+3.3%' },
                  { name: 'Housing Units', val2023: '547,000', val2022: '542,000', change: '+0.9%' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-900">{row.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">{row.val2023}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{row.val2022}</td>
                    <td className="py-3 px-4 text-sm text-green-600 text-right font-medium">{row.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}