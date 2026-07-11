const Notification = require("../models/Notifications");

async function createNotification({
  tutor_id,
  type,            
  subject,         
  messageBody,   
  slug,         
  cc_me_email = null,
  receiver = {},
  sender = {},
  status = "queued",
  meta = {},
  attechments = null,
  sentAt = new Date(),
}) {
  try {
    const notification = new Notification({
      student_id:tutor_id,
      type,
      subject,
      messageBody,
      slug,
      cc_me_email,
      receiver,
      sender,
      status,
      meta,
      attechments,
      sentAt,
    });

    await notification.save();
    return notification;
  } catch (err) {
    console.error("Notification create error:", err);
    return null;
  }
}

module.exports = { createNotification };
