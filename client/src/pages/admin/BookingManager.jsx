import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import StatusBadge from '../../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, Filter, UserCheck, RefreshCw, X, ChevronDown } from 'lucide-react';

const STATUSES = ['All','Pending','Assigned','InProgress','Completed','Cancelled'];
const TRANSITIONS = { 
  Pending: ['Assigned','Cancelled'], 
  Assigned: ['InProgress','Cancelled'], 
  InProgress: ['PendingApproval','Cancelled'],
  PendingApproval: ['Completed','Cancelled'],  // admin can force complete if needed
};
export default function BookingManager() {
  const [bookings, setBookings]       = useState([]);
  const [techs, setTechs]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('All');
  const [search, setSearch]           = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [selectedTech, setSelectedTech] = useState('');
  const [assigning, setAssigning]     = useState(false);
  const [statusDropdown, setStatusDropdown] = useState(null);

  const load = useCallback(() => {
  setLoading(true);
  Promise.all([api.get('/bookings'), api.get('/technicians')])
    .then(([b, t]) => {
      setBookings(b.data || []);
      setTechs(t.data || []);
    })
    .catch(() => {
      setBookings([]);
      setTechs([]);
    })
    .finally(() => setLoading(false));
}, []);

useEffect(() => {
  load();
}, [load]);

  const filtered = bookings.filter(b => {
    if (filter !== 'All' && b.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return `${b.customerId?.firstName} ${b.customerId?.lastName}`.toLowerCase().includes(s) ||
        b.serviceType.toLowerCase().includes(s) || b._id.toLowerCase().includes(s);
    }
    return true;
  });

  const handleAssign = async () => {
    if (!selectedTech) { toast.error('Select a technician'); return; }
    setAssigning(true);
    try {
      await api.put(`/bookings/${assignModal._id}/assign`, { technicianId: selectedTech });
      toast.success('Technician assigned!');
      setAssignModal(null);
      setSelectedTech('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setAssigning(false); }
  };

  const handleStatusChange = async (bookingId, status) => {
    try {
      await api.put(`/bookings/${bookingId}/status`, { status });
      toast.success(`Status updated to ${status}`);
      setStatusDropdown(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="page">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Booking Manager</h1>
          <p className="page-subtitle">{filtered.length} bookings</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 btn-sm"><RefreshCw size={14} />Refresh</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9 text-sm py-2" placeholder="Search by name, ID, service..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filter===s ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Customer</th><th>Service</th><th>Unit</th>
                <th>Date / Slot</th><th>Technician</th><th>Status</th><th>Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">No bookings found</td></tr>
              ) : filtered.map(b => (
                <tr key={b._id}>
                  <td className="font-mono text-xs text-slate-500">#{b._id.slice(-6).toUpperCase()}</td>
                  <td>
                    <div className="text-sm text-slate-200">{b.customerId?.firstName} {b.customerId?.lastName}</div>
                    <div className="text-xs text-slate-500">{b.customerId?.phone}</div>
                  </td>
                  <td className="font-medium">{b.serviceType}</td>
                  <td className="text-xs text-slate-400">{b.unitId?.brand} {b.unitId?.model}</td>
                  <td className="text-xs text-slate-400">
                    <div>{format(new Date(b.scheduledDate),'dd MMM yyyy')}</div>
                    <div>{b.timeSlot}</div>
                  </td>
                  <td className="text-xs text-slate-400">
                    {b.technicianId ? `${b.technicianId.userId?.firstName} ${b.technicianId.userId?.lastName}` : <span className="text-slate-600">Unassigned</span>}
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="font-medium text-slate-200">₹{b.estimatedAmount}</td>
                  <td>
                    <div className="flex gap-1.5">
                      {b.status === 'Pending' && (
                        <button onClick={() => { setAssignModal(b); setSelectedTech(''); }}
                          className="btn-primary btn-sm flex items-center gap-1 text-xs">
                          <UserCheck size={12} /> Assign
                        </button>
                      )}
                      {TRANSITIONS[b.status] && (
                        <div className="relative">
                          <button onClick={() => setStatusDropdown(statusDropdown === b._id ? null : b._id)}
                            className="btn-secondary btn-sm flex items-center gap-1 text-xs">
                            Status <ChevronDown size={11} />
                          </button>
                          {statusDropdown === b._id && (
                            <div className="absolute right-0 top-8 bg-[#1a2235] border border-white/10 rounded-xl shadow-2xl z-20 w-36 py-1">
                              {TRANSITIONS[b.status].map(s => (
                                <button key={s} onClick={() => handleStatusChange(b._id, s)}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                                  → {s}
                                </button>
                              ))}
                              <button onClick={() => setStatusDropdown(null)} className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-white/5">
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-[slideUp_.2s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white">Assign Technician</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  #{assignModal._id.slice(-6).toUpperCase()} · {assignModal.serviceType} · {format(new Date(assignModal.scheduledDate),'dd MMM')} {assignModal.timeSlot}
                </p>
              </div>
              <button className="btn-ghost" onClick={() => setAssignModal(null)}><X size={16} /></button>
            </div>
            <div>
              <label className="label">Select Technician</label>
              <select className="input" value={selectedTech} onChange={e => setSelectedTech(e.target.value)}>
                <option value="">Choose technician...</option>
                {techs.filter(t => t.isAvailable).map(t => (
                  <option key={t._id} value={t._id}>
                    {t.userId?.firstName} {t.userId?.lastName} — {t.specializations?.join(', ')||'General'} ★{t.rating||'New'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleAssign} disabled={assigning}>
                {assigning ? <span className="spinner" /> : <UserCheck size={15} />}
                {assigning ? 'Assigning...' : 'Assign Technician'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
