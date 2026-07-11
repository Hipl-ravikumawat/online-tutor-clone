const mysqlOrm = require('mysql-orm');

const EventCourseSchema = new mysqlOrm.Schema(
  {
    event_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "events",
        required: false,
      },
    ],
    content: [
      {
        learning_content_id: {
          type: mysqlOrm.Schema.Types.ObjectId,
          ref: "learningContents",
          required: false,
        },
        lesson_id: {
          type: mysqlOrm.Schema.Types.ObjectId,
          ref: "lessons",
          required: false,
        },
        is_default: {
          type: Boolean,
          required: false,
        },
        is_skipped: {
          type: Boolean,
          required: false,
        },
        status: {
          type: String,
          enum: ["N/A", "Processing", "Completed"],
          required: false,
        },
        slides: [
          {
            slide_id: {
              type: mysqlOrm.Schema.Types.ObjectId,
              ref: "slides",
              required: false,
            },
            attached_event_id: {
              type: mysqlOrm.Schema.Types.ObjectId,
              ref: "events",
              default:null,
              required: false,
            },
            mark_as_read: {
              type: Boolean,
              default: false,
              required: false,
            },
            mark_at: {
              type: Date, // No default value
              default: '',
              required: false,
            },
          },
        ],
        slide_score:{
          type: String,
          default: '0',
          required: false,
        }
      },
    ],
    percentage:{
      type: Number,
      default: '0',
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
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

// Pre-find middleware for 'findOneAndRemove' queries
EventCourseSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
EventCourseSchema.pre("findOneAndUpdate", async function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
EventCourseSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
EventCourseSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
EventCourseSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const EventCourse = mysqlOrm.model("event_courses", EventCourseSchema);
module.exports = EventCourse;