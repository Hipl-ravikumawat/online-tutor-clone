const mysqlOrm = require('mysql-orm');
const TutorLeaveSchema = new mysqlOrm.Schema({
    start_date: {
        type: Date,
    required: true,
    },
    end_date: {
        type: Date,
        required: true,
    },
    note: {
        type: String,
        default: null,
    },
    tutor_id: {
        type: mysqlOrm.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    }, 
    isApproved: {
        type: String,
        default: '1',
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false,
    },
    deleted_at: {
        type: Date,
        default: null,
    }
},  {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

// auto-hide deleted records
TutorLeaveSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});


const TutorLeave = mysqlOrm.model('tutor_leaves', TutorLeaveSchema);
module.exports = TutorLeave;