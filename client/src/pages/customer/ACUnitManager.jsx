import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Wind, Pencil, Trash2, X } from 'lucide-react';

const BRANDS = ['Daikin','Voltas','Blue Star','Hitachi','LG','Samsung','Carrier','Panasonic','Godrej','Other'];
const CAPACITIES = ['0.75 Ton','1 Ton','1.5 Ton','2 Ton','2.5 Ton','Other'];
const TYPES = ['Split','Window','Portable','Cassette','Ducted'];

const EMPTY = { brand:'', model:'', installYear:'', capacity:'1.5 Ton', acType:'Split', locationLabel:'', serialNumber:'' };

export default function ACUnitManager() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | unit obj
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
  setLoading(true);
  api.get('/units')
    .then(r => setUnits(r.data || []))
    .catch(() => setUnits([]))
    .finally(() => setLoading(false));
};

useEffect(() => {
  load();
}, []);
  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (u) => { setForm({ brand:u.brand, model:u.model, installYear:u.installYear||'', capacity:u.capacity||'1.5 Ton', acType:u.acType||'Split', locationLabel:u.locationLabel||'', serialNumber:u.serialNumber||'' }); setModal(u); };

  const handleSave = async () => {
    if (!form.brand || !form.model || !form.locationLabel) { toast.error('Brand, model & location required'); return; }
    setSaving(true);
    try {
      if (modal === 'add') await api.post('/units', form);
      else await api.put(`/units/${modal._id}`, form);
      toast.success(modal === 'add' ? 'AC unit added!' : 'Unit updated!');
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await api.delete(`/units/${id}`); toast.success('Unit removed'); load(); }
    catch { toast.error('Failed to remove unit'); }
    finally { setDeleting(null); }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">My AC Units</h1>
          <p className="page-subtitle">{units.length}/5 units registered</p>
        </div>
        {units.length < 5 && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} />Add Unit</button>
        )}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div>
      : units.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🌬️</div>
          <div className="text-slate-300 font-medium mb-1">No AC units yet</div>
          <div className="text-slate-500 text-sm mb-5">Register your AC units to start booking services</div>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2"><Plus size={15} />Register your first unit</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map(u => (
            <div key={u._id} className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Wind size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(u)} className="btn-icon btn-sm"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(u._id)} disabled={deleting === u._id}
                    className="btn-icon btn-sm text-red-400 hover:text-red-300">
                    {deleting === u._id ? <span className="spinner w-3.5 h-3.5" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-100">{u.brand} {u.model}</h3>
              <p className="text-sm text-slate-400 mt-1">{u.locationLabel}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{u.capacity}</span>
                <span className="badge bg-white/5 text-slate-400 border border-white/10">{u.acType}</span>
                {u.installYear && <span className="badge bg-white/5 text-slate-400 border border-white/10">{u.installYear}</span>}
              </div>
              {u.lastServiceDate && (
                <p className="text-xs text-slate-500 mt-2">Last serviced: {new Date(u.lastServiceDate).toLocaleDateString('en-IN')}</p>
              )}
            </div>
          ))}

          {units.length < 5 && (
            <button onClick={openAdd}
              className="border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-cyan-400 transition-all min-h-[160px]">
              <Plus size={24} />
              <span className="text-sm font-medium">Add another unit</span>
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-[slideUp_.2s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">{modal === 'add' ? 'Register New AC Unit' : 'Edit AC Unit'}</h3>
              <button className="btn-ghost" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Brand</label>
                  <select className="input text-sm" value={form.brand} onChange={set('brand')}>
                    <option value="">Select brand</option>
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Model</label>
                  <input className="input text-sm" placeholder="e.g. 5 Star Split" value={form.model} onChange={set('model')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Capacity</label>
                  <select className="input text-sm" value={form.capacity} onChange={set('capacity')}>
                    {CAPACITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input text-sm" value={form.acType} onChange={set('acType')}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Location label</label>
                <input className="input text-sm" placeholder="e.g. Master Bedroom" value={form.locationLabel} onChange={set('locationLabel')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Install Year</label>
                  <input className="input text-sm" type="number" placeholder="2022" value={form.installYear} onChange={set('installYear')} />
                </div>
                <div>
                  <label className="label">Serial No. (optional)</label>
                  <input className="input text-sm" placeholder="SN-XXXX" value={form.serialNumber} onChange={set('serialNumber')} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : null}
                {saving ? 'Saving...' : modal === 'add' ? 'Register Unit' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
