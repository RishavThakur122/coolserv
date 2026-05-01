import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import StatusBadge from '../../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Phone, Wind, Clock, CheckCircle, PlayCircle, User, FileText } from 'lucide-react';

const NEXT_STATUS = { Assigned: { status: 'InProgress', label: 'Start Job', icon: PlayCircle, color: 'btn-primary' },
                      InProgress: { status: 'Completed', label: 'Mark Complete', icon: CheckCircle, color: 'btn-primary' } };

export default function JobDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then(r => { setBooking(r.data); setNotes(r.data.technicianNotes || ''); })
      .finally(() => setLoading(false));
  }, [id]);

  const next = NEXT_STATUS[booking?.status];

  const handleUpdate = async () => {
    if (!next) return;
    setUpdating(true);
    try {
      await api.put(`/bookings/${id}/status`, { status: next.status, technicianNotes: notes });
      toast.success(next.status === 'Completed' ? 'Job marked as completed! 🎉' : 'Job started!');
      if (next.status === 'Completed') navigate('/technician');
      else { const r = await api.get(`/bookings/${id}`); setBooking(r.data); }
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setUpdating(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="spinner w-8 h-8 border-[3px]" /></div>;
  if (!booking) return <div className="card text-center py-12 text-slate-400">Booking not found</div>;

  return (
    <div className="page max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/technician" className="btn-ghost flex items-center gap-1.5 text-slate-400">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="page-title">Job Detail</h1>
      </div>

      {/* Header card */}
      <div className="card mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">{booking.serviceType}</h2>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-xs font-mono text-slate-500">#{booking._id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">₹{booking.estimatedAmount}</div>
            <div className={`text-xs font-medium mt-0.5 ${booking.paymentStatus === 'Paid' ? 'text-green-400' : 'text-amber-400'}`}>{booking.paymentStatus}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock size={14} className="text-cyan-400" />
            <span>{format(new Date(booking.scheduledDate), 'dd MMM yyyy')} · {booking.timeSlot}</span>
          </div>
        </div>
      </div>

      {/* Customer info */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><User size={14} />Customer</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {booking.customerId?.firstName?.[0]}{booking.customerId?.lastName?.[0]}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">{booking.customerId?.firstName} {booking.customerId?.lastName}</div>
              <div className="text-xs text-slate-400">{booking.customerId?.email}</div>
            </div>
          </div>
          {booking.customerId?.phone && (
            <a href={`tel:${booking.customerId.phone}`} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 mt-1">
              <Phone size={13} /> {booking.customerId.phone}
            </a>
          )}
          {booking.address && (
            <div className="flex items-start gap-2 text-sm text-slate-400 mt-1">
              <MapPin size={13} className="mt-0.5 flex-shrink-0 text-slate-500" /> {booking.address}
            </div>
          )}
        </div>
      </div>

      {/* AC unit */}
      {booking.unitId && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Wind size={14} />AC Unit</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['Brand',booking.unitId.brand],['Model',booking.unitId.model],
              ['Capacity',booking.unitId.capacity],['Type',booking.unitId.acType],
              ['Location',booking.unitId.locationLabel],['Install Year',booking.unitId.installYear||'—']].map(([k,v]) => (
              <div key={k}>
                <span className="text-slate-500 text-xs">{k}</span>
                <div className="text-slate-200 font-medium">{v}</div>
              </div>
            ))}
          </div>
          {booking.unitId.lastServiceDate && (
            <div className="text-xs text-slate-500 mt-2">Last serviced: {format(new Date(booking.unitId.lastServiceDate), 'dd MMM yyyy')}</div>
          )}
        </div>
      )}

      {/* Customer notes */}
      {booking.customerNotes && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Customer Notes</h3>
          <p className="text-sm text-slate-400 italic">"{booking.customerNotes}"</p>
        </div>
      )}

      {/* Technician notes + action */}
      {next && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><FileText size={14} />Job Notes</h3>
          <textarea className="input resize-none text-sm" rows={3}
            placeholder={next.status === 'Completed' ? 'Describe work done, parts used, recommendations...' : 'Notes (optional)...'}
            value={notes} onChange={e => setNotes(e.target.value)} />
          <button onClick={handleUpdate} disabled={updating} className={`${next.color} w-full mt-4 flex items-center justify-center gap-2`}>
            {updating ? <span className="spinner" /> : <next.icon size={16} />}
            {updating ? 'Updating...' : next.label}
          </button>
        </div>
      )}

      {booking.status === 'Completed' && booking.technicianNotes && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Your Notes</h3>
          <p className="text-sm text-slate-400">{booking.technicianNotes}</p>
          <div className="text-xs text-slate-500 mt-2">Completed: {format(new Date(booking.completedAt), 'dd MMM yyyy, HH:mm')}</div>
        </div>
      )}
    </div>
  );
}
