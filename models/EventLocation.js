const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const EventLocationSchema = new mysqlOrm.Schema(
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
    icons: {
      type: String,
      default: '', 
      required: false,
    },
    location_type: {
      type: String,
      default: '', 
      required: false,
    },
    specific_address_details: {
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
EventLocationSchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
EventLocationSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
EventLocationSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const eventLocationToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().name && eventLocationToUpdate.name != this.getUpdate().name) {
    this.getUpdate().$set.slug = slugId;
  }
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
EventLocationSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
EventLocationSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
EventLocationSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const EventLocation = mysqlOrm.model("event_locations", EventLocationSchema);
module.exports = EventLocation;