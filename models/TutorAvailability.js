const mysqlOrm = require('mysql-orm');
const TutorAvailabilitySchema = new mysqlOrm.Schema({
    days: {
        type: Array,
        default: [],
    },
    start_date_time: {
        type: Number,
        default: '',
    },
    end_date_time: {
        type: Number,
        default: '',
    },
    note: {
        type: String,
        default: '',
    },
    tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }, 
    isApproved: {
        type: String,
        default: '1',
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false,
    },
    deleted_at: {
        type: Date,
        default: null,
    }
},  {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

const TutorAvailability = mysqlOrm.model('tutor_availabilities', TutorAvailabilitySchema);
module.exports = TutorAvailability;     