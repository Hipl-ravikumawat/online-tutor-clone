const mysqlOrm = require('mysql-orm');
const StudentPreferenceSchema = new mysqlOrm.Schema({
    student_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }, 
    title: {
        type: String,
        default: '',
    },
    first_name: {
        type: String,
        default: '',
    },
    last_name: {
        type: String,
        default: '',
    },
    mobile_number: [{
        number: {
            type: String,
            default: '',
            required: false,
        },
        is_sms_capable: {
            type: Boolean,
            default: false,
            required: false,
        },
    }],
    home_number: [{
        number: {
            type: String,
            default: '',
            required: false,
        },
        is_sms_capable: {
            type: Boolean,
            default: false,
            required: false,
        },
    }],
    work_number: [{
        number: {
            type: String,
            default: '',
            required: false,
        },
        is_sms_capable: {
            type: Boolean,
            default: false,
            required: false,
        },
    }],
    email: {
        type: String,
        default: '',
    },
    address: {
        type: String,
        default: '',
    },
    private_note: {
        type: String,
        default: '',
    },
    preferences:[{
        preferred_invoice_recipient: {
            type: Boolean,
            default: false,
            required: false,
        },
        student_portal_contact: {
            type: Boolean,
            default: false,
            required: false,
        },
        email_lesson_reminders: {
            type: Boolean,
            default: false,
            required: false,
        },
        sms_lesson_reminders: {
            type: Boolean,
            default: false,
            required: false,
        },
    }],
    isDeleted: {
        type: Boolean,
        required: true,
        default: false,
      },
      deleted_at: {
        type: Date,
        default: null,
      },
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const StudentPreference = mysqlOrm.model('student_preference', StudentPreferenceSchema);
module.exports = StudentPreference;
