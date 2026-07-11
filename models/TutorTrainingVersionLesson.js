const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const tutorTrainingVersionLessonSchema = new mysqlOrm.Schema(
  {
    tutor_training_lesson_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "tutor_training_lessons",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      // caseInsensitive: true, // Case-insensitive matching for the index
    },
    slide_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "tutor_training_version_slides",
        default: null,
      },
    ],
    practice_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "tutor_training_version_practices",
        default: null,
      },
    ],
    position: {
      type: Number,
      default: null,
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

tutorTrainingVersionLessonSchema.pre("save", async function (next) {
    this.slug = uuidv4();
    next();
  });

tutorTrainingVersionLessonSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
        this.getUpdate().$set.slug = slugId;
    }
  next();
});

const TutorTrainingVersionLesson = mysqlOrm.model(
  "tutor_training_version_lessons",
  tutorTrainingVersionLessonSchema
);
module.exports = TutorTrainingVersionLesson;
