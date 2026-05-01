import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronLeft, Wind, Wrench, Calendar, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

const SERVICES = [
  { id: 'Maintenance', label: 'AC Maintenance', desc: 'Deep cleaning, filter wash, health check', icon: '🧹', price: 800 },
  { id: 'Repair',      label: 'Repair',          desc: 'Fault diagnosis & component repair',     icon: '🔧', price: 1200 },
  { id: 'Installation',label: 'Installation',    desc: 'New AC installation & setup',            icon: '🔨', price: 2500 },
  { id: 'GasRefill',   label: 'Gas Refill',      desc: 'Refrigerant top-up & leak check',        icon: '🧊', price: 1500 },
];

const TIME_SLOTS = ['08:00–10:00','10:00–12:00','12:00–14:00','14:00–16:00','16:00–18:00'];

const STEPS = ['Select Service','Choose AC Unit','Pick Date & Time','Confirm'];

export default function BookingForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState({
    serviceType: '', unitId: '', scheduledDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    timeSlot: '', address: '', customerNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get('/units').then(r => setUnits(r.data)); }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 0) return !!form.serviceType;
    if (step === 1) return !!form.unitId;
    if (step === 2) return !!form.scheduledDate && !!form.timeSlot && !!form.address;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/bookings', form);
      toast.success('Booking created! Confirmation email sent 📧');
      navigate('/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    } finally { setSubmitting(false); }
  };

  const selectedService = SERVICES.find(s => s.id === form.serviceType);
  const selectedUnit    = units.find(u => u._id === form.unitId);

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <div className="page max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Book a Service</h1>
        <p className="page-subtitle">Schedule your AC service in 4 easy steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`step-circle ${i < step ? 'step-complete' : i === step ? 'step-active' : 'step-inactive'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-slate-200' : 'text-slate-500'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-cyan-500/50' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <div className="card min-h-[360px] flex flex-col">
        {/* Step 0: Service type */}
        {step === 0 && (
          <div>
            <h2 className="font-semibold text-white mb-4">What service do you need?</h2>
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.map(s => (
                <button key={s.id} onClick={() => set('serviceType', s.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${form.serviceType === s.id
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-white' : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-slate-300'}`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                  <div className="text-xs font-bold text-cyan-400 mt-2">from ₹{s.price}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: AC Unit */}
        {step === 1 && (
          <div>
            <h2 className="font-semibold text-white mb-4">Which AC unit?</h2>
            {units.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🌬️</div>
                <p className="text-slate-400 mb-4">No AC units registered yet</p>
                <button onClick={() => navigate('/units')} className="btn-primary btn-sm">Register a unit first</button>
              </div>
            ) : (
              <div className="space-y-3">
                {units.map(u => (
                  <button key={u._id} onClick={() => set('unitId', u._id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${form.unitId === u._id
                      ? 'bg-cyan-500/15 border-cyan-500/50' : 'bg-white/[0.03] border-white/10 hover:border-white/20'}`}>
                    <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                      <Wind size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{u.brand} {u.model}</div>
                      <div className="text-xs text-slate-400">{u.locationLabel} · {u.capacity} · {u.acType}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date, Time, Address */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-white mb-3">Select date</h2>
              <div className="flex gap-2 flex-wrap">
                {dates.map(d => {
                  const v = format(d, 'yyyy-MM-dd');
                  return (
                    <button key={v} onClick={() => set('scheduledDate', v)}
                      className={`px-4 py-2 rounded-xl border text-sm transition-all ${form.scheduledDate === v
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'}`}>
                      <div className="font-medium">{format(d, 'EEE')}</div>
                      <div className="text-xs">{format(d, 'dd MMM')}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Time slot</label>
              <div className="flex gap-2 flex-wrap">
                {TIME_SLOTS.map(t => (
                  <button key={t} onClick={() => set('timeSlot', t)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${form.timeSlot === t
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Service address</label>
              <textarea className="input resize-none" rows={2} placeholder="Full address where technician should visit..."
                value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none" rows={2} placeholder="Any specific issue or instructions..."
                value={form.customerNotes} onChange={e => set('customerNotes', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div>
            <h2 className="font-semibold text-white mb-4">Confirm your booking</h2>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl divide-y divide-white/[0.06]">
              {[
                ['Service',  selectedService?.label || form.serviceType],
                ['AC Unit',  selectedUnit ? `${selectedUnit.brand} ${selectedUnit.model} · ${selectedUnit.locationLabel}` : '—'],
                ['Date',     format(new Date(form.scheduledDate), 'EEEE, dd MMMM yyyy')],
                ['Time Slot',form.timeSlot],
                ['Address',  form.address],
                ['Est. Amount', `₹${selectedService?.price || 0}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-slate-200 font-medium text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              📧 A confirmation email will be sent to you once the booking is created.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-auto pt-6">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-30">
            <ChevronLeft size={16} /> Back
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="btn-primary flex items-center gap-2 disabled:opacity-40">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary flex items-center gap-2">
              {submitting ? <span className="spinner" /> : <CheckCircle size={16} />}
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
