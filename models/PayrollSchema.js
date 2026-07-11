const mysqlOrm = require('mysql-orm');

const PayrollSchema = new mysqlOrm.Schema({
  type: {
    type: String,
    enum: ['no_auto_calc', 'revenue_percentage', 'hourly_rate'],
    required: true,
    default: 'no_auto_calc',
  },
  // pay_rate_revenue_percentage: {
  //   type: Number,
  //   default: null,
  // },
  pay_rate_hourly_rate: {
    type: Number,
    default: null,
  },
  // payroll_credit_type: {
  //   type: String,
  //   enum: ['credit_issue_on_issued', 'credit_issue_on_used'],
  //   default: 'credit_issue_on_issued',
  // },
});

module.exports = PayrollSchema;