const mysqlOrm = require('mysql-orm');

const tutorAssessmentsSchema = new mysqlOrm.Schema({
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
    status: {
        type: String,
        default: 'N/A'
    },
    slide_score:{
        type: Array,
        default: [],
    },
    practice_score:{
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

const TutorAssessments = mysqlOrm.model('tutor_assessments', tutorAssessmentsSchema);
module.exports = TutorAssessments;