const mysqlOrm = require('mysql-orm');

const studentAssessmentsSchema = new mysqlOrm.Schema({
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
    status: {
        type: String,
        default: 'N/A'
    },
    practice_score:{
        type: Array,
        default: [],
    },
    challenge_score:{
        type: Array,
        default: [],
    },
    final_score:{
        type: Number,
        default: 0
    },
    deleted_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });

const StudentAssessment = mysqlOrm.model('student_assessments', studentAssessmentsSchema);
module.exports = StudentAssessment;