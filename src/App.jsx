import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Search, TrendingUp, Users, Building2, MapPin,
  Download, Filter, ChevronDown, Loader2,
  GraduationCap, Target, Globe
} from 'lucide-react';
import QualityInBriefPage from './QualityInBriefPage';

const KOLADA_API = 'https://api.kolada.se/v2';

// ✅ Correct KPI IDs
const KPIS = {
  POPULATION: 'N00003',
  EMPLOYMENT: 'N00205',
  INCOME: 'N00011',
};

// ✅ SAFE helper for Kolada responses
const getLatestValueFromKolada = (data) => {
  if (!data?.values) return null;

  for (const series of data.values) {
    if (Array.isArray(series.values)) {
      const valid = series.values
        .filter(v => v.value !== null)
        .sort((a, b) => b.period - a.period);
      if (valid.length > 0) {
        return valid[0].value;
      }
    }
  }
  return null;
};

export default function App() {
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState('0380'); // Uppsala default
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('main');

  // DATA STATES
  const [populationTrend, setPopulationTrend] = useState([]);
  const [employmentTrend, setEmploymentTrend] = useState([]);
  const [populationComparison, setPopulationComparison] = useState([]);

  const [currentStats, setCurrentStats] = useState({
    population: null,
    employment: null,
    income: null,
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'economy', label: 'Economy', icon: Building2 },
    { id: 'education', label: 'Education', icon: GraduationCap },
  ];

  // -------------------------
  // FETCH MUNICIPALITIES
  // -------------------------
  useEffect(() => {
    fetch(`${KOLADA_API}/municipality`)
      .then(res => res.json())
      .then(data => setMunicipalities(data.values || []))
      .catch(console.error);
  }, []);

  // -------------------------
  // FETCH ALL DATA
  // -------------------------
  useEffect(() => {
    if (!selectedMunicipality) return;
    setLoading(true);
    Promise.all([
      fetchCurrentStats(),
      fetchPopulationTrend(),
      fetchEmploymentTrend(),
      fetchPopulationComparison()
    ]).finally(() => setLoading(false));
  }, [selectedMunicipality]);

  // -------------------------
  // CURRENT STATS (CARDS)
  // -------------------------
  const fetchCurrentStats = async () => {
    try {
      const popRes = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.POPULATION}/municipality/${selectedMunicipality}?year=latest`
      );
      const popData = await popRes.json();

      const incomeRes = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.INCOME}/municipality/${selectedMunicipality}?year=latest`
      );
      const incomeData = await incomeRes.json();

      const empRes = await fetch(
        `${KOLADA_API}/data/kpi/${KPIS.EMPLOYMENT}/municipality/${selectedMunicipality}?year=latest`
      );
      const empData = await empRes.json();

      setCurrentStats({
        population: Math.round(getLatestValueFromKolada(popData)),
        income: Math.round(getLatestValueFromKolada(incomeData)),
        employment: parseFloat(getLatestValueFromKolada(empData)?.toFixed(1)),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------
  // POPULATION TREND
  // -------------------------
  const fetchPopulationTrend = async () => {
    const res = await fetch(
      `${KOLADA_API}/data/kpi/${KPIS.POPULATION}/municipality/${selectedMunicipality}`
    );
    const data = await res.json();

    const series = data.values?.find(v => Array.isArray(v.values))?.values || [];
    const formatted = series
      .filter(v => v.value !== null)
      .sort((a, b) => a.period - b.period)
      .slice(-5)
      .map(v => ({ year: v.period.toString(), value: Math.round(v.value) }));

    setPopulationTrend(formatted);
  };

  // -------------------------
  // EMPLOYMENT TREND
  // -------------------------
  const fetchEmploymentTrend = async () => {
    const res = await fetch(
      `${KOLADA_API}/data/kpi/${KPIS.EMPLOYMENT}/municipality/${selectedMunicipality}`
    );
    const data = await res.json();

    const series = data.values?.find(v => Array.isArray(v.values))?.values || [];
    const formatted = series
      .filter(v => v.value !== null)
      .sort((a, b) => a.period - b.period)
      .slice(-5)
      .map(v => ({
        year: v.period.toString(),
        rate: parseFloat(v.value.toFixed(1))
      }));

    setEmploymentTrend(formatted);
  };

  // -------------------------
  // POPULATION COMPARISON
  // -------------------------
  const fetchPopulationComparison = async () => {
    const ids = ['1280', '1480', '1281', '0380', '1980']; // Malmö, Göteborg, Stockholm, Uppsala, Västerås
    const results = await Promise.all(
      ids.map(async id => {
        const res = await fetch(
          `${KOLADA_API}/data/kpi/${KPIS.POPULATION}/municipality/${id}?year=latest`
        );
        const data = await res.json();
        const value = getLatestValueFromKolada(data);
        const name = municipalities.find(m => m.id === id)?.title || id;
        return value ? { municipality: name, population: Math.round(value) } : null;
      })
    );
    setPopulationComparison(results.filter(Boolean));
  };

  const selectedMunicipalityName =
    municipalities.find(m => m.id === selectedMunicipality)?.title || 'Loading…';

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4 flex justify-between">
        <h1 className="text-2xl font-bold">Municipal Lens</h1>
        <p className="text-sm text-slate-600">Latest available data from Kolada (SCB)</p>
      </header>

      <main className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat title="Population" value={currentStats.population?.toLocaleString('sv-SE')} />
              <Stat title="Employment Rate" value={`${currentStats.employment}%`} />
              <Stat title="Disposable Income" value={`${currentStats.income?.toLocaleString('sv-SE')} kr`} />
              <Stat title="Municipality" value={selectedMunicipalityName} />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartArea title="Population Trend" data={populationTrend} />
              <ChartLine title="Employment Rate Trend" data={employmentTrend} />
              <ChartBar title="Population Comparison" data={populationComparison} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// -------------------------
// SMALL REUSABLE COMPONENTS
// -------------------------
const Stat = ({ title, value }) => (
  <div className="bg-white p-4 rounded shadow">
    <p className="text-sm text-slate-600">{title}</p>
    <p className="text-xl font-bold">{value || 'No data'}</p>
  </div>
);

const ChartArea = ({ title, data }) => (
  <div className="bg-white p-4 rounded shadow">
    <h3 className="font-semibold mb-2">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip />
        <Area dataKey="value" stroke="#2563eb" fill="#93c5fd" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const ChartLine = ({ title, data }) => (
  <div className="bg-white p-4 rounded shadow">
    <h3 className="font-semibold mb-2">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line dataKey="rate" stroke="#f59e0b" />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const ChartBar = ({ title, data }) => (
  <div className="bg-white p-4 rounded shadow">
    <h3 className="font-semibold mb-2">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="municipality" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="population" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
