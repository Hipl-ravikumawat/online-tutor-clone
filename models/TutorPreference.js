const mysqlOrm = require('mysql-orm');
const TutorPreferenceSchema = new mysqlOrm.Schema({
    tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }, 
    email_notification_preferences:[{
        register_for_lesson: {
            type: Boolean,
            default: false,
            required: false,
        },
        cancel_for_lesson: {
            type: Boolean,
            default: false,
            required: false,
        },
        email_daily_agenda: {
            type: String,
            default: '',
            required: false,
        },
        select_time: {
            type: String,
            default: '',
        },
        send_email_daily_agenda: {
            type: Boolean,
            default: false,
            required: false,
        },
    }]
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const TutorPreference = mysqlOrm.model('tutor_preference', TutorPreferenceSchema);
module.exports = TutorPreference;     