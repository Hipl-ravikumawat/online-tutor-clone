const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const EventSchema = new mysqlOrm.Schema(
  {
    slug: {
      type: String,
      caseInsensitive: true,
      required: false,
    },
    parent_event_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "events",
      default: null, // Changed default to null if event only for single days
      required: false,
    },
    tutor_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    is_substitute_tutor:{
      type:Boolean,
      default:false,
      required:true,
    },
    substitute_tutor_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      default: null, // Changed default to null
      required: false,
    },
    student_ids: [
      {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "users",
        required: true,
      },
    ],
    event_category_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "event_categories",
      required: true,
    },
    event_location_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "event_locations",
      required: true,
    },
    event_course_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "event_courses",
      required: false,
    },
    event_attendance_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "event_attendances",
      default: null,
      required: false,
    },
    start_date: {
      type: Date, // only current or future date.
      required: true,
    },
    start_time: {
      type: Date, // only current or future date.
      required: true,
    },
    end_time: {
      type: Date, // only current or future date.
      required: true,
    },
    duration: {
      type: String,
      default: 30, // in minutes
      required: true,
    },
    public_note: {
      type: String,
      default: 'null', // Empty string as default
      required: false,
    },
    private_note: {
      type: String,
      default: 'null', // Empty string as default
      required: false,
    },
    status: {
      type: String,
      default: "N/A", // "N/A, Processing, Completed, Cancelled "
    },
    comment: {
      type: String,
      default: "N/A", // "N/A, Processing, Completed, Cancelled "
    },
    cancel_requested_whole_day: {
      type: Boolean,
      default: false,
      required: false,
    },
    will_repeat: {
      type: Boolean,
      default: false,
      required: true,
    },
    recurring_info: [
      {
        recurring_type: {
          type: String,  // weekly, fortnightly
          required: false,
        },
        no_of_recurring: {
          type: Number, // every
          required: false,
        },
        repeat_indefinitely: {
          type: Boolean, 
          default: false, 
          required: false,
        },
        recurring_until: {
          type: Date, // The date until which the event recurs
          required: false,
          default: null, // no end date by default
        },
      },
    ],
    student_pricing_option:{
      type: String, // possible values can be std_price_default, std_price_no_charge, std_price_specify
      default: '',
      required: false,
    },
    per_std_lesson_price:{
      type: Number, // possible values can be std_price_default, std_price_no_charge, std_price_specify
      default: 0,
      required: false,
    },
    ignore_conflict: {
      type: Boolean,
      default: false,
      required: false,
    },

    timezone_warning_acknowledged: {
      type: Boolean,
      default: false,
      required: false
    },

    leave_warning_acknowledged: {  
      type: Boolean,
      default: false,
      required: false
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    deleted_at: {
      type: Date,
      default: null,
      required: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
  {
    // Schema options
    indexes: [
      { fields: ['start_date', 1], 'end_date': 1 }, // Compound index
      { fields: ['tutor_id'], unique: false },
      { fields: ['student_ids'], unique: false },
    ]
  }
);


// Pre-find middleware for 'save' queries
EventSchema.pre("save", function (next) {
  this.slug = uuidv4();
  next();
});

// Pre-find middleware for 'findOneAndRemove' queries
EventSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
EventSchema.pre("findOneAndUpdate", async function (next) {
  const slugId = uuidv4();
  const eventToUpdate = await this.model.findOne(this.getQuery());
  if (this.getUpdate().tutor_id && eventToUpdate.tutor_id != this.getUpdate().tutor_id) {
    this.getUpdate().$set.slug = slugId;
  }
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
EventSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
EventSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
EventSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const Event = mysqlOrm.model("events", EventSchema);
module.exports = Event;