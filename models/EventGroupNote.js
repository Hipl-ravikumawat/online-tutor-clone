const mysqlOrm = require('mysql-orm');

const EventGroupNoteSchema = new mysqlOrm.Schema({
    event_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "calender_events",
      required: true,
    },
    type:{
      type: String,
      default: '',
      required: false,
    },
    tutor_note: {
      type: String,
      default: '', 
      required: false,
    },
    student_note: {
      type: String,
      default: '', 
      required: false,
    },
    parent_note: {
      type: String,
      default: '', 
      required: false,
    },
    attachments: [{
        name:{
          type: String,
          default: '',
          required: false,
        },
        size:{
          type: String,
          default: '',
          required: false,
        },
        extension:{
          type: String,
          default: '',
          required: false,
        },
    }],

    email_to_all_attendees: {
      type: Boolean, 
      default: false,
      required: false,
    },
    email_to_all_parents: {
      type: Boolean, 
      default: false,
      required: false,
    },
    email_to_tutor_only: {
      type: Boolean, 
      default: false,
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
      required: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Pre-find middleware for 'findOneAndRemove' queries
EventGroupNoteSchema.pre("findOneAndRemove", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'findOneAndUpdate' queries
EventGroupNoteSchema.pre("findOneAndUpdate", async function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'update' queries
EventGroupNoteSchema.pre("update", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateOne' queries
EventGroupNoteSchema.pre("updateOne", function (next) {
  this.where({ isDeleted: false });
  next();
});

// Pre-find middleware for 'updateMany' queries
EventGroupNoteSchema.pre("updateMany", function (next) {
  this.where({ isDeleted: false });
  next();
});

const EventGroupNote = mysqlOrm.model("event_group_notes_and_attachments", EventGroupNoteSchema);
module.exports = EventGroupNote;
