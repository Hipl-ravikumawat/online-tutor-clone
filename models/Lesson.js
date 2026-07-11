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


const lessonSchema = new mysqlOrm.Schema({
    title: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        unique: true,
        caseInsensitive: true // Case-insensitive matching for the index
    },
    slide_ids: [{
        type: 'ObjectId',
        ref: 'slides',
        default: null
    }],
    practice_ids: [{
        type: 'ObjectId',
        ref: 'practices',
        default: null
    }],
    challenge_ids: [{
        type: 'ObjectId',
        ref: 'challenges',
        default: null
    }], 
    position: {
        type: Number,
        default: null
    },
    deleted_at: {
        type: Date,
        default: null
    }
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


lessonSchema.pre("save", async function (next) {
    this.slug = uuidv4();
    next();
});


lessonSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4()
    const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
        this.getUpdate().$set.slug = slugId;
    }
    next();
})

const Lesson = mysqlOrm.model('lessons', lessonSchema);
module.exports = Lesson;        