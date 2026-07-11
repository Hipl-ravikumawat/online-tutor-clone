const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const tutorTrainingSlideSchema = new mysqlOrm.Schema(
  {
    title: {
      type: String,
      default: null,
    },
    slug: {
      type: String,
      default: null,
      caseInsensitive: true, // Case-insensitive matching for the index
    },
    duration: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    video_url: {
      type: String,
      default: null,
    },
    video: {
      type: String,
      default: null,
    },
    attachments: {
      type: Array,
      default: null,
    },
    position: {
      type: Number,
      default: null,
    },
    content_directory: {
      type: String,
      default: null,
    },
    marked_completed: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const getUniqueSlug = (value, valueList, index = 0) => {
  if (!valueList.length || valueList.indexOf(value) < 0) {
    return value;
  }
  if (valueList.indexOf(`${value}-${index + 1}`) < 0) {
    let indexing = parseInt(index) + 1;
    return `${value}-${indexing}`;
  }
  return getUniqueValue(value, valueList, index + 1);
};

tutorTrainingSlideSchema.pre("save", async function (next) {
  if (!this.slug || this.isModified("title")) {
    // Generate slug only if missing or title is modified
    // Consider using getUniqueSlug here for readable slugs
    this.slug = uuidv4();
  }
  next();
});

tutorTrainingSlideSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
    this.getUpdate().$set.slug = slugId;
  }
  next();
});

const TutorTrainingSlide = mysqlOrm.model(
  "tutor_training_slides",
  tutorTrainingSlideSchema
);
module.exports = TutorTrainingSlide;