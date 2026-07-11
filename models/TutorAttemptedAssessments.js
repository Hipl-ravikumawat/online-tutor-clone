const mysqlOrm = require('mysql-orm');
const TutorAttemptedAssessmentsSchema = new mysqlOrm.Schema({
    assessment_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'tutor_training_assessments',
        required: true,
    },
    tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }, 
    lesson_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'tutor_training_lessons',
        required: true,
    },
    assessment_type: {
        type: String,
        default: '',
    },
    answers: {
        type: Array,
        default: [],
    },
    status: {
        type: String,
        default: 'N/A',
    },
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const TutorAttemptedAssessments = mysqlOrm.model('tutor_attempted_assessments', TutorAttemptedAssessmentsSchema);
module.exports = TutorAttemptedAssessments;     