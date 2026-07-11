const mysqlOrm = require('mysql-orm');

const pointSystemSchema = new mysqlOrm.Schema(
  {
    attendingClassOnTime: {
      type: Number,
      required: true,
      default: 5,
      min: 1
    },
    askingQuestions: {
      type: Number,
      required: true,
      default: 10,
      min: 1
    },
    homeworkSubmission: {
      type: Number,
      required: true,
      default: 10,
      min: 1
    },
    participatingClassActivities: {
      type: Number,
      required: true,
      default: 5,
      min: 1
    },
    bonusPoints: {
      type: Number,
      required: true,
      default: 10,
      min: 1
    },
    assignmentGapDuration: {
      type: Number,
      required: true,
      default: 1, // week
      min: 1
    },
    redemptionGapDuration: {
      type: Number,
      required: true,
      default: 13, // week
      min: 1
    },
    pointAssignmentModificationPeriod: {
      type: Number,
      required: true,
      default: 5, // days
      min: 1
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const PointSystem = mysqlOrm.model("point_system", pointSystemSchema);
module.exports = PointSystem;