const mysqlOrm = require('mysql-orm');

const PointTransactionSchema = new mysqlOrm.Schema(
    {
        receiverId: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        senderId: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "users",
            required: false,
        },
        transactionType: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0, "Transaction amount cannot be negative"],
        },
        pointHistoryId: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "point_history",
            required: false,
            default: null,
        },
        voucherHistoryId: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "vouchers",
            required: false,
            default: null,
        },
        comment: {
            type: String,
            required: false,
            default: "",
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

const PointTransaction = mysqlOrm.model("point_transactions", PointTransactionSchema);
module.exports = PointTransaction;
