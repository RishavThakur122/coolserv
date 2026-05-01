export default function StatusBadge({ status }) {
  
  const map = {
  Pending:         'badge-pending',
  Assigned:        'badge-assigned',
  InProgress:      'badge-inprogress',
  PendingApproval: 'badge-inprogress',   // ← add this
  Completed:       'badge-completed',
  Cancelled:       'badge-cancelled',
};
const dots = {
  Pending:         'bg-amber-400',
  Assigned:        'bg-blue-400',
  InProgress:      'bg-purple-400',
  PendingApproval: 'bg-orange-400',      // ← add this
  Completed:       'bg-green-400',
  Cancelled:       'bg-red-400',
};
  return (
    <span className={`badge ${map[status] || 'bg-white/10 text-slate-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || 'bg-slate-400'}`} />
      {status || '—'}
    </span>
  );
}
