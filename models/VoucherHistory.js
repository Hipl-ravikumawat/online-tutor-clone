const mysqlOrm = require('mysql-orm');
const { v4: uuidv4 } = require("uuid");

const VoucherHistorySchema = new mysqlOrm.Schema(
  {
    studentId: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    voucherId: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "vouchers",
      required: false,
    },
    voucherRequiredPoints: {
      type: Number,
      required: true, // Store points required at the time of redemption
      default: 0,
      min: 0
    },
    voucherEquivalentAmount: {
      type: Number,
      required: true, // Store equivalent amount at the time of redemption
      default: 0,
      min: 0
    },
    balanceBeforeDeduction: {
      type: Number,
      required: true,
      default: 0, // By default 0, & then the student's current points balance will be recorded only upon request approval.
      min: [0, "Balance cannot be negative"],
    },
    status: {
      type: String,
      required: true,
      default: "Pending",
      enum: ["Pending", "Approved", "Rejected"],
    },
    reason: {
      type: String,
      required: false,
      default: "" // By default, the field will be empty, and the admin's comment will be recorded only upon request rejection.
    },
    approvedBy: {
      type: mysqlOrm.Schema.Types.ObjectId,
      ref: "users",
      required: false,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);


VoucherHistorySchema.pre('save', async function (next) {
  try {
    const voucher = await mysqlOrm.model('vouchers').findById(this.voucherId);
    if (voucher) {
      this.voucherRequiredPoints = voucher.required_points;
      this.voucherEquivalentAmount = voucher.equivalent_amount;
    } else {
      console.warn(`Voucher with ID ${this.voucherId} not found.`);
    }

    // const stdPointsInfo = await mysqlOrm.model('points_balance').findOne({ userId: this.studentId });
    // if (stdPointsInfo) {
    //     this.balanceBeforeDeduction = stdPointsInfo.balance;
    // } else {
    //   console.warn(`Student with ID ${this.studentId} not found.`);
    // }

    next();
  } catch (error) {
    console.error("Error in VoucherHistory pre-save hook: ", error);
    next(error);
  }
});

const VoucherHistory = mysqlOrm.model("voucher_histories", VoucherHistorySchema);
module.exports = VoucherHistory;