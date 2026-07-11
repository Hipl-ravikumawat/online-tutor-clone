const mysqlOrm = require('mysql-orm');

const notificationTemplateSchema = new mysqlOrm.Schema(
  {
    title: {
      type: String,
      required: true,
      caseInsensitive: true, // Case-insensitive matching for the index
    },
    type: {
      type: String,
      required: true,
      enum: ["email", "sms"],
    },
    subject: {
      type: String,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const NotificationTemplate = mysqlOrm.model("notification_templates", notificationTemplateSchema);
module.exports = NotificationTemplate;