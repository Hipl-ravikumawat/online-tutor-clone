const mysqlOrm = require('mysql-orm');
const { transactionTypes } = require("../_helper/GlobalConstants");

const StaffInvoiceSchema = new mysqlOrm.Schema({
  tutor_id: {
    type: mysqlOrm.Schema.Types.ObjectId,
    ref: "users",
    required: true
  },
  // Embedded snapshot of transactions
  transactions: [
    {
      type: {
        type: String,
        enum: ["Payment", "Refund", "Charge", "Discount"],
        required: true
      },
      charge_taxes: [
          {
              _id: mysqlOrm.Schema.Types.ObjectId,
              tax_name: String,
              tax_rate: Number
          }
      ],
      date: { type: Date, required: true },
      amount: { type: Number, required: true },
      note: { type: String, default: "" },

      student_id: { type: mysqlOrm.Schema.Types.ObjectId, ref: "users" },
      event_id: { type: mysqlOrm.Schema.Types.ObjectId, ref: "events", default: null },
      category: {
        kind: { type: String, enum: ["charge", "event"], required: false },
        refId: { type: mysqlOrm.Schema.Types.ObjectId, required: false }
      }
    }
  ],
  skip_family_zero_invoice: { type: Boolean, default: null },
  invoice_number: { type: String, default: null },
  invoice_amount: { type: Number, default: 0 },
  paid_amount: { type: Number, default: null },
  created_by: { type: mysqlOrm.Schema.Types.ObjectId, ref: "users" },
  date: { type: Date, required: true },
  include_balance_type: {
    type: String,
    enum: ["charges", "balance"],
    required: true
  },
  category: [{ type: mysqlOrm.Schema.Types.ObjectId, ref: "charge_categories" }],
  previous_balance: { type: Number, default: 0 },
  total_payments: { type: Number, default: 0 },
  total_charges: { type: Number, default: 0 },
  date_range: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  due_date: { type: Date, default: null },
  display_type: {
    type: String,
    enum: ["normal", "condensed", "expanded"],
    required: true
  },
  footer_note: { type: String, default: null },
  private_note: { type: String, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  status_comment: { type: String, default: null },
  is_emailed: { type: Boolean, default: null },
  email_sent_at: { type: Date, default: null },
  is_archived: { type: Boolean, default: null },
  archived_at: { type: Date, default: null },
  archived_by: { type: mysqlOrm.Schema.Types.ObjectId, ref: "users", default: null },
  is_paid: { type: Boolean, default: null },
  paid_by: { type: mysqlOrm.Schema.Types.ObjectId, ref: "users", default: null },
  paid_at: { type: Date, default: null },
  is_void: { type: Boolean, default: null },
  voided_by: { type: mysqlOrm.Schema.Types.ObjectId, ref: "users", default: null },
  voided_at: { type: Date, default: null },
  isDeleted: { type: Boolean, required: true, default: false },
  deleted_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});


const StaffInvoices = mysqlOrm.model("staff_invoices", StaffInvoiceSchema);
module.exports = StaffInvoices;
