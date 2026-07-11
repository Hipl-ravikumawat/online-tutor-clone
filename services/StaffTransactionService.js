const mysqlOrm = require('mysql-orm');
const StaffTransaction = require("../models/StaffTransaction");
const StaffInvoices = require("../models/StaffInvoices");
const User = require("../models/User");
const BusinessSetting = require("../models/BusinessSetting");
const EventService = require("../services/EventService"); // new service
const mailService = require("./MailService");
const smsService = require("./SmsService");
const FamilyContact = require("../models/FamilyContacts");

function mergeDateWithCurrentTime(dateInput) {
  if (!dateInput) return new Date();

  const now = new Date();
  const d = new Date(dateInput); // accepts string or Date

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
}


/**
 * Save a transaction (Payment, Refund, Charge, Discount)
 * @param {Object} options 
 */
async function saveTransaction({
  user,
  type,
  student_id=null,
  tutor_id,
  payment_refund_amount=null,
  charges_discount_amount=null,
  event_id = null,
  note,
  payment_method,
  payment_date,
  discount_date,
  charge_type,
  charge_taxes,
  category,
  send_receipt,
  email_recipient,
  contact_user_id,
  cc_me_email,
  send_sms,
  sms_recipient,
  sms_contact_user_id,
  recurring,
  recurring_info,
  selected_invoices = [],
}) {
  try {
    // Pick date based on type
    const selectedDate = ["Payment", "Refund"].includes(type)
      ? payment_date
      : discount_date;
    
    // merge with current time instead of midnight
    const parsedDate = mergeDateWithCurrentTime(selectedDate);
    
    /* Payment / Refund */
    if ((type === 'Payment' || type === 'Refund') && payment_refund_amount) {
      let transaction = null;

      if (event_id) {
        // Check if transaction already exists
        transaction = await StaffTransaction.findOne({ event_id, tutor_id, student_id, type });
      }
      if (send_receipt && tutor_id) {
          const tutor = await User.findById(tutor_id, 'email').lean();
          email_recipient = tutor?.email || '';
      }    
      // console.log(email_recipient,'email_recipient');
      if (transaction) {
        // Update existing transaction
        transaction.set({
          payment_method,
          amount: payment_refund_amount,
          note,
          date: parsedDate,
          send_receipt,
          email_recipient,
          email_recipient_id: contact_user_id,
          sms_recipient,
          sms_recipient_id: sms_contact_user_id,
          updated_by: user?._id,
        });
      } else {
        // Create new transaction
        transaction = new StaffTransaction({
          type,
          student_id,
          tutor_id,
          event_id,
          payment_method,
          amount: payment_refund_amount,
          note,
          date: parsedDate,
          send_receipt,
          email_recipient,
          email_recipient_id: contact_user_id,
          sms_recipient,
          sms_recipient_id: sms_contact_user_id,
          created_by: user?._id,
        });
      }
      await transaction.save();
      transaction = await StaffTransaction.findById(transaction._id).populate("tutor_id", "first_name last_name createdAt").populate("created_by", "first_name last_name");

      // Attach invoices if provided
      if (selected_invoices.length > 0) {
        const invoiceData = await Promise.all(
          selected_invoices.map(async (inv) => {
            const invoice = await StaffInvoices.findById(mysqlOrm.Types.ObjectId(inv));
            if (invoice) {
              StaffInvoices.is_paid = 1;
              StaffInvoices.paid_amount = StaffInvoices.invoice_amount;
              await StaffInvoices.save();
              return {
                id: StaffInvoices._id,
                amount: StaffInvoices.invoice_amount,
                paid_amount: StaffInvoices.invoice_amount,
              };
            }
            return null;
          })
        );

        transaction.invoices_id = invoiceData.filter((d) => d !== null);
        await transaction.save();

        // Update invoices with transaction ID
        await StaffInvoices.updateMany(
          { _id: { $in: selected_invoices } },
          { $set: { transaction_id: transaction._id } }
        );
      }

      // Event integration
      if (event_id) {
        await EventService.linkTransaction(event_id, transaction._id);
        await EventService.markAsPaid(event_id); // Example: mark event paid
      }

      // Send receipt
      if (send_receipt == 1 && email_recipient) {
        await mailService.sendStaffTransactionEmail(transaction, user, email_recipient, cc_me_email);

      }
      return transaction;
    }

    /** -------------------
     * Charge / Discount
     * ------------------- */
    if (type === 'Charge' || type === 'Discount') {
      if(Array.isArray(tutor_id)){
        tutor_id = tutor_id.filter(Boolean);
      }
      
      const {
        frequency,
        repeat_days,
        // repeat_indefinitely,
        repeat_until,
        repeat
      } = recurring_info || {};

      // Get config-based limits (months)
      const DAILY_LIMIT = parseInt(process.env.RECUR_DAILY_LIMIT || 6);
      const WEEKLY_LIMIT = parseInt(process.env.RECUR_WEEKLY_LIMIT || 12);
      const MONTHLY_LIMIT = parseInt(process.env.RECUR_MONTHLY_LIMIT || 15);
      const YEARLY_LIMIT = parseInt(process.env.RECUR_YEARLY_LIMIT || 24);

      // Helper: get max repeat-until date based on frequency
      function getMaxAllowedDate(frequency) {
        const now = new Date();
        let maxDate = new Date(now);

        switch ((frequency || "").toLowerCase()) {
          case "daily":
            maxDate.setMonth(maxDate.getMonth() + DAILY_LIMIT);
            break;
          case "weekly":
            maxDate.setMonth(maxDate.getMonth() + WEEKLY_LIMIT);
            break;
          case "monthly":
            maxDate.setMonth(maxDate.getMonth() + MONTHLY_LIMIT);
            break;
          case "yearly":
            maxDate.setMonth(maxDate.getMonth() + YEARLY_LIMIT);
            break;
          default:
            maxDate.setMonth(maxDate.getMonth() + MONTHLY_LIMIT); // fallback
        }
        return maxDate;
      }

      let recurringInfo = [];
      if (recurring === '1' || recurring === true) {

        // Validate repeat_until date
        let finalRepeatUntil = repeat_until ? new Date(repeat_until) : null;
        const maxAllowed = getMaxAllowedDate(frequency);

        if (finalRepeatUntil && finalRepeatUntil > maxAllowed) {
          finalRepeatUntil = maxAllowed; // enforce limit
        }

        recurringInfo.push({
          frequency: frequency || null,
          repeat_days: Array.isArray(repeat_days) && repeat_days.length ? repeat_days : undefined,
          recurring_montly_on: ['monthly_on_day', 'monthly_on_date'].includes(repeat) ? repeat : undefined,
          repeat_until: finalRepeatUntil || undefined,
          // repeat_indefinitely: repeat_indefinitely === '1' || repeat_indefinitely === true,
        });
      }

      // Prepare taxes
      let chargeTaxes = [];
      if (Array.isArray(charge_taxes) && charge_taxes.length > 0) {
        const business = await BusinessSetting.findOne();
        const taxes = business?.sales_taxes || [];
        charge_taxes.forEach((charge_tax) => {
          const tax = taxes.find((t) => t._id.toString() === charge_tax.toString());
          if (tax) {
            chargeTaxes.push({
              _id: tax._id,
              tax_name: tax.tax_name,
              tax_rate: tax.tax_rate,
            });
          }
        });
      }

      let transaction = null;

      if (event_id) {
        transaction = await StaffTransaction.findOne({ event_id, tutor_id, student_id, type });
      }

      let categoryObj = undefined;

      if (typeof category === "string" && category.trim() !== "") {
        const [kind, refId] = category.split(":");

        // only assign if kind is valid
        if (["charge", "event"].includes(kind)) {
          categoryObj = { kind, refId: refId || undefined };
        }
      }
      
      if (transaction) {            
        // Update existing
        transaction.set({
          date: parsedDate,
          charge_type,
          amount:charges_discount_amount,
          note,
          charge_taxes: chargeTaxes,
          category: categoryObj,
          recurring: !!recurring,
          recurring_info: recurringInfo,
          updated_by: user?._id,
        });

        await transaction.save();
      } else {
        // Create new
        transaction = new StaffTransaction({
          type,
          student_id: student_id,
          tutor_id: tutor_id,
          event_id,
          date: parsedDate,
          charge_type,
          amount:charges_discount_amount,
          note,
          charge_taxes: chargeTaxes,
          category: categoryObj,
          recurring: !!recurring,
          recurring_info: recurringInfo,
          created_by: user?._id,
        });

        await transaction.save();
      }
      
      return transaction;
    }

    return null;
  } catch (error) {
    console.error("Transaction save error:", error);
    throw error;
  }
}

async function deleteTransaction({ event_id, tutor_id, type }) {
  const updates = { isDeleted: true, deleted_at: new Date() };

  const query = {
    event_id: mysqlOrm.Types.ObjectId.isValid(event_id) ? new mysqlOrm.Types.ObjectId(event_id) : event_id,
    type,
  };
  if (tutor_id) {
    query.tutor_id = mysqlOrm.Types.ObjectId.isValid(tutor_id) ? new mysqlOrm.Types.ObjectId(tutor_id) : tutor_id;
  }

  const deletedTransaction = await StaffTransaction.findOneAndUpdate(
    query,
    updates,
    { new: true }
  );

  return deletedTransaction;
}





module.exports = { saveTransaction, deleteTransaction };