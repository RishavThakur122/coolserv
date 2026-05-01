import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, ToggleLeft, ToggleRight, Star, X, RefreshCw } from 'lucide-react';

const SPECS = ['Installation','Maintenance','Repair','GasRefill','General'];
const EMPTY_FORM = { firstName:'', lastName:'', email:'', phone:'', specializations:[], experience:'', employeeId:'' };

export default function TechnicianManager() {
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
  setLoading(true);
  api.get('/technicians')
    .then(r => setTechs(r.data || []))
    .catch(() => setTechs([]))
    .finally(() => setLoading(false));
};

useEffect(() => {
  load();
}, []);

  const toggleSpec = (s) => setForm(p => ({
    ...p, specializations: p.specializations.includes(s) ? p.specializations.filter(x => x !== s) : [...p.specializations, s]
  }));

  const handleSave = async () => {
    if (!form.firstName || !form.email) { toast.error('Name and email required'); return; }
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/technicians', form);
      else await api.put(`/technicians/${modal._id}`, form);
      toast.success(modal === 'add' ? 'Technician added!' : 'Updated!');
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const toggleAvail = async (id) => {
    try { await api.patch(`/technicians/${id}/toggle`); load(); toast.success('Availability updated'); }
    catch { toast.error('Failed'); }
  };

  const openEdit = (t) => {
    setForm({ firstName:t.userId?.firstName||'', lastName:t.userId?.lastName||'', email:t.userId?.email||'', phone:t.userId?.phone||'', specializations:t.specializations||[], experience:t.experience||'', employeeId:t.employeeId||'' });
    setModal(t);
  };

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="page-title">Technicians</h1><p className="page-subtitle">{techs.length} registered</p></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary btn-sm flex items-center gap-2"><RefreshCw size={13} />Refresh</button>
          <button onClick={() => { setForm(EMPTY_FORM); setModal('add'); }} className="btn-primary flex items-center gap-2"><Plus size={14} />Add Technician</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techs.map(t => (
            <div key={t._id} className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold">
                  {t.userId?.firstName?.[0]}{t.userId?.lastName?.[0]}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(t)} className="btn-icon btn-sm"><Pencil size={13} /></button>
                  <button onClick={() => toggleAvail(t._id)} className={`btn-icon btn-sm ${t.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                    {t.isAvailable ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-100">{t.userId?.firstName} {t.userId?.lastName}</h3>
              <p className="text-sm text-slate-400">{t.userId?.phone || t.userId?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`badge ${t.isAvailable ? 'badge-completed' : 'badge-cancelled'}`}>
                  {t.isAvailable ? 'Available' : 'Unavailable'}
                </span>
                {t.rating > 0 && (
                  <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Star size={10} className="fill-current" /> {t.rating}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {(t.specializations || []).map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">{s}</span>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-2">{t.totalJobs} jobs · {t.experience}y exp</div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-[slideUp_.2s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">{modal === 'add' ? 'Add Technician' : 'Edit Technician'}</h3>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First name</label><input className="input text-sm" value={form.firstName} onChange={set('firstName')} /></div>
                <div><label className="label">Last name</label><input className="input text-sm" value={form.lastName} onChange={set('lastName')} /></div>
              </div>
              {modal === 'add' && <div><label className="label">Email</label><input className="input text-sm" type="email" value={form.email} onChange={set('email')} /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label><input className="input text-sm" value={form.phone} onChange={set('phone')} /></div>
                <div><label className="label">Employee ID</label><input className="input text-sm" value={form.employeeId} onChange={set('employeeId')} /></div>
              </div>
              <div><label className="label">Experience (years)</label><input className="input text-sm" type="number" value={form.experience} onChange={set('experience')} /></div>
              <div>
                <label className="label">Specializations</label>
                <div className="flex gap-2 flex-wrap">
                  {SPECS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSpec(s)}
                      className={`px-3 py-1 rounded-lg text-xs border transition-all ${form.specializations.includes(s) ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {modal === 'add' && <p className="text-xs text-slate-500">Default password: TapNext@123 (technician must change on first login)</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {saving ? 'Saving...' : modal === 'add' ? 'Add Technician' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
