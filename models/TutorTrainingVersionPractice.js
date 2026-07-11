const mysqlOrm = require('mysql-orm');

const tutorTrainingVersionPracticeSchema = new mysqlOrm.Schema(
  {
    tutor_training_practice_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "tutor_training_practices",
      required: true,
    },
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

const TutorTrainingVersionPractice = mysqlOrm.model(
  "tutor_training_version_practices",
  tutorTrainingVersionPracticeSchema
);
module.exports = TutorTrainingVersionPractice;