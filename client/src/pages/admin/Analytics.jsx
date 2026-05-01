import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';

const COLORS = ['#00bcff','#22c55e','#f59e0b','#a855f7','#ef4444'];

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-5">{title}</h3>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2235] border border-white/10 rounded-xl p-3 text-xs shadow-2xl">
      {label && <div className="text-slate-400 mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue') ? `₹${p.value.toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [byDay, setByDay]           = useState([]);
  const [byType, setByType]         = useState([]);
  const [byStatus, setByStatus]     = useState([]);
  const [techPerf, setTechPerf]     = useState([]);
  const [monthly, setMonthly]       = useState([]);
  const [kpis, setKpis]             = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/bookings-by-day?days=30'),
      api.get('/analytics/by-service-type'),
      api.get('/analytics/by-status'),
      api.get('/analytics/technician-performance'),
      api.get('/analytics/monthly-revenue'),
    ]).then(([k, d, t, s, tp, m]) => {
      setKpis(k.data);
      setByDay(d.data.map(x => ({ date: x._id?.slice(5), bookings: x.count, revenue: x.revenue })));
      setByType(t.data.map(x => ({ name: x._id, value: x.count })));
      setByStatus(s.data.map(x => ({ name: x._id, value: x.count })));
      setTechPerf(tp.data.map(x => ({ name: x.name?.split(' ')[0]||'Tech', completed: x.completed, revenue: x.revenue, rating: x.rating })));
      setMonthly(m.data.map(x => ({ month: `${x._id?.year}-${String(x._id?.month).padStart(2,'0')}`, revenue: x.revenue, bookings: x.count })));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner w-8 h-8 border-[3px]" /></div>;

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyLabeled = monthly.map(m => ({ ...m, month: MONTH_NAMES[parseInt(m.month.split('-')[1]) - 1] || m.month }));

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Business performance overview</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `₹${((kpis?.thisMonthRevenue||0)/1000).toFixed(1)}k`, sub: 'This month', color: 'text-emerald-400' },
          { label: 'Total Bookings', value: kpis?.totalBookings, sub: 'All time', color: 'text-cyan-400' },
          { label: 'Pending', value: kpis?.pendingBookings, sub: 'Need attention', color: 'text-amber-400' },
          { label: 'Active Techs', value: kpis?.activeTechnicians, sub: 'Available now', color: 'text-purple-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-sm text-slate-400 mt-1">{label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Bookings Last 30 Days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bookings" fill="#00bcff" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Service Type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byType} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={v => <span style={{color:'#94a3b8',fontSize:11}}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Monthly Revenue Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyLabeled} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Booking Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {byStatus.map((entry, i) => {
                  const c = { Pending:'#f59e0b',Assigned:'#3b82f6',InProgress:'#a855f7',Completed:'#22c55e',Cancelled:'#ef4444' };
                  return <Cell key={i} fill={c[entry.name] || COLORS[i % COLORS.length]} />;
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={v => <span style={{color:'#94a3b8',fontSize:11}}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Technician performance */}
      {techPerf.length > 0 && (
        <ChartCard title="Technician Performance (Completed Jobs)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={techPerf} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="completed" fill="#a855f7" radius={[0,4,4,0]} name="Jobs Completed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Empty state */}
      {byDay.length === 0 && byType.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-slate-400">No data yet. Analytics will populate as bookings are created.</div>
        </div>
      )}
    </div>
  );
}
