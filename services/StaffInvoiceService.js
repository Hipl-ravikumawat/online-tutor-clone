const mysqlOrm = require('mysql-orm');
const moment = require("moment");
const StaffInvoice = require("../models/StaffInvoices");
const StaffTransaction = require("../models/StaffTransaction");
const globalHelper = require("../_helper/GlobalHelper");
const mailService = require("./MailService");
const smsService = require("./SmsService");
const UserService = require("./UserService");


class StaffInvoiceService {

  static async mergeDateWithCurrentTime(dateInput) {
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

  static async getInvoiceAmountWithinDateRange(staff_id, date_range, includeType, categoryIds = [], isCron = false) {
    // Parse date range string: "DD-MM-YYYY - DD-MM-YYYY"
    const [rawStart, rawEnd] = date_range.split(" - ");

    // Parse in UTC to avoid shifting
    const start_date = moment.utc(rawStart, "DD-MM-YYYY").startOf("day").toDate();
    const end_date   = moment.utc(rawEnd, "DD-MM-YYYY").endOf("day").toDate();

    let transactions = [];
    let totalCharges = 0, totalDiscounts = 0, totalPayments = 0, totalRefunds = 0;
    let chargesNet   = 0;
    let paymentsNet   = 0;
    let previousBalance = 0;
    let totalDue   = 0;
    let isPaid          = false;
    
    const studentBalTillStartDate = await globalHelper.getBalanceDetailsOfStaff(staff_id,start_date);
    const studentBalance = await UserService.getStaffBalance([staff_id])[0]?.balance || 0;

    // Get recurring charges and generate their instances
    const recurringTransactions = await this.getRecurringTransactionsInDateRange(
        staff_id, 
        start_date, 
        end_date
    );

    if (includeType === "charges") {
        // Get regular charges and discounts
        const regularTransactions = await StaffTransaction.aggregate([
            {
                $match: {
                    tutor_id: mysqlOrm.Types.ObjectId(staff_id),
                    type: { $in: ["Charge", "Discount"] },
                    date: { $gte: start_date, $lte: end_date },
                    isDeleted: false,
                    recurring: false
                }
            }
        ]);

        // Combine regular transactions with recurring instances
        transactions = [...regularTransactions, ...recurringTransactions];

        transactions.forEach(txn => {
            if (txn.type === "Charge")   totalCharges += txn.amount;
            if (txn.type === "Discount") totalDiscounts += txn.amount;
        });

        chargesNet = totalCharges - totalDiscounts;
        totalDue = chargesNet;

        if(totalDue < 0 && studentBalance > 0){
            isPaid = true;
        }

    } else if (includeType === "balance") {
        // Get all regular transactions
        const regularTransactions = await StaffTransaction.aggregate([
            {
                $match: {
                    tutor_id: mysqlOrm.Types.ObjectId(staff_id),
                    type: { $in: ["Charge", "Discount", "Payment", "Refund"] },
                    date: { $gte: start_date, $lte: end_date },
                    isDeleted: false,
                    recurring: false
                }
            }
        ]);

        // Combine regular transactions with recurring instances
        transactions = [...regularTransactions, ...recurringTransactions];

        // Current range totals
        transactions.forEach(txn => {
            if (txn.type === "Charge")   totalCharges += txn.amount;
            if (txn.type === "Discount") totalDiscounts += txn.amount;
            if (txn.type === "Payment")  totalPayments += txn.amount;
            if (txn.type === "Refund")   totalRefunds += txn.amount;
        });

        chargesNet = totalCharges - totalDiscounts;
        paymentsNet = totalPayments - totalRefunds;
        
        // Get previous transactions before start_date
        const prevTxns = await StaffTransaction.aggregate([
            {
                $match: {
                    tutor_id: mysqlOrm.Types.ObjectId(staff_id),
                    type: { $in: ["Charge", "Discount", "Payment", "Refund"] },
                    date: { $lt: start_date },
                    isDeleted: false
                }
            }
        ]);

        previousBalance = studentBalTillStartDate > 0 ? studentBalTillStartDate : 0;
        if(previousBalance){
            totalDue = (chargesNet - previousBalance) - paymentsNet;        
        }else if(paymentsNet){
            totalDue = paymentsNet - chargesNet;        
        }
        if(totalDue <= 0){
            totalDue = 0;
        }

        if (totalDue <= 0 && studentBalance > totalDue) {
            isPaid = true;
        }
    }

    return {
        transactions,
        totalCharges,
        totalDiscounts,
        chargesNet,
        previousBalance,
        totalPayments: paymentsNet,
        totalRefunds,
        totalDue,
        isPaid
    };
}


/**
 * Get recurring transactions and generate their instances for the date range
 */
static async getRecurringTransactionsInDateRange(staffId, startDate, endDate) {
    const recurringInstances = [];
    
    // Find all recurring charges AND discounts for this student
    const recurringTransactions = await StaffTransaction.find({
        tutor_id: staffId,
        type: { $in: ["Charge", "Discount"] }, // Include both types
        recurring: true,
        isDeleted: false
    }).populate('recurring_info');

    for (const transaction of recurringTransactions) {
        const instances = await this.generateRecurringInstances(transaction, startDate, endDate);
        recurringInstances.push(...instances);
    }

    return recurringInstances;
}


static async generateRecurringInstances(transaction, startDate, endDate) {
    const instances = [];
    
    if (!transaction.recurring_info || transaction.recurring_info.length === 0) {
        return instances;
    }

    const recurringInfo = transaction.recurring_info[0];
    const transactionDate = new Date(transaction.date);
    
    // Ensure dates are valid
    if (isNaN(transactionDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid dates in generateRecurringInstances');
        return instances;
    }

    let currentDate = new Date(Math.max(transactionDate.getTime(), startDate.getTime()));

    while (currentDate <= endDate) {
        // Check if we should stop based on repeat_until
        if (!recurringInfo.repeat_indefinitely) {
            if (recurringInfo.repeat_until && currentDate > new Date(recurringInfo.repeat_until)) {
                break;
            }
        }
        
        // Check if current day matches the recurring pattern
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // For daily frequency, include all days
        // For weekly frequency, check if current day is in repeat_days
        let shouldInclude = false;
        if (recurringInfo.frequency === 'daily') {
            shouldInclude = true;
        } else if (recurringInfo.frequency === 'weekly' && recurringInfo.repeat_days) {
            shouldInclude = recurringInfo.repeat_days.includes(dayName);
        } else if (recurringInfo.frequency === 'monthly') {
            // For monthly, check if it's the same day of month as original transaction
            shouldInclude = currentDate.getDate() === transactionDate.getDate();
        } else if (recurringInfo.frequency === 'yearly') {
            // For yearly, check if it's the same month and day as original transaction
            shouldInclude = currentDate.getMonth() === transactionDate.getMonth() && 
                           currentDate.getDate() === transactionDate.getDate();
        }
        
        if (shouldInclude) {
            // Create a transaction instance for this recurring occurrence
            const instance = {
                ...transaction.toObject(),
                _id: new mysqlOrm.Types.ObjectId(), // New ID for this instance
                date: new Date(currentDate),
                is_recurring_instance: true,
                parent_recurring_id: transaction._id,
                original_transaction_id: transaction._id,
                note: transaction.note ? `${transaction.note} (Recurring)` : `Recurring ${transaction.type.toLowerCase()}`
            };
            
            // Remove the recurring info from the instance since it's already processed
            delete instance.recurring_info;
            delete instance.recurring;
            
            instances.push(instance);
        }

        // Move to next period based on frequency
        switch (recurringInfo.frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1);
                break;
            default:
                currentDate.setDate(currentDate.getDate() + 1); // Default to daily
        }
    }

    return instances;
}   
  /**
   * Create invoices for staff
   */
  static async createInvoices({
    tutor_id,
    skip_staff_zero_invoice=0,
    invoice_date,
    include_type,
    date_range,
    category,
    start_date,
    end_date,
    due_date,
    display_type,
    footer_note,
    private_note_text,
    send_email,
    send_sms,
    voidOld,
    userDetail,
    invoiceAmt=null,
    isCron=false,
}) {
    const parsedDate = await this.mergeDateWithCurrentTime(invoice_date);

    const parsedStartDate = start_date
        ? moment(start_date, ['YYYY-MM-DD', 'DD-MM-YYYY']).toDate()
        : new Date();

    const parsedEndDate = end_date
        ? moment(end_date, ['YYYY-MM-DD', 'DD-MM-YYYY']).toDate()
        : new Date();

    const parsedDueDate = due_date
        ? moment(due_date, ['YYYY-MM-DD', 'DD-MM-YYYY']).toDate()
        : new Date();
        
    // const parsedStartDate = start_date ? new Date(start_date) : new Date();
    // const parsedEndDate = end_date ? new Date(end_date) : new Date();
    // const parsedDueDate = due_date ? new Date(due_date) : null;

    const invoiceStatus = userDetail?.role == 1 ? 'approved' : 'pending';
    for (const staff_id of [tutor_id]) {
        // Void old invoices
        if (voidOld) {
            await StaffInvoice.updateMany(
            {
                tutor_id: staff_id,
                "date_range.start": { $lte: parsedEndDate },
                "date_range.end": { $gte: parsedStartDate },
                is_paid: { $ne: 1 },
                is_void: { $ne: true },
            },
            {
                $set: {
                    is_void: true,
                    voided_by: userDetail?._id,
                    voided_at: new Date(),
                },
            }
            );
        }

        let invoiceAmount = 0;
        const { transactions, chargesNet, totalPayments, totalDue, isPaid, previousBalance } = 
        await this.getInvoiceAmountWithinDateRange(staff_id, date_range, include_type, category, isCron);
        
        if(invoiceAmt != null){
            invoiceAmount = invoiceAmt;
        }else{
            if (include_type === "charges") {
                invoiceAmount = Math.abs(chargesNet) || 0;
            }else if(include_type === "balance"){
                invoiceAmount = Math.abs(totalDue) || 0;
            }
        }

        if(skip_staff_zero_invoice == "1" && invoiceAmount == 0){      
            continue;
        }
        
        // Generate invoice number
        const invoiceNumber = await globalHelper.generateInvoiceNumber();
        
        const invoice = new StaffInvoice({
            tutor_id:staff_id,
            skip_staff_zero_invoice: skip_staff_zero_invoice === '1',
            invoice_number: invoiceNumber,
            invoice_amount: invoiceAmount,
            date: parsedDate,
            include_balance_type: include_type,
            category: mysqlOrm.Types.ObjectId.isValid(category) ? category : null,
            date_range: { start: parsedStartDate, end: parsedEndDate },
            due_date: parsedDueDate,
            transactions,
            total_payments: totalPayments, 
            previous_balance: previousBalance,
            total_charges: chargesNet,
            display_type,
            footer_note,
            private_note: private_note_text,
            created_by: userDetail?._id,
            status: invoiceStatus
        });

        if(invoiceAmount == 0 || isPaid){
            invoice.is_paid = 1;
        }
        await invoice.save();

        // Update recurring transactions with invoice reference
        await this.updateRecurringTransactionsWithInvoice(transactions, invoice._id);

        // Send email if requested
        if (send_email == 1) {
            await mailService.sendInvoiceEmailToStaff(invoice, staff_id, userDetail);
            invoice.email_sent_at = new Date();
        }

        // if (student_id) {
        //     const familyContacts = await FamilyContact.find({
        //         student_id: student_id,                
        //         preferred_invoice_recipient: true       
        //     });

        //     if (familyContacts?.length > 0) {
        //         for (const family of familyContacts) {
        //         // Collect all numbers that are sms_capable
        //         const numbersToSend = [];

        //         const phoneFields = ["mobile_number", "home_number", "work_number"];
        //         for (const field of phoneFields) {
        //             const phoneObj = family?.[field];
        //             if (phoneObj?.sms_capable && phoneObj?.dial_code && phoneObj?.phone) {
        //             numbersToSend.push(`+${phoneObj.dial_code}${phoneObj.phone}`);
        //             }
        //         }

        //         // Send SMS to all enabled numbers
        //         for (const smsRecipient of numbersToSend) {
        //             await smsService.sendInvoiceSMS(invoice, [family], userDetail, smsRecipient);
        //         }
        //         }
        //     }
        // }

    }
    return {
        message: "Invoice created successfully.",
    };
}

/**
 * Update recurring transactions with invoice reference
 */
static async updateRecurringTransactionsWithInvoice(transactions, invoiceId) {
    for (const transaction of transactions) {
        if (transaction.is_recurring_instance && transaction.parent_recurring_id) {
            await StaffTransaction.findByIdAndUpdate(
                transaction.parent_recurring_id,
                { 
                    $addToSet: { invoices_id: invoiceId },
                    $set: { updatedAt: new Date() }
                }
            );
        }
    }
}
  static async updateInvoices(ids, updateData) {
    return await StaffInvoice.updateMany(
      { _id: { $in: ids } },   // match invoices in array
      { $set: updateData }     // apply updates
    );
  }

  /**
   * Check if invoices already exist for given families in a date range
   */
  static async checkExistingInvoices({ tutor_id, date_range }) {
    if (!date_range || !tutor_id) {
      throw new Error("Missing parameters");
    }
   
    const [rawStart, rawEnd] = date_range.split(" - ");
    const start_date = new Date(rawStart.split("-").reverse().join("-"));
    const end_date = new Date(rawEnd.split("-").reverse().join("-"));
    
    const existingInvoices = await StaffInvoice.countDocuments({
      tutor_id: { $in: [tutor_id] },
      $or: [
        {
          "date_range.start": { $lte: end_date },
          "date_range.end": { $gte: start_date },
        },
      ],
    });
    
    return existingInvoices;
  }
  
  static async shouldGenerateInvoice(autoDoc) {
    const { studentId, invoiceDetails, preferences, lastProcessed } = autoDoc;
    const today = moment().startOf("day");

    // Prevent duplicate on same day
    if (lastProcessed && moment(lastProcessed).isSame(today, "day")) {
      return null;
    }

    let shouldGenerate = false;
    
    // === Invoice Creation Rules ===
    if (invoiceDetails.invoiceCreationDate?.option === "first_day_of_billing_cycle") {
      shouldGenerate = today.date() === moment(invoiceDetails.billingCycleStartDate).date();
    } else if (invoiceDetails.invoiceCreationDate?.option === "choose_date") {
      if (invoiceDetails.invoiceCreationDate.customDate) {
        shouldGenerate = today.isSame(moment(invoiceDetails.invoiceCreationDate.customDate), "day");
      }
    }
    return shouldGenerate;
  }

  // Inside InvoiceService class
  static async autoGenerateInvoiceIfEnabled(autoDoc, userDetail) {
    if (!autoDoc?.invoiceDetails) return null;
    
    const { studentId, invoiceDetails, preferences, lastProcessed } = autoDoc;
    const today = moment().startOf("day");
    
    // Prevent duplicate run same day
    if (lastProcessed && moment(lastProcessed).isSame(today, "day")) {
      return null;
    }

    // Check billing cycle
    const shouldGenerate = await this.shouldGenerateInvoice(autoDoc);
    
    if (!shouldGenerate) return null;

    // Build date range using helper
    const cycleRange = await globalHelper.getBillingCycleRange(
      invoiceDetails.billingCycleStartDate,
      invoiceDetails.autoInvoicingSchedule?.frequency,
      invoiceDetails.autoInvoicingSchedule?.repeatsEvery
    );
    
    const start_date = moment(cycleRange[0], "DD-MM-YYYY").toDate();
    const end_date   = moment(cycleRange[1], "DD-MM-YYYY").toDate();
    
    const date_range = `${moment(start_date).format("DD-MM-YYYY")} - ${moment(end_date).format("DD-MM-YYYY")}`;

    // Due date
    let due_date = null;
    const dueSetup = invoiceDetails.dueDateSetup || {};
    if (dueSetup.option === "choose_date" && dueSetup.customDate) {
      due_date = new Date(dueSetup.customDate);
    } else if (dueSetup.daysAfterInvoiceDate) {
      due_date = today.clone().add(dueSetup.daysAfterInvoiceDate, "days").toDate();
    }

    // Invoice type mapping
    let include_type = "balance";
    if (invoiceDetails.invoiceFor?.includes("upcoming_lessons")) {
      include_type = "charges";
    } 
    
    // === Create Invoice ===
    const invoice = await this.createInvoices({
      families: [studentId._id],
      skip_family_zero_invoice: preferences?.zeroBalanceHandling === "skip_invoice" ? 1 : 0,
      invoice_date: today.toDate(),
      include_type,
      date_range,
      start_date,
      end_date,
      due_date,
      display_type: preferences?.displayStyle || "normal",
      footer_note: preferences?.footerNote || "",
      private_note_text: "",
      send_email: preferences?.autoEmail ? 1 : 0,
      send_sms: 0,
      voidOld: false,
      userDetail,
    });
    
    return invoice;
  }


  static async sendInvoiceSummaryEmail(autoDocs, creator) {
    const invoiceDataArray = [];

    for (const autoDoc of autoDocs) {
      const { studentId, invoiceDetails } = autoDoc;
      const balance = await UserService.getStudentBalance(studentId);

      if (balance < 0) {
        const row = await globalHelper.buildInvoiceRow(studentId, balance, invoiceDetails);
        invoiceDataArray.push(row);
      }
    }

    if (invoiceDataArray.length === 0) {
      console.log("No invoices to include in summary");
      return;
    }

    const todayDate = moment().format("DD-MM-YYYY");

    await mailService.sendAutomaticInvoiceSummaryEmail(
      todayDate,
      creator?.first_name || "System",
      invoiceDataArray,
      creator?.email
    );

    console.log(`Invoice summary email sent to ${creator?.email}`);
  }


}

module.exports = StaffInvoiceService;
