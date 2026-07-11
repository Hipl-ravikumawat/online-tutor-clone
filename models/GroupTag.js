const mysqlOrm = require('mysql-orm');
var slugify = require("slugify");
const { v4: uuidv4 } = require("uuid");

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`
  remove: slugify(" ", {
    remove: /[`~!@#$%^&*()_\-+=\[\]{};:'"\\|\/,.<>?\s]/g,
  }), // remove characters that match regex, defaults to `undefined`
  lower: true, // convert to lower case, defaults to `false`
  strict: true, // strip special characters except replacement, defaults to `false`
  locale: "en", // language code of the locale to use
  trim: true, // trim leading and trailing replacement chars, defaults to `true`
}; 


const groupTagSchema = new mysqlOrm.Schema(
  {
    name: {
      type: String,
      required: true,
      caseInsensitive: true // Case-insensitive matching for the index
    },
    slug: {
      type: String,
      unique: true,
      caseInsensitive: true // Case-insensitive matching for the index
    },
    student_ids: [{
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: 'users', // Assuming students are stored in the User model with role_id = 3
    }],
    created_by: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: 'users' // Admin or staff who created it
    },
    color: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    active_status: {
      type: Boolean,
      default: true,
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

groupTagSchema.pre("save", function (next) {
  this.slug = uuidv4();
  this.active_status = true;
  next();
});

// Pre-find middleware for 'findOneAndDelete' queries
groupTagSchema.pre("findOneAndDelete", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
groupTagSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
groupTagSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().name && userToUpdate.name != this.getUpdate().name) {
    this.getUpdate().$set.slug = slugId;
  }
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
groupTagSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
groupTagSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
groupTagSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const GroupTag = mysqlOrm.model("group_tags", groupTagSchema);
module.exports = GroupTag;
