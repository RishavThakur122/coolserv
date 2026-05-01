import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', phone:'', city:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register({ ...form, role: 'customer' });
      toast.success('Account created! Welcome to CoolServ 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">❄️</div>
          <h1 className="text-2xl font-bold text-white" style={{fontFamily:'Sora,system-ui'}}>Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Join CoolServ to manage your AC services</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input className="input" placeholder="Rishav" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" placeholder="Thakur" value={form.lastName} onChange={set('lastName')} required />
              </div>
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone number</label>
                <input className="input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" placeholder="New Delhi" value={form.city} onChange={set('city')} />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
            </div>
            <button className="btn-primary w-full flex items-center justify-center gap-2 mt-2" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
