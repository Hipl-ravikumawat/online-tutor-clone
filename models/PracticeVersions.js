const mysqlOrm = require('mysql-orm');
var slugify = require('slugify');
const {v4 : uuidv4} = require('uuid')

const slugify_options = {
    replacement: '-',  // replace spaces with replacement character, defaults to `-`
    remove: slugify(' ', { remove: /[`~!@#$%^&*()_\-+=\[\]{};:'"\\|\/,.<>?\s]/g }), // remove characters that match regex, defaults to `undefined`
    lower: true,       // convert to lower case, defaults to `false`
    strict: true,     // strip special characters except replacement, defaults to `false`
    locale: 'en',      // language code of the locale to use
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
}


const practiceVersionsSchema = new mysqlOrm.Schema({
    question_type: {
        type: String,
        default: null
    },
    question_title: {
        type: String,
        default: null
    },
    question: {
        type: String,
        default: null
    },
    question_slug: {
        type: String,
        default: null,
        caseInsensitive: true // Case-insensitive matching for the index
    },
    question_duration: {
        type: String,
        default: null
    },
    question_image: {
        type: String,
        default: null
    },
    question_audio: {
        type: String,
        default: null
    },
    question_explanation: {
        type: String,
        default: null
    },
    content_directory: {
        type: String,
        default: null
    },
    option_display_preference: {
        type: String,
        default: null
    },
    challenges_listing: {
        type: Boolean,
        default: false
    },
    options: [{
        option_image: {
            type: String,
            default: null
        },
        option_text: {
            type: String,
            default: null
        },
        option_correct: {
            type: Boolean,
            default: false
        }
    }],
    original_id:{
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'practices',
        required: true,
    },
    version_type:{
        type: String,
        default: 'assessment',
        enum: ['assessment', 'event']
    },
    position: {
        type: Number,
        default: null
    },
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


const getUniqueSlug = (value, valueList, index = 0) => {
    if (!valueList.length || valueList.indexOf(value) < 0) {
        return value;
    }
    if (valueList.indexOf(`${value}-${index + 1}`) < 0) {
        let indexing = parseInt(index) + 1;
        return `${value}-${indexing}`;
    }
    return getUniqueValue(value, valueList, index + 1);
}

practiceVersionsSchema.pre("save", async function (next) {
    this.question_slug = uuidv4();
    next();
});

practiceVersionsSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4()
    const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().question_title && userToUpdate.question_title!= this.getUpdate().question_title) {
        this.getUpdate().$set.question_slug = slugId;
    }
    next();
})

const Practice = mysqlOrm.model('practices_versions', practiceVersionsSchema);
module.exports = Practice;        