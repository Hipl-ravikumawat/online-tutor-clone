const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const tutorTrainingVersionContentSchema = new mysqlOrm.Schema(
  {
    tutor_training_content_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "tutor_training_contents",
      required: true,
    },
    topic_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "topics",
      required: true,
    },
    sub_topic_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "subTopics",
      default: null,
      transform: (sub_topic_id) => (sub_topic_id == null ? "" : sub_topic_id),
    },
    title: {
      type: String,
      // unique: true,
      required: true,
      caseInsensitive: true, // Case-insensitive matching for the index
    },
    slug: {
      type: String,
      unique: true,
      caseInsensitive: true, // Case-insensitive matching for the index
    },
    short_description: {
      type: String,
      default: null,
    },
    content_directory: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    thumbnail: {
      type: String,
      default: "null",
      transform: (thumbnail) => (thumbnail == null ? "" : thumbnail),
    },
    lesson_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "tutor_training_version_lessons",
        default: null,
      },
    ],
    status: {
      type: Number,
      default: 1,
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


tutorTrainingVersionContentSchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

tutorTrainingVersionContentSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
    this.getUpdate().$set.slug = slugId;
  }
  next();
});

const TutorTrainingVersionContent = mysqlOrm.model(
  "tutor_training_version_contents",
  tutorTrainingVersionContentSchema
);

module.exports = TutorTrainingVersionContent;