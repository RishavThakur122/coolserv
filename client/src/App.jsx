import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerDashboard from './pages/customer/Dashboard';
import MyBookings from './pages/customer/MyBookings';
import BookingForm from './pages/customer/BookingForm';
import ACUnitManager from './pages/customer/ACUnitManager';
import NotificationInbox from './pages/customer/NotificationInbox';
import CustomerProfile from './pages/customer/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import BookingManager from './pages/admin/BookingManager';
import TechnicianManager from './pages/admin/TechnicianManager';
import CustomerManager from './pages/admin/CustomerManager';
import Analytics from './pages/admin/Analytics';
import TechnicianDashboard from './pages/technician/TechnicianDashboard';
import JobDetail from './pages/technician/JobDetail';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0b1120]"><div className="spinner w-8 h-8 border-[3px]" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'technician') return <Navigate to="/technician" replace />;
  return <Navigate to="/dashboard" replace />;
}
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/dashboard" element={<PrivateRoute roles={['customer']}><AppLayout><CustomerDashboard /></AppLayout></PrivateRoute>} />
      <Route path="/bookings" element={<PrivateRoute roles={['customer']}><AppLayout><MyBookings /></AppLayout></PrivateRoute>} />
      <Route path="/book" element={<PrivateRoute roles={['customer']}><AppLayout><BookingForm /></AppLayout></PrivateRoute>} />
      <Route path="/units" element={<PrivateRoute roles={['customer']}><AppLayout><ACUnitManager /></AppLayout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute roles={['customer']}><AppLayout><NotificationInbox /></AppLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute roles={['customer','admin','technician']}><AppLayout><CustomerProfile /></AppLayout></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><AppLayout><AdminDashboard /></AppLayout></PrivateRoute>} />
      <Route path="/admin/bookings" element={<PrivateRoute roles={['admin']}><AppLayout><BookingManager /></AppLayout></PrivateRoute>} />
      <Route path="/admin/technicians" element={<PrivateRoute roles={['admin']}><AppLayout><TechnicianManager /></AppLayout></PrivateRoute>} />
      <Route path="/admin/customers" element={<PrivateRoute roles={['admin']}><AppLayout><CustomerManager /></AppLayout></PrivateRoute>} />
      <Route path="/admin/analytics" element={<PrivateRoute roles={['admin']}><AppLayout><Analytics /></AppLayout></PrivateRoute>} />
      <Route path="/technician" element={<PrivateRoute roles={['technician']}><AppLayout><TechnicianDashboard /></AppLayout></PrivateRoute>} />
      <Route path="/technician/job/:id" element={<PrivateRoute roles={['technician']}><AppLayout><JobDetail /></AppLayout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style:{background:'#1a2235',color:'#f1f5f9',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',fontSize:'14px'}, success:{iconTheme:{primary:'#22c55e',secondary:'#1a2235'}}, error:{iconTheme:{primary:'#ef4444',secondary:'#1a2235'}} }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
