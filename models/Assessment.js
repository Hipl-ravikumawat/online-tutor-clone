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

const assessmentSchema = new mysqlOrm.Schema({
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
    apply_duration: {
        type: Boolean,
        required: true,
        default: false,
    },
    task_types: {
        type: Array,
        required: true,
        default: [],
    },
    tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    student_ids: [{
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }],
    student_assessment_ids: [{
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'student_assessments',
        default: [],
    }],
    status: {
        type: String,
        default: 'N/A',
    },
    date: {
        type: String,
        default: null,
    },
    // start_time: {
    //     type: String,
    //     default: null,
    // },
    // end_time: {
    //     type: String,
    //     default: null,
    // },
    content: [{
        learning_content_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: 'learningContents',
            required: true,
        },
        lessons: [{
            lesson_id: {
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'lessons',
                required: true,
            }, 
            practice_ids: [{
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'practices',
                default: [],
            }],
            challenges_ids: [{
                type: mysqlOrm.Schema.Types.ObjectId,
                ref: 'challenges',
                default: [],
            }],
        }],
    }],
    deleted_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });

assessmentSchema.pre("save", function (next) {
    this.slug = uuidv4();
    next();
});

// old version of pre hook for findOneAndUpdate, which does not work as intended because it does not handle updates that use $set operator
// assessmentSchema.pre('findOneAndUpdate', async function (next) {
// const slugId = uuidv4()
// const userToUpdate = await this.model.findOne(this.getQuery())
// if (this.getUpdate().name && userToUpdate.title != this.getUpdate().name) {
//     this.getUpdate().$set.slug = slugId;
//     next();
// }
// });

assessmentSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4();

    const assessmentToUpdate = await this.model.findOne(this.getQuery());

    const update = this.getUpdate();

    const newName = update.name || update.$set?.name;

    if (newName && assessmentToUpdate.name !== newName) {

        update.$set = update.$set || {};

        update.$set.slug = slugId;
    }

    next();
});

const Assessment = mysqlOrm.model('assessments', assessmentSchema);


module.exports = Assessment;