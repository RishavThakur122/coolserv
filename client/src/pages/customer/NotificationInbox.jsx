import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICONS = {
  booking_confirmed: '📋', technician_assigned: '👷', service_started: '⚡',
  service_completed: '✅', booking_cancelled: '❌', payment_received: '💳',
  maintenance_reminder: '🔔', review_request: '⭐',
};

export default function NotificationInbox() {
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [marking, setMarking] = useState(false);

  const load = () => {
  setLoading(true);
  api.get('/notifications')
    .then(r => {
      // handle both {notifications, unreadCount} and plain array
      if (Array.isArray(r.data)) {
        setData({ notifications: r.data, unreadCount: r.data.filter(n => !n.isRead).length });
      } else {
        setData(r.data || { notifications: [], unreadCount: 0 });
      }
    })
    .catch(() => setData({ notifications: [], unreadCount: 0 }))
    .finally(() => setLoading(false));
};

useEffect(() => {
  load();
}, []);

  const markAllRead = async () => {
    setMarking(true);
    try { await api.patch('/notifications/read-all'); load(); } catch {} finally { setMarking(false); }
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setData(p => ({
      ...p,
      notifications: p.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, p.unreadCount - 1),
    }));
  };

  const filtered = filter === 'unread' ? data.notifications.filter(n => !n.isRead) : data.notifications;

  return (
    <div className="page">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{data.unreadCount > 0 ? `${data.unreadCount} unread` : 'All caught up'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter(f => f === 'all' ? 'unread' : 'all')}
            className={`btn-secondary btn-sm flex items-center gap-1.5 ${filter === 'unread' ? 'border-cyan-500/40 text-cyan-400' : ''}`}>
            <Bell size={14} /> {filter === 'all' ? 'Show Unread' : 'Show All'}
          </button>
          {data.unreadCount > 0 && (
            <button onClick={markAllRead} disabled={marking}
              className="btn-secondary btn-sm flex items-center gap-1.5">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-[3px]" /></div>
      : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <BellOff size={40} className="mx-auto text-slate-600 mb-4" />
          <div className="text-slate-400">No notifications yet</div>
          <div className="text-slate-500 text-sm mt-1">You'll receive updates here when you book a service</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div key={n._id} onClick={() => !n.isRead && markRead(n._id)}
              className={`card p-4 cursor-pointer transition-all hover:border-white/15 ${!n.isRead ? 'border-cyan-500/25 bg-cyan-500/[0.03]' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{TYPE_ICONS[n.type] || '📩'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>{n.subject}</span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5" dangerouslySetInnerHTML={{__html: n.body.replace(/<[^>]+>/g,'').slice(0,120) + '...'}} />
                  <p className="text-xs text-slate-600 mt-1">{formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
