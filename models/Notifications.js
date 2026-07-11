const mysqlOrm = require('mysql-orm');
const { required } = require('nodemon/lib/config');

const NotificationSchema = new mysqlOrm.Schema(
  {
    student_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Email", "SMS"],
      required: true,
    },
    cc_me_email: {
     type: String,
     trim: true,
    },
    receiver: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
    },
    sender: {
      name: { type: String },
      email: { type: String },
    },
    status: {
      type: String,
      enum: ["sent", "unsent", "queued"],
      default: "pending",
    },
     slug: {
      type: String,
      required: true,
    },
    attechments: {
     type: String,
    },
    messageBody: {
      type: String, 
    },
    meta: {
      type: mysqlOrm.Schema.Types.Mixed, 
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Notification = mysqlOrm.model("Notification", NotificationSchema);
module.exports = Notification;