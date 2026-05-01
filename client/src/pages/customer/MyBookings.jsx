import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import StatusBadge from '../../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, Search, Filter, X, AlertTriangle } from 'lucide-react';

const STATUSES = ['All','Pending','Assigned','InProgress','Completed','Cancelled'];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

 const load = () => {
  setLoading(true);
  api.get('/bookings')
    .then(r => setBookings(r.data || []))
    .catch(() => setBookings([]))
    .finally(() => setLoading(false));
};

useEffect(() => {
  load();
}, []);

  const filtered = bookings.filter(b => {
    if (filter !== 'All' && b.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return b.serviceType.toLowerCase().includes(s) ||
        b.unitId?.brand?.toLowerCase().includes(s) ||
        b._id.toLowerCase().includes(s);
    }
    return true;
  });

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast.error('Please provide a reason'); return; }
    setCancelling(true);
    try {
      await api.patch(`/bookings/${cancelModal._id}/cancel`, { reason: cancelReason });
      toast.success('Booking cancelled');
      setCancelModal(null);
      setCancelReason('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setCancelling(false); }
  };
const handleApprove = async (bookingId) => {
  try {
    await api.patch(`/bookings/${bookingId}/approve`);
    toast.success('Service confirmed! Thank you 🎉');
    load();
  } catch (err) {
    toast.error(err.response?.data?.message || 'Error');
  }
};
  return (
    <div className="page">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">{bookings.length} total service requests</p>
        </div>
        <Link to="/book" className="btn-primary flex items-center gap-2"><Plus size={15} />New Booking</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9 text-sm py-2" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} />
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

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-slate-400 mb-4">No bookings found</div>
          <Link to="/book" className="btn-primary btn-sm inline-flex items-center gap-2"><Plus size={14} />Book a service</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b._id} className="card-hover">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-100">{b.serviceType}</span>
                    <StatusBadge status={b.status} />
                    {b.paymentStatus === 'Paid' && <span className="badge bg-green-500/10 text-green-400 border border-green-500/20">Paid</span>}
                  </div>
                  <div className="text-sm text-slate-400">
                    <span className="font-mono text-xs text-slate-500">#{b._id.slice(-6).toUpperCase()}</span>
                    {' · '}{b.unitId?.brand} {b.unitId?.model}
                    {' · '}{format(new Date(b.scheduledDate), 'dd MMM yyyy')} {b.timeSlot}
                  </div>
                  {b.technicianId && (
                    <div className="text-xs text-slate-500 mt-1">
                      👷 {b.technicianId?.userId?.firstName} {b.technicianId?.userId?.lastName}
                      {b.technicianId?.userId?.phone && ` · ${b.technicianId.userId.phone}`}
                    </div>
                  )}
                  {b.technicianNotes && (
                    <div className="text-xs text-slate-500 mt-1 italic">📝 "{b.technicianNotes}"</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-white">₹{b.estimatedAmount}</div>
                 {b.status === 'PendingApproval' && (
  <button onClick={() => handleApprove(b._id)}
    className="text-xs text-green-400 hover:text-green-300 mt-2 block font-semibold">
    ✓ Approve Completion
  </button>
)}
{!['Completed','Cancelled','PendingApproval'].includes(b.status) && (
  <button onClick={() => setCancelModal(b)}
    className="text-xs text-red-400 hover:text-red-300 mt-2 block">Cancel</button>
)}
                  {b.status === 'Completed' && b.paymentStatus !== 'Paid' && (
                    <Link to={`/bookings/${b._id}/pay`} className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 block">Pay now</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-[slideUp_.2s_ease-out]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400"><AlertTriangle size={18} /></div>
              <div>
                <h3 className="font-semibold text-white">Cancel Booking</h3>
                <p className="text-xs text-slate-400">#{cancelModal._id.slice(-6).toUpperCase()} · {cancelModal.serviceType}</p>
              </div>
              <button className="ml-auto btn-ghost" onClick={() => setCancelModal(null)}><X size={16} /></button>
            </div>
            <div>
              <label className="label">Reason for cancellation</label>
              <textarea className="input resize-none" rows={3} placeholder="Please tell us why..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-secondary flex-1" onClick={() => setCancelModal(null)}>Keep Booking</button>
              <button className="btn-danger flex-1 flex items-center justify-center gap-2" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? <span className="spinner" /> : null} Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
