const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Base email wrapper
const baseHtml = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .header p  { color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; color: #334155; line-height: 1.6; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    .badge-blue   { background: #dbeafe; color: #1d4ed8; }
    .badge-green  { background: #dcfce7; color: #16a34a; }
    .badge-yellow { background: #fef9c3; color: #ca8a04; }
    .badge-red    { background: #fee2e2; color: #dc2626; }
    .detail-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .detail-row  { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-value { color: #0f172a; font-weight: 500; }
    .btn { display: inline-block; background: #0ea5e9; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❄️ CoolServ</h1>
      <p>AC Service Management System · TapNext</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} CoolServ by TapNext · This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>`;

// Helper: save notification to DB and send email
async function dispatch({ recipientId, bookingId, type, subject, body, toEmail }) {
  // Save to DB
  try {
    await Notification.create({ recipientId, bookingId, type, subject, body });
  } catch (e) { console.error('Notification save error:', e.message); }

  // Send email if SMTP configured
  if (toEmail && process.env.SMTP_USER) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'CoolServ <noreply@coolserv.in>',
        to: toEmail,
        subject,
        html: baseHtml(body),
      });
    } catch (e) { console.error('Email send error:', e.message); }
  }
}

// ── Notification senders ──────────────────────────────────────────────────────

async function sendBookingConfirmation(booking, customer) {
  const subject = `[CoolServ] Booking Confirmed — #${booking._id.toString().slice(-6).toUpperCase()}`;
  const body = `
    <h2>Your booking is confirmed! 🎉</h2>
    <p>Hi ${customer.firstName}, we've received your service request.</p>
    <div class="detail-card">
      <div class="detail-row"><span class="detail-label">Booking ID</span><span class="detail-value">#${booking._id.toString().slice(-6).toUpperCase()}</span></div>
      <div class="detail-row"><span class="detail-label">Service Type</span><span class="detail-value">${booking.serviceType}</span></div>
      <div class="detail-row"><span class="detail-label">Scheduled Date</span><span class="detail-value">${new Date(booking.scheduledDate).toDateString()}</span></div>
      <div class="detail-row"><span class="detail-label">Time Slot</span><span class="detail-value">${booking.timeSlot}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-yellow">Pending</span></span></div>
    </div>
    <p>Our admin team will assign a technician shortly and notify you via email.</p>`;
  await dispatch({ recipientId: customer._id, bookingId: booking._id, type: 'booking_confirmed', subject, body, toEmail: customer.email });
}

async function sendTechnicianAssigned(booking, customer, technician) {
  const subject = `[CoolServ] Technician Assigned — #${booking._id.toString().slice(-6).toUpperCase()}`;
  const body = `
    <h2>Your technician has been assigned! 👷</h2>
    <p>Hi ${customer.firstName}, a qualified technician is now assigned to your booking.</p>
    <div class="detail-card">
      <div class="detail-row"><span class="detail-label">Technician</span><span class="detail-value">${technician.userId?.fullName || technician.userId?.firstName || 'Assigned'}</span></div>
      <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${technician.userId?.phone || 'Will contact you'}</span></div>
      <div class="detail-row"><span class="detail-label">Scheduled Date</span><span class="detail-value">${new Date(booking.scheduledDate).toDateString()}</span></div>
      <div class="detail-row"><span class="detail-label">Time Slot</span><span class="detail-value">${booking.timeSlot}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-blue">Assigned</span></span></div>
    </div>
    <p>Please ensure access to the AC unit at the scheduled time.</p>`;
  await dispatch({ recipientId: customer._id, bookingId: booking._id, type: 'technician_assigned', subject, body, toEmail: customer.email });
}

async function sendServiceCompleted(booking, customer) {
  const subject = `[CoolServ] Service Completed — #${booking._id.toString().slice(-6).toUpperCase()}`;
  const body = `
    <h2>Service completed successfully! ✅</h2>
    <p>Hi ${customer.firstName}, your AC service has been completed.</p>
    <div class="detail-card">
      <div class="detail-row"><span class="detail-label">Booking ID</span><span class="detail-value">#${booking._id.toString().slice(-6).toUpperCase()}</span></div>
      <div class="detail-row"><span class="detail-label">Service Type</span><span class="detail-value">${booking.serviceType}</span></div>
      <div class="detail-row"><span class="detail-label">Completed At</span><span class="detail-value">${new Date(booking.completedAt).toLocaleString('en-IN')}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-green">Completed</span></span></div>
    </div>
    ${booking.technicianNotes ? `<p><strong>Technician Notes:</strong> ${booking.technicianNotes}</p>` : ''}
    <p>We'd love to hear your feedback! Please leave a rating for your technician.</p>`;
  await dispatch({ recipientId: customer._id, bookingId: booking._id, type: 'service_completed', subject, body, toEmail: customer.email });
}

async function sendCancellationNotice(booking, customer) {
  const subject = `[CoolServ] Booking Cancelled — #${booking._id.toString().slice(-6).toUpperCase()}`;
  const body = `
    <h2>Booking Cancelled</h2>
    <p>Hi ${customer.firstName}, your booking has been cancelled.</p>
    <div class="detail-card">
      <div class="detail-row"><span class="detail-label">Booking ID</span><span class="detail-value">#${booking._id.toString().slice(-6).toUpperCase()}</span></div>
      <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${booking.cancelReason || 'Not specified'}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-red">Cancelled</span></span></div>
    </div>
    <p>You can schedule a new booking anytime from your CoolServ dashboard.</p>`;
  await dispatch({ recipientId: customer._id, bookingId: booking._id, type: 'booking_cancelled', subject, body, toEmail: customer.email });
}

async function sendPaymentReceived(booking, customer, payment) {
  const subject = `[CoolServ] Payment Received — ₹${(payment.amount / 100).toFixed(0)}`;
  const body = `
    <h2>Payment Confirmed 💳</h2>
    <p>Hi ${customer.firstName}, your payment has been successfully received.</p>
    <div class="detail-card">
      <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">₹${(payment.amount / 100).toFixed(2)}</span></div>
      <div class="detail-row"><span class="detail-label">Payment ID</span><span class="detail-value">${payment.razorpayPaymentId || payment._id}</span></div>
      <div class="detail-row"><span class="detail-label">Booking</span><span class="detail-value">#${booking._id.toString().slice(-6).toUpperCase()}</span></div>
    </div>`;
  await dispatch({ recipientId: customer._id, bookingId: booking._id, type: 'payment_received', subject, body, toEmail: customer.email });
}
async function sendPendingApproval(booking, customer) {
  const subject = `[CoolServ] Please confirm service completion — #${booking._id.toString().slice(-6).toUpperCase()}`;
  const body = `
    <h2>Your service is done! Please confirm ✅</h2>
    <p>Hi ${customer.firstName}, your technician has marked the job as complete.</p>
    <div class="detail-card">
      <div class="detail-row"><span class="detail-label">Booking ID</span><span class="detail-value">#${booking._id.toString().slice(-6).toUpperCase()}</span></div>
      <div class="detail-row"><span class="detail-label">Service Type</span><span class="detail-value">${booking.serviceType}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="badge badge-yellow">Awaiting Your Approval</span></span></div>
    </div>
    ${booking.technicianNotes ? `<p><strong>Technician Notes:</strong> ${booking.technicianNotes}</p>` : ''}
    <p>Please log in to your CoolServ dashboard and confirm the service was completed satisfactorily.</p>`;
  await dispatch({ 
    recipientId: customer._id, 
    bookingId: booking._id, 
    type: 'pending_approval', 
    subject, 
    body, 
    toEmail: customer.email 
  });
}

module.exports = {
  sendBookingConfirmation,
  sendTechnicianAssigned,
  sendServiceCompleted,
  sendCancellationNotice,
  sendPaymentReceived,
  sendPendingApproval,   // ← add this
};
