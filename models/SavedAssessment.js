const mysqlOrm = require('mysql-orm');
const SavedAssessmentsSchema = new mysqlOrm.Schema({
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
        ref: 'lessons',
        required: true,
    },
    answers: {
        type: Array,
        default: [],
    },
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const SavedAssessments = mysqlOrm.model('saved_assessments', SavedAssessmentsSchema);
module.exports = SavedAssessments;    