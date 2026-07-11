const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const tutorTrainingLessonSchema = new mysqlOrm.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
    //   caseInsensitive: true, // Case-insensitive matching for the index
    },
    slide_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "tutor_training_slides",
        default: null,
      },
    ],
    practice_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "tutor_training_practices",
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


tutorTrainingLessonSchema.pre("save", async function (next) {
    if (!this.slug) {
      this.slug = uuidv4();
    }
    next();
  });

tutorTrainingLessonSchema.pre("findOneAndUpdate", async function (next) {
const slugId = uuidv4();
const userToUpdate = await this.model.findOne(this.getQuery())
  if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
      this.getUpdate().$set.slug = slugId;
  }
  next();
});
  
const TutorTrainingLesson = mysqlOrm.model(
  "tutor_training_lessons",
  tutorTrainingLessonSchema
);
module.exports = TutorTrainingLesson;
