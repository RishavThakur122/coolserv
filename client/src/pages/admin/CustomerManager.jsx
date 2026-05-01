import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Search, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  const load = () => {
  setLoading(true);
  api.get('/customers')
    .then(r => setCustomers(r.data || []))
    .catch(() => setCustomers([]))
    .finally(() => setLoading(false));
};

useEffect(() => {
  load();
}, []);

  const toggleActive = async (id) => {
    try { await api.patch(`/customers/${id}/toggle`); load(); toast.success('Status updated'); }
    catch { toast.error('Failed'); }
  };

  const filtered = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) || c.phone?.includes(s);
  });

  return (
    <div className="page">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="page-title">Customers</h1><p className="page-subtitle">{customers.length} registered</p></div>
        <button onClick={load} className="btn-secondary btn-sm flex items-center gap-2"><RefreshCw size={13} />Refresh</button>
      </div>

      <div className="relative max-w-xs mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-9 text-sm py-2" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Customer</th><th>Email</th><th>Phone</th><th>City</th><th>Bookings</th><th>Joined</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <span className="font-medium text-slate-200">{c.firstName} {c.lastName}</span>
                    </div>
                  </td>
                  <td className="text-slate-400 text-xs">{c.email}</td>
                  <td className="text-slate-400 text-xs">{c.phone || '—'}</td>
                  <td className="text-slate-400 text-xs">{c.city || '—'}</td>
                  <td>
                    <span className="text-slate-200 font-medium">{c.bookingCount}</span>
                    <span className="text-slate-500 text-xs"> ({c.completedCount} done)</span>
                  </td>
                  <td className="text-slate-400 text-xs">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                  <td>
                    <span className={`badge ${c.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleActive(c._id)} className={`btn-ghost btn-sm ${c.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}>
                      {c.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
