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

const policySchema = new mysqlOrm.Schema(
  {
    title: {
      type: String,
      unique: true,
      required: true,
      caseInsensitive: true, // Case-insensitive matching for the index
    },
    slug: {
      type: String,
      unique: true,
      caseInsensitive: true, // Case-insensitive matching for the index
    },
    status: {
      type: Number,
      default: 1,
    },
    attachment: {
      type: String,
      default: null,
      transform: (attachment) => (attachment == null ? "" : attachment),
    },
    marked_as_read: [{
      tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
      },
      marked_at: {
          type: Date,
          required: true,
      }
    }],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

policySchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});
policySchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
    this.getUpdate().$set.slug = slugId;
  }
  next();
});

const Policy = mysqlOrm.model("policies", policySchema);
module.exports = Policy;
