import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.firstName}!`);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'technician') navigate('/technician');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const demoLogin = async (role) => {
    const creds = {
      admin: { email: 'admin@coolserv.in', password: 'admin123' },
      customer: { email: 'customer@coolserv.in', password: 'customer123' },
      technician: { email: 'tech@coolserv.in', password: 'tech123' },
    }[role];
    setForm(creds);
    setLoading(true);
    try {
      const user = await login(creds.email, creds.password);
      toast.success(`Demo login as ${role}`);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'technician') navigate('/technician');
      else navigate('/dashboard');
    } catch { toast.error('Demo account not yet seeded. Please register.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f1829] to-[#0b1120] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 30% 20%, #0099d9 0%, transparent 50%), radial-gradient(circle at 70% 80%, #005680 0%, transparent 50%)'}} />
        <div className="relative z-10 max-w-md">
          <div className="text-6xl mb-8">❄️</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{fontFamily:'Sora,system-ui'}}>CoolServ</h1>
          <p className="text-xl text-slate-400 mb-8">AC Service Management System — modern, automated, and built for scale.</p>
          <div className="space-y-4">
            {['Online booking in under 2 minutes', 'Real-time technician tracking', 'Automated email at every step', 'Zero manual paperwork'].map(f => (
              <div key={f} className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs">✓</div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl mb-2">❄️</div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:'Sora,system-ui'}}>CoolServ</h1>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-white mb-1">Sign in</h2>
            <p className="text-slate-400 text-sm mb-6">Enter your credentials to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@email.com" value={form.email}
                  onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="••••••••" value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))} required />
              </div>
              <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="divider border-t border-white/[0.07] my-5" />
            <p className="text-xs text-slate-500 text-center mb-3">Quick demo access</p>
            <div className="grid grid-cols-3 gap-2">
              {['admin','customer','technician'].map(r => (
                <button key={r} onClick={() => demoLogin(r)}
                  className="text-xs py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all capitalize">
                  {r}
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-slate-400 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
