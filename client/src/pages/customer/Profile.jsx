import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

export default function CustomerProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName||'', lastName: user?.lastName||'', phone: user?.phone||'', city: user?.city||'' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const setPw = k => e => setPwForm(p => ({ ...p, [k]: e.target.value }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Min 6 characters'); return; }
    setPwSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPwSaving(false); }
  };

  const roleColor = user?.role === 'admin' ? 'from-amber-500 to-orange-600' : user?.role === 'technician' ? 'from-purple-500 to-violet-600' : 'from-cyan-500 to-blue-600';

  return (
    <div className="page max-w-2xl mx-auto">
      <h1 className="page-title mb-1">Profile Settings</h1>
      <p className="page-subtitle mb-8">Manage your account information</p>

      {/* Avatar + info */}
      <div className="card flex items-center gap-5 mb-6">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center text-white text-xl font-bold`}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <h2 className="font-bold text-white text-lg">{user?.firstName} {user?.lastName}</h2>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <span className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-1 capitalize">{user?.role}</span>
        </div>
      </div>

      {/* Profile form */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-cyan-400" />
          <h3 className="font-semibold text-white">Personal Information</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>
          <div>
            <label className="label">Email address</label>
            <input className="input opacity-60" value={user?.email} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={set('city')} placeholder="Your city" />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <span className="spinner" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-cyan-400" />
          <h3 className="font-semibold text-white">Change Password</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input className="input" type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" value={pwForm.newPassword} onChange={setPw('newPassword')} />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input className="input" type="password" value={pwForm.confirm} onChange={setPw('confirm')} />
          </div>
          <button onClick={changePassword} disabled={pwSaving} className="btn-secondary flex items-center gap-2">
            {pwSaving ? <span className="spinner" /> : <Lock size={15} />}
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
