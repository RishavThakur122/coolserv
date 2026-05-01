import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import StatusBadge from '../../components/ui/StatusBadge';
import { CalendarDays, Users, Wrench, TrendingUp, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

function KPICard({ icon: Icon, label, value, color, trend, sub }) {
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold text-white">{value ?? <span className="spinner" />}</div>
          <div className="text-sm text-slate-400 mt-1">{label}</div>
          {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
          {trend && <div className={`text-xs font-medium mt-2 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
          </div>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  Promise.all([api.get('/analytics/dashboard'), api.get('/bookings')])
    .then(([k, b]) => {
      setKpis(k.data);
      setRecentBookings((b.data || []).slice(0, 8));
    })
    .catch(() => {
      setKpis(null);
      setRecentBookings([]);
    })
    .finally(() => setLoading(false));
}, []);

  const revGrowth = kpis ? kpis.lastMonthRevenue
    ? Math.round(((kpis.thisMonthRevenue - kpis.lastMonthRevenue) / kpis.lastMonthRevenue) * 100)
    : 100 : null;

  return (
    <div className="page">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Link to="/admin/bookings" className="btn-primary flex items-center gap-2">
          View All Bookings <ArrowRight size={15} />
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={CalendarDays} label="Today's Bookings" value={kpis?.todayBookings} color="bg-cyan-500/20 text-cyan-400" />
        <KPICard icon={Clock} label="Pending" value={kpis?.pendingBookings} color="bg-amber-500/20 text-amber-400" />
        <KPICard icon={CheckCircle} label="Completed Today" value={kpis?.completedToday} color="bg-green-500/20 text-green-400" />
        <KPICard icon={Wrench} label="Technicians Active" value={kpis?.activeTechnicians} color="bg-purple-500/20 text-purple-400" />
        <KPICard icon={Users} label="Total Customers" value={kpis?.totalCustomers} color="bg-blue-500/20 text-blue-400" />
        <KPICard icon={CalendarDays} label="Total Bookings" value={kpis?.totalBookings} color="bg-indigo-500/20 text-indigo-400" />
        <KPICard icon={TrendingUp} label="This Month Revenue" value={kpis ? `₹${(kpis.thisMonthRevenue/1000).toFixed(1)}k` : null} color="bg-emerald-500/20 text-emerald-400" trend={revGrowth} />
        <KPICard icon={TrendingUp} label="Last Month Revenue" value={kpis ? `₹${(kpis.lastMonthRevenue/1000).toFixed(1)}k` : null} color="bg-teal-500/20 text-teal-400" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { to: '/admin/bookings', label: 'Manage Bookings', icon: CalendarDays, color: 'text-cyan-400' },
          { to: '/admin/technicians', label: 'Technicians', icon: Wrench, color: 'text-purple-400' },
          { to: '/admin/customers', label: 'Customers', icon: Users, color: 'text-blue-400' },
          { to: '/admin/analytics', label: 'Analytics', icon: TrendingUp, color: 'text-emerald-400' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className="card-hover flex items-center gap-3 p-4">
            <Icon size={18} className={color} />
            <span className="text-sm font-medium text-slate-200">{label}</span>
            <ArrowRight size={13} className="ml-auto text-slate-600" />
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-200">Recent Bookings</h2>
          <Link to="/admin/bookings" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            See all <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? <div className="flex justify-center py-8"><div className="spinner w-8 h-8 border-[3px]" /></div> : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th><th>Customer</th><th>Service</th><th>Date</th><th>Status</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b._id}>
                    <td className="font-mono text-xs text-slate-500">#{b._id.slice(-6).toUpperCase()}</td>
                    <td>{b.customerId?.firstName} {b.customerId?.lastName}</td>
                    <td>{b.serviceType}</td>
                    <td className="text-slate-400 text-xs">{format(new Date(b.scheduledDate), 'dd MMM')}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="font-medium">₹{b.estimatedAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
