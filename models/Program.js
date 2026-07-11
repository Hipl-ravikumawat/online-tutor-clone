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

const programSchema = new mysqlOrm.Schema({
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
    // student_ids: [{
    //     type: mysqlOrm.Schema.Types.ObjectId,
    //     ref: 'users',
    //     required: true,
    // }],
    // tutor_id: {
    //     type: mysqlOrm.Schema.Types.ObjectId,
    //     ref: 'users',
    //     required: true,
    // },
    status: {
        type: String,
        default: "N/A"
    },
    percentage: {
        type: Number,
        default: 0
    },
    deleted_at: {
        type: Date,
        default: null
    },
    ex_content: [{
        lesson_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: 'lessons',
            required: true,
        },
        learning_content_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: 'learningContents',
            required: true,
        },
        slides: {
            type: Array,
            default: [],
        },
        is_skipped: {
            type: Boolean,
            default: false,
        },
    }],
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });

programSchema.pre("save", function (next) {
    this.slug = uuidv4();
    next();
});

programSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4();
    const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().name && userToUpdate.name != this.getUpdate().name) {
        this.getUpdate().$set.slug = slugId;
    }
    next();
});

const Program = mysqlOrm.model('programs', programSchema);
module.exports = Program;