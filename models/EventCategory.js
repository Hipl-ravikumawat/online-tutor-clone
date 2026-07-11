const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const EventCategorySchema = new mysqlOrm.Schema(
  {
    name: {
      type: String,
      caseInsensitive: true,
      required: true,
    },
    slug: {
      type: String,
      caseInsensitive: true,
      required: false,
    },
    color: {
      type: String,
      default: '', 
      required: false,
    },
    email_reminder: {
      type: String,
      default: '', 
      required: false,
    },
    sms_reminder: {
      type: String,
      default: '', 
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    deleted_at: {
      type: Date,
      default: null,
      required: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Pre-find middleware for 'save' queries
EventCategorySchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
EventCategorySchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
EventCategorySchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const eventCategoryToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().name && eventCategoryToUpdate.name != this.getUpdate().name) {
    this.getUpdate().$set.slug = slugId;
  }
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
EventCategorySchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
EventCategorySchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
EventCategorySchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const EventCategory = mysqlOrm.model("event_categories", EventCategorySchema);
module.exports = EventCategory;