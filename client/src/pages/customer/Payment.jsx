import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, ArrowLeft } from 'lucide-react';

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then(r => setBooking(r.data))
      .catch(() => toast.error('Booking not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadRazorpay = () => new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePay = async () => {
    setPaying(true);
    try {
      // Create order
      const { data: order } = await api.post('/payments/create-order', { bookingId: id });

      // Demo mode — no real Razorpay key
      if (!order.razorpayOrderId || order.keyId === 'rzp_test_demo') {
        await api.post('/payments/verify', {
          paymentId:         order.paymentId,
          razorpayOrderId:   'demo_order',
          razorpayPaymentId: `demo_pay_${Date.now()}`,
          razorpaySignature: 'demo_signature',
        });
        setPaid(true);
        toast.success('Payment successful! 🎉');
        return;
      }

      // Real Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Razorpay failed to load'); return; }

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'CoolServ',
        description: `${booking.serviceType} Service`,
        order_id:    order.razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              paymentId:         order.paymentId,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPaid(true);
            toast.success('Payment successful! 🎉');
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#00bcff' },
      };

      new window.Razorpay(options).open();

    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="spinner w-8 h-8 border-[3px]" />
    </div>
  );

  if (!booking) return (
    <div className="card text-center py-12 text-slate-400">Booking not found</div>
  );

  if (paid || booking.paymentStatus === 'Paid') return (
    <div className="page max-w-md mx-auto">
      <div className="card text-center py-12">
        <CheckCircle size={56} className="mx-auto text-green-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Payment Successful!</h2>
        <p className="text-slate-400 mb-6">
          ₹{booking.estimatedAmount} paid for {booking.serviceType} service
        </p>
        <button onClick={() => navigate('/bookings')} className="btn-primary">
          Back to My Bookings
        </button>
      </div>
    </div>
  );

  return (
    <div className="page max-w-md mx-auto">
      <button onClick={() => navigate('/bookings')}
        className="btn-ghost flex items-center gap-2 mb-6 text-slate-400">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="page-title mb-6">Complete Payment</h1>

      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Order Summary</h3>
        <div className="space-y-3">
          {[
            ['Service',    booking.serviceType],
            ['Booking ID', `#${booking._id.slice(-6).toUpperCase()}`],
            ['Unit',       `${booking.unitId?.brand} ${booking.unitId?.model}`],
            ['Status',     booking.status],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-200 font-medium">{v}</span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-3 flex justify-between">
            <span className="font-semibold text-white">Total Amount</span>
            <span className="text-xl font-bold text-cyan-400">
              ₹{booking.estimatedAmount}
            </span>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Payment Methods</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
          {['UPI', 'Credit/Debit Card', 'Net Banking'].map(m => (
            <div key={m} className="p-3 rounded-xl bg-white/5 border border-white/10">{m}</div>
          ))}
        </div>
      </div>

      <button onClick={handlePay} disabled={paying}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
        {paying ? <span className="spinner" /> : <CreditCard size={18} />}
        {paying ? 'Processing...' : `Pay ₹${booking.estimatedAmount}`}
      </button>

      <p className="text-xs text-slate-500 text-center mt-3">
        🔒 Secured by Razorpay · SSL encrypted
      </p>
    </div>
  );
}