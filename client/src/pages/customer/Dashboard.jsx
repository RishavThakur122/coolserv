import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import StatusBadge from '../../components/ui/StatusBadge';
import { CalendarDays, Wind, CheckCircle, Clock, Plus, ChevronRight, Zap } from 'lucide-react';
import { format } from 'date-fns';

function KPICard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card-hover flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/bookings'), api.get('/units')])
      .then(([b, u]) => { setBookings(b.data); setUnits(u.data); })
      .finally(() => setLoading(false));
  }, []);

  const active    = bookings.filter(b => !['Completed','Cancelled'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'Completed');
  const recent    = bookings.slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8 border-[3px]" /></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Welcome back, {user?.firstName} 👋</h1>
          <p className="page-subtitle">Manage your AC service bookings</p>
        </div>
        <Link to="/book" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Book a Service
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={CalendarDays} label="Total Bookings" value={bookings.length} color="bg-cyan-500/15 text-cyan-400" />
        <KPICard icon={Zap} label="Active" value={active.length} color="bg-blue-500/15 text-blue-400" />
        <KPICard icon={CheckCircle} label="Completed" value={completed.length} color="bg-green-500/15 text-green-400" />
        <KPICard icon={Wind} label="AC Units" value={units.length} color="bg-purple-500/15 text-purple-400" sub={`of 5 max`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-200">Recent Bookings</h2>
            <Link to="/bookings" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              See all <ChevronRight size={12} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-slate-400 mb-4">No bookings yet</div>
              <Link to="/book" className="btn-primary btn-sm inline-flex items-center gap-2"><Plus size={14} />Book your first service</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(b => (
                <div key={b._id} className="card-hover flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                    <CalendarDays size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{b.serviceType}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {b.unitId?.brand} {b.unitId?.model} · {format(new Date(b.scheduledDate), 'dd MMM yyyy')} · {b.timeSlot}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-300">₹{b.estimatedAmount}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AC Units quick view */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-200">My AC Units</h2>
            <Link to="/units" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </Link>
          </div>
          {units.length === 0 ? (
            <div className="card text-center py-8">
              <div className="text-3xl mb-2">🌬️</div>
              <div className="text-slate-400 text-sm mb-3">No AC units registered</div>
              <Link to="/units" className="btn-secondary btn-sm inline-flex items-center gap-1"><Plus size={13} />Add Unit</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {units.map(u => (
                <div key={u._id} className="card-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Wind size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200">{u.brand} {u.model}</div>
                      <div className="text-xs text-slate-500">{u.locationLabel} · {u.capacity}</div>
                    </div>
                  </div>
                </div>
              ))}
              {units.length < 5 && (
                <Link to="/units" className="btn-secondary btn-sm w-full flex items-center justify-center gap-2 mt-2">
                  <Plus size={14} /> Register another unit
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
