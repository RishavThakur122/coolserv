const router = require('express').Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = { recipientId: req.user._id };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.unread === 'true') filter.isRead = false;
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ recipientId: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
