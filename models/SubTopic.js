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

const subTopicsSchema = new mysqlOrm.Schema(
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
    topic_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "topics",
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    status: {
      type: Number,
      default: 1,
    },
    deleted_at: {
      type: Date,
      default: null,
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

subTopicsSchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

subTopicsSchema.pre(
  "update,updateOne,updateMany,findByIdAndUpdate,findOneAndUpdate",
  async function () {
    console.log("enter");
    const slugId = uuidv4();
    const userToUpdate = await this.model.findOne(this.getQuery());
    if (this.getUpdate().name && userToUpdate.name != this.getUpdate().name) {
      this.getUpdate().$set.slug = slugId;
    }
    this.where({ isDeleted: false });
    next();
  }
);

// Pre-find middleware for 'findOneAndDelete' queries
subTopicsSchema.pre("findOneAndDelete", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
subTopicsSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

const SubCategory = mysqlOrm.model("subTopics", subTopicsSchema);
module.exports = SubCategory;
