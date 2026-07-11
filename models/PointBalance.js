const mysqlOrm = require('mysql-orm');

const PointBalanceSchema = new mysqlOrm.Schema(
  {
    userId: {
      type: mysqlOrm.Schema.Types.ObjectId, // student
      ref: "users",
      required: false,

    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const PointBalance = mysqlOrm.model("points_balance", PointBalanceSchema);
module.exports = PointBalance;