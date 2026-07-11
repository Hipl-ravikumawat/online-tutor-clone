const mysqlOrm = require('mysql-orm');

const familyContactSchema = new mysqlOrm.Schema(
    {
      student_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: "users",
        required: true,
      },
      user_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
      }, 
      mobile_number: {
        dial_code: {
          type: String,
          minlength: 1,
          maxlength: 5,
          default: null,
        },
        iso_code: {
          type: String,
          minlength: 1,
          maxlength: 5,
          default: null,
        },
        phone: {
          type: String,
          default: "",
        },
        sms_capable: {
          type: Boolean,
          default: false,
        },
      },
      home_number: {
        dial_code: {
          type: String,
          minlength: 1,
          maxlength: 5,
          default: null,
        },
        iso_code: {
          type: String,
          minlength: 1,
          maxlength: 5,
          default: null,
        },
        phone: {
          type: String,
          default: "",
        },
        sms_capable: {
          type: Boolean,
          default: false,
        },
      },
      work_number: {
        dial_code: {
          type: String,
          minlength: 1,
          maxlength: 5,
          default: null,
        },
        iso_code: {
          type: String,
          minlength: 1,
          maxlength: 5,
          default: null,
        },
        phone: {
          type: String,
          default: "",
        },
        sms_capable: {
          type: Boolean,
          default: false,
        },
      },
      private_note: {
        type: String,
        default: "",
      },
      preferred_invoice_recipient: {
        type: Boolean,
        default: false,
      },
      show_in_student_portal: {
        type: Boolean,
        default: false,
      },
      email_lesson_reminders: {
        type: Boolean,
        default: false,
      },
      sms_lesson_reminders: {
        type: Boolean,
        default: false,
      },
      legal_parents: {
        type: Boolean,
        default: false,
      },
      isDeleted: {
        type: Boolean,
        required: true,
        default: false,
      },
      deleted_at: {
        type: Date,
        default: null,
      },
      // Array of assigned students (references to users)
      students: [
        {
          type: mysqlOrm.Schema.Types.ObjectId,
          ref: "users",
        },
      ],
    },
    {
      timestamps: true,
    }
  );
  
  const FamilyContact = mysqlOrm.model("family_contacts", familyContactSchema);
  module.exports = FamilyContact;
  