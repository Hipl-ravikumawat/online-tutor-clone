const mysqlOrm = require('mysql-orm');
const AttemptedAssessmentsSchema = new mysqlOrm.Schema({
    assessment_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'assessments',
        required: true,
    },
    student_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }, 
    lesson_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'lesson_versions',
        required: true,
    },
    challenge_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'challenges_versions',
        default: null,
    },
    answers: {
        type: Array,
        default: [],
    },
    assessment_type: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        default: 'N/A',
    },
    percentage: {
        type: String,
        default: '',
    },
    total_attempted_question: {
        type: Number,
        default: 0,
    },
    total_correct_answer: {
        type: Number,
        default: 0,
    },
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const AttemptedAssessment = mysqlOrm.model('attempted_assessments', AttemptedAssessmentsSchema);
module.exports = AttemptedAssessment;     