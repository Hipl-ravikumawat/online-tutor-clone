const mysqlOrm = require('mysql-orm');
var slugify = require('slugify')
const {v4 : uuidv4} = require('uuid')

const slugify_options = {
    replacement: '-',  // replace spaces with replacement character, defaults to `-`
    remove: slugify(' ', { remove: /[`~!@#$%^&*()_\-+=\[\]{};:'"\\|\/,.<>?\s]/g }), // remove characters that match regex, defaults to `undefined`
    lower: true,       // convert to lower case, defaults to `false`
    strict: true,     // strip special characters except replacement, defaults to `false`
    locale: 'en',      // language code of the locale to use
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
}

const tutorTrainingAssessmentSchema = new mysqlOrm.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
        caseInsensitive: true // Case-insensitive matching for the index
    },
    slug: {
        type: String,
        unique: true,
        caseInsensitive: true // Case-insensitive matching for the index
    },
    tutor_ids: [{
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }],
    tutor_assessment_ids: [{
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'tutor_assessments',
        default: [],
    }],
    status: {
        type: String,
        default: 'N/A' // N/A, Processing, Completed
    },
    deleted_at: {
        type: Date,
        default: null
    },
    original_content: [{
        lessons: [{
            lesson_id: {
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'tutor_training_lessons',
                required: true,
            },
            slide_ids: [{
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'tutor_training_slides',
                default: [],
            }], 
            practice_ids: [{
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'tutor_training_practices',
                default: [],
            }],
        }],
        training_content_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: 'tutor_training_contents',
            required: true,
        },
    }],
    content: [{
        lessons: [{
            lesson_id: {
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'tutor_training_version_lessons',
                required: true,
            },
            slide_ids: [{
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'tutor_training_version_slides',
                default: [],
            }], 
            practice_ids: [{
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'tutor_training_version_practices',
                default: [],
            }],
        }],
        training_content_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: 'tutor_training_version_contents',
            required: true,
        },
    }],
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });

tutorTrainingAssessmentSchema.pre("save", function (next) {
    this.slug = uuidv4();
    next();
});

tutorTrainingAssessmentSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4();
    const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().name && userToUpdate.name != this.getUpdate().name) {
        this.getUpdate().$set.slug = slugId;
    }
    next();
});

const TutorTrainingAssessment = mysqlOrm.model('tutor_training_assessments', tutorTrainingAssessmentSchema);
module.exports = TutorTrainingAssessment;