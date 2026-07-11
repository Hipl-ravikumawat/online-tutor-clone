const mysqlOrm = require('mysql-orm');

const PointHistorySchema = new mysqlOrm.Schema(
  {
    tutorId: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      required: false,
    },
    studentId: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      required: false,
    },
    weekStart: {
      type: Date,
      required: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },
    pointsAssigned: {
      attendingClassOnTime: {
        marks: {
          type: Number,
          default: 0, // Tutor can leave it 0 or assign 5
          min: 0,
          required: false, // Marks can be left unassigned (0 means no marks given)
        },
        received_at: {
          type: Date,
        },
      },
      askingQuestions: {
        marks: {
          type: Number,
          default: 0, // Tutor can leave it 0 or assign 10
          min: 0,
          required: false, // Marks can be left unassigned (0 means no marks given)
        },
        received_at: {
          type: Date,
        },
      },
      homeworkSubmission: {
        marks: {
          type: Number,
          default: 0, // Tutor can leave it 0 or assign 10
          min: 0,
          required: false,
        },
        received_at: {
          type: Date,
        },
      },
      participatingClassActivities: {
        marks: {
          type: Number,
          default: 0, // Tutor can leave it 0 or assign 5
          min: 0,
          required: false,
        },
        received_at: {
          type: Date,
        },
      },
      bonusPoints: {
        marks: {
          type: Number,
          default: 0, // Tutor can leave it 0 or assign 10
          min: 0,
          required: false,
        },
        received_at: {
          type: Date,
        },
      },
    },
    totalPoints: {
      type: Number,
      required: true,
      min: 0
    },
    comment: {
      type: String,
      default: "",
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// PointHistorySchema.pre("save", function (next) {
//   const totalAssignedPoints =
//     (this.pointsAssigned.attendingClassOnTime.marks || 0) +
//     (this.pointsAssigned.askingQuestions.marks || 0) +
//     (this.pointsAssigned.homeworkSubmission.marks || 0) +
//     (this.pointsAssigned.participatingClassActivities.marks || 0) +
//     (this.pointsAssigned.bonusPoints.marks || 0);

//   if (totalAssignedPoints !== this.totalPoints) {
//     return next(new Error("Total points must match the sum of individual points."));
//   }
//   next();
// });

const PointHistory = mysqlOrm.model("point_history", PointHistorySchema);
module.exports = PointHistory;