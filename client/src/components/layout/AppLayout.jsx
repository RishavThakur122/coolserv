import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, Wind, Bell, Users, Wrench,
  BarChart3, LogOut, Menu, X, ChevronRight, Briefcase, User
} from 'lucide-react';

const customerNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/bookings',  icon: CalendarDays,    label: 'My Bookings' },
  { to: '/units',     icon: Wind,            label: 'AC Units' },
  { to: '/notifications', icon: Bell,        label: 'Notifications' },
];

const adminNav = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/bookings',     icon: CalendarDays,    label: 'Bookings' },
  { to: '/admin/technicians',  icon: Wrench,          label: 'Technicians' },
  { to: '/admin/customers',    icon: Users,           label: 'Customers' },
  { to: '/admin/analytics',    icon: BarChart3,       label: 'Analytics' },
];

const technicianNav = [
  { to: '/technician', icon: Briefcase, label: 'My Jobs' },
];

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = user?.role === 'admin' ? adminNav
    : user?.role === 'technician' ? technicianNav
    : customerNav;

  const roleColor = user?.role === 'admin' ? 'text-amber-400' : user?.role === 'technician' ? 'text-purple-400' : 'text-cyan-400';
  const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'technician' ? 'Technician' : 'Customer';

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#0f1829] border-r border-white/[0.06] z-40 flex flex-col
        transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-lg">❄️</div>
            <div>
              <div className="font-bold text-white text-base leading-tight" style={{fontFamily:'Sora,system-ui,sans-serif'}}>CoolServ</div>
              <div className="text-xs text-slate-500">Service Management</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-200 truncate">{user?.firstName} {user?.lastName}</div>
              <div className={`text-xs font-medium ${roleColor}`}>{roleLabel}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/admin' || to === '/dashboard' || to === '/technician'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onClose}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="pt-4 border-t border-white/[0.06] mt-4">
            <NavLink to="/profile" className={({isActive}) => `sidebar-link${isActive?' active':''}`} onClick={onClose}>
              <User size={17} /><span>Profile</span>
            </NavLink>
            <button onClick={logout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/5 mt-1">
              <LogOut size={17} /><span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="text-xs text-slate-600 text-center">CoolServ by TapNext · v2.0</div>
        </div>
      </aside>
    </>
  );
}

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1120] flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-14 bg-[#0f1829]/80 border-b border-white/[0.06] flex items-center px-4 lg:px-6 sticky top-0 z-20 backdrop-blur">
          <button className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
