const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const EventTemplateSchema = new mysqlOrm.Schema(
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
    description: {
      type: String,
      default: '', 
      required: false,
    },
    template_note: {
      type: String,
      default: '', 
      required: true,
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
EventTemplateSchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
EventTemplateSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
EventTemplateSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const eventTemplateToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().name && eventTemplateToUpdate.name != this.getUpdate().name) {
    this.getUpdate().$set.slug = slugId;
  }
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
EventTemplateSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
EventTemplateSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
EventTemplateSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const EventTemplate = mysqlOrm.model("event_templates", EventTemplateSchema);
module.exports = EventTemplate;