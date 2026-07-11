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

const learningContentVersionsSchema = new mysqlOrm.Schema({
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
        unique: false,
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
    original_id:{
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'learningContents',
        required: true,
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
    version_type:{
        type: String,
        default: 'assessment',
        enum: ['assessment', 'event']
    },
    deleted_at: {
        type: Date,
        default: null
    }
},
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    });


learningContentVersionsSchema.pre("save", function (next) {
    this.slug = uuidv4();
    next();
});
learningContentVersionsSchema.pre('findOneAndUpdate', async function (next) {
    const slugId = uuidv4();
    const userToUpdate = await this.model.findOne(this.getQuery())
    if (this.getUpdate().title && userToUpdate.title != this.getUpdate().title) {
        this.getUpdate().$set.slug = slugId;
    }
    next();
});

const LearningContent = mysqlOrm.model('learning_content_versions', learningContentVersionsSchema);
module.exports = LearningContent;