const mysqlOrm = require('mysql-orm');

const tutorTrainingVersionSlideSchema = new mysqlOrm.Schema(
  {
    tutor_training_slide_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "tutor_training_slides",
      required: true,
    },
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


const TutorTrainingVersionSlide = mysqlOrm.model(
  "tutor_training_version_slides",
  tutorTrainingVersionSlideSchema
);
module.exports = TutorTrainingVersionSlide;