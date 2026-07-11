const mysqlOrm = require('mysql-orm');

const StaffTransactionSchema = new mysqlOrm.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ['Payment', 'Refund', 'Charge', 'Discount']
        },
        tutor_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "users",
        },
        student_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "users",
            default: null
        },
        event_id: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "events",
            default: null
        },
        date: {
            type: Date,
            default: Date.now
        },
        payment_method: {
            type: String,
        },
        amount: {
            type: Number,
            required: true
        },
        note: {
            type: String,
            default: ""
        },
        send_receipt:{
            type: Boolean,
            default: null
        },
        email_recipient_id:{
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "users",
            default: null
        },
        email_recipient:{
            type: String,
            default: null
        },
        sms_recipient_id:{
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: "users",
            default: null
        },
        sms_recipient:{
            type: String,
            default: null
        },
        charge_type: {
            type: String,
            enum: ['lesson_charge']
        },
        invoices_id: [
            {
                id: { type: mysqlOrm.Schema.Types.ObjectId, ref: "invoices", default: null },
                paid_amount: { type: Number, default: null },
                amount: { type: Number, default: null },
            }
        ],
        charge_taxes: [
            {
                _id: mysqlOrm.Schema.Types.ObjectId,
                tax_name: String,
                tax_rate: Number
            }
        ],
        category: {
            kind: { type: String, enum: ["event"], required: false },
            refId: { type: mysqlOrm.Schema.Types.ObjectId, required: false }
        },
        recurring: {
            type: Boolean,
            default: false,
            required:false
        },
        recurring_info: [
            {
                frequency:{
                    type: String,
                    enum: ['daily', 'weekly','monthly','yearly'],
                    default: null
                },
                repeat_days:{
                    type: [String],
                    enum: ['sunday', 'monday','tuesday','wednesday','thursday','friday','saturday'],
                    default: null
                },
                recurring_montly_on: {
                    type: String,  // 'monthly_on_day', 'monthly_on_date'
                    required: false,
                },
                repeat_until:{
                    type: Date,
                    required: false,
                },
                repeat_indefinitely: {
                    type: Boolean, 
                    default: false, 
                    required: false,
                },
            },
        ],
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        deleted_at: {
            type: Date,
            default: null
        },
        created_by: {
            type: mysqlOrm.Schema.Types.ObjectId,
            ref: 'users' // Admin or staff who created it
        },
    }, {
    timestamps: true
});

const StaffTransaction = mysqlOrm.model("staff_transactions", StaffTransactionSchema);
module.exports = StaffTransaction;