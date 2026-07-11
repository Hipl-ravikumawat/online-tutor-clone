const mysqlOrm = require('mysql-orm');
const EventAttendanceSchema = new mysqlOrm.Schema({
    event_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "events",
      required: true,
    },
    is_substitute: {
      type: Boolean,
      default: false,
      required: true,
    },
    tutor_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    attendees: [
      {
        student_id: {
          type: mysqlOrm.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        status: {
          type: String,
          enum: ["unrecorded", "present", "absent", "tutor_canceled"],
          default: "unrecorded", // "Unrecorded", "Present", "Absent", "Tutor Canceled"
          required: true,
        },
        std_was_late: {
          type: Boolean,
          default: false, 
          required: false,
        },
        marked_attendance_at: {
          type: Date,
          default: null,  
          required: false,
          // validate: {
          //   validator: function (v) {
          //     return v >= new Date();
          //   },
          //   message: (props) => `${props.value} is not a current or future date!`,
          // },
        },
        std_absent_billing_option: { // Optional for Absent status
          type: String,
          default: false, // Values can be ["notice_given", "absence_billable"]
          required: false,
          // required: function () { return this.status === 'Absent'; }
        },
        tutor_cancel_billing_option: { // Optional for tutor cancel status
          type: String,
          default: false, // Values can be ["absence_billable", "absence_billable"]
          required: false,
          // required: function () { return this.status === absence_billable''; }
        },
        lesson_price: { // Add Only for Present & Absent status
          type: Number,
          default: 0,
          required: false,
          // required: function () { return this.status === 'Present'; }
        },
        lesson_price_paid_at_lesson: { // Add Only for Present status
          type: Number,
          default: 0,
          required: false,
          // required: function () { return this.status === 'Present'; }
        },
        is_lesson_price_paid_at_lesson: { // Add Only for Present status
          type: Boolean,
          default: false, 
          required: false,
        },
        payment_note: {
          type: String,
          default: null, 
          required: false,
        }, 
        payment_method: {
          type: String,
          default: null, 
          required: false,
        }, 
        private_note: {
          type: String,
          default: null, 
          required: false,
        },
        private_attachments: {
          type: Array,
          default: [],
          required: false,
        },
        email_receipt:{
          type: String,
          default: null, 
          required: false,
        },
        is_cc_email_receipt:{
          type: Boolean,
          default: false, 
          required: false,
        }
      },
    ],
    group_note_id: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "event_group_notes_and_attachments",
      default:null,
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

EventAttendanceSchema.index({ event_id: 1 });
EventAttendanceSchema.index({ tutor_id: 1 });

const EventAttendance = mysqlOrm.model("event_attendances", EventAttendanceSchema);
module.exports = EventAttendance;
