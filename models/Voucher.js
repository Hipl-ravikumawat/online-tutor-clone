const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const voucherSchema = new mysqlOrm.Schema(
  {
    title: {
      type: String,
      required: true,
      caseInsensitive: true // Case-insensitive matching for the index
    },
    slug: {
      type: String,
      unique: true,
      caseInsensitive: true // Case-insensitive matching for the index
    },
    required_points: {
      type: Number,
      default: 0,
    },
    equivalent_amount: {
      type: Number,
      default: 0,
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

voucherSchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

// Pre-find middleware for 'findOneAndDelete' queries
voucherSchema.pre("findOneAndDelete", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
voucherSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
voucherSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
    this.getUpdate().$set.slug = slugId;
  }
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
voucherSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
voucherSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
voucherSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const Voucher = mysqlOrm.model("vouchers", voucherSchema);
module.exports = Voucher;