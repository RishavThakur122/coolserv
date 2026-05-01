import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import StatusBadge from '../../components/ui/StatusBadge';
import { MapPin, Phone, Wind, Clock, ChevronRight, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

function DateLabel({ date }) {
  const d = new Date(date);
  if (isToday(d)) return <span className="badge badge-assigned">Today</span>;
  if (isTomorrow(d)) return <span className="badge badge-pending">Tomorrow</span>;
  return <span className="text-xs text-slate-400">{format(d, 'dd MMM')}</span>;
}

export default function TechnicianDashboard() {
  const { user, technicianProfile } = useAuth();
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    if (!technicianProfile?._id) { setLoading(false); return; }
    api.get(`/technicians/${technicianProfile._id}/schedule`)
      .then(r => setJobs(r.data))
      .finally(() => setLoading(false));
  }, [technicianProfile]);

  const filtered = jobs.filter(j => {
    if (filter === 'upcoming') return ['Assigned','InProgress'].includes(j.status);
    if (filter === 'completed') return j.status === 'Completed';
    return true;
  });

  const today    = jobs.filter(j => isToday(new Date(j.scheduledDate)) && j.status !== 'Cancelled');
  const inProg   = jobs.filter(j => j.status === 'InProgress');
  const done     = jobs.filter(j => j.status === 'Completed');

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">My Jobs</h1>
        <p className="page-subtitle">Welcome back, {user?.firstName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Today's Jobs", value: today.length, color: 'text-cyan-400 bg-cyan-500/15' },
          { label: 'In Progress',  value: inProg.length, color: 'text-purple-400 bg-purple-500/15' },
          { label: 'Completed',    value: done.length,   color: 'text-green-400 bg-green-500/15' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <div className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['upcoming','Upcoming'],['completed','Completed'],['all','All']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${filter===v ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div>
      : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-slate-400">No jobs in this category</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => (
            <Link key={j._id} to={`/technician/job/${j._id}`} className="card-hover block">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <Wind size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-100">{j.serviceType}</span>
                    <StatusBadge status={j.status} />
                    <DateLabel date={j.scheduledDate} />
                  </div>
                  <div className="text-sm text-slate-400">
                    {j.customerId?.firstName} {j.customerId?.lastName}
                    {j.customerId?.phone && <span className="ml-2 text-xs">· {j.customerId.phone}</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock size={11} /> {j.timeSlot}
                    {j.unitId && <span className="ml-2">· {j.unitId.brand} {j.unitId.model} ({j.unitId.locationLabel})</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
