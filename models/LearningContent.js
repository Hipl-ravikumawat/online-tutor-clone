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

const learningContentSchema = new mysqlOrm.Schema({
    grade_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'grades',
        required: true,
    },
    topic_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'topics',
        required: true,
    },
    sub_topic_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'subTopics',
        default: null,
        transform: sub_topic_id => sub_topic_id == null ? '' : sub_topic_id
    },
    title: {
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
    short_description: {
        type: String,
        default: null,
    },
    content_directory: {
        type: String,
        trim: true,
        index: true,
        sparse: true
    },
    thumbnail: {
        type: String,
        default: null,
        transform: thumbnail => thumbnail == null ? '' : thumbnail
    },
    lesson_ids: [{
        type: 'ObjectId',
        ref: 'lessons',
        default: null
    }],
    status: {
        type: Number,
        default: 1
    },
    deleted_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


learningContentSchema.pre("save", function (next) {
    this.slug = uuidv4();
    next();
});
learningContentSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4();
    const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
        this.getUpdate().$set.slug = slugId;
    }
    next();
});
const LearningContent = mysqlOrm.model('learningContents', learningContentSchema);
module.exports = LearningContent;