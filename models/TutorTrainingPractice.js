const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const tutorTrainingPracticeSchema = new mysqlOrm.Schema(
  {
    question_type: {
      type: String,
      default: null,
    },
    question_title: {
      type: String,
      default: null,
    },
    question: {
      type: String,
      default: null,
    },
    question_slug: {
      type: String,
      default: null,
      caseInsensitive: true,
    },
    question_duration: {
      type: String,
      default: null,
    },
    question_image: {
      type: String,
      default: null,
    },
    question_audio: {
      type: String,
      default: null,
    },
    question_explanation: {
      type: String,
      default: null,
    },
    content_directory: {
      type: String,
      default: null,
    },
    option_display_preference: {
      type: String,
      default: null,
    },
    challenges_listing: {
      type: Boolean,
      default: false,
    },
    options: [
      {
        option_image: {
          type: String,
          default: null,
        },
        option_text: {
          type: String,
          default: null,
        },
        option_correct: {
          type: Boolean,
          default: false,
        },
      },
    ],
    reference_id: {
      type: String,
      default: "",
    },
    position: {
      type: Number,
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

tutorTrainingPracticeSchema.pre("save", async function (next) {
  if (!this.question_slug || this.isModified("question_title")) {
    // Generate slug only if missing or question_title is modified
    // Consider using getUniqueSlug here for readable slugs
    this.question_slug = uuidv4();
  }
  next();
});

tutorTrainingPracticeSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const userToUpdate = await this.model.findOne(this.getQuery());
  if (
    this.getUpdate().question_title &&
    userToUpdate.question_title != this.getUpdate().question_title
  ) {
    this.getUpdate().$set.question_slug = slugId;
  }
  next();
});

const TutorTrainingPractice = mysqlOrm.model(
  "tutor_training_practices",
  tutorTrainingPracticeSchema
);
module.exports = TutorTrainingPractice;