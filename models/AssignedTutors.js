const mysqlOrm = require('mysql-orm');

const assignedTutorsSchema = new mysqlOrm.Schema({
    student_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    default_lesson_category:{
        type: String,
        default: null,
    },
    default_duration: {
        type: String,
        default: null,
    },
    price:{
        type: Number,
        default: null
    },
    default_billing: { 
      type: String
     },
    deleted_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });

const AssignedTutors = mysqlOrm.model('assigned_tutors', assignedTutorsSchema);
module.exports = AssignedTutors;