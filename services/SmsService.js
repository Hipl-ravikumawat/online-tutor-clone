const SmsTemplates = require("../_helper/SmsTemplates");
const twilio = require("twilio");
const { createNotification } = require("./NotificationService");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send Transaction SMS
 * @param {Object} transaction - the payment/transaction object
 * @param {Object} user - logged-in user
 * @param {String} sms_recipient - recipient phone number
 *  @param {Object} student - student object
 */
async function sendTransactionSMS(transaction, user, sms_recipient) {
  try {
    if (!sms_recipient) throw new Error("SMS recipient not provided");

    const smsTemplate = await SmsTemplates.paymentReceivedSMS(transaction);
    if (!smsTemplate) throw new Error("No SMS template found");

    const smsResponse = await client.messages.create({
      body: smsTemplate,   
      from: process.env.TWILIO_FROM,
      to: sms_recipient,
    });

    await createNotification({
      student_id: transaction.student_id,
      type: "SMS",
      subject: smsTemplate?.subject || "Payment Notification",
      messageBody: smsTemplate?.message || "Thank you for your payment.",
      slug: "sms-template",
      receiver: { 
        phone: sms_recipient, 
        name: `${(transaction.student_id?.first_name || "")} ${(transaction.student_id?.last_name || "")}`.trim() || "User" 
      },
      sender: { 
        phone: process.env.TWILIO_FROM, 
        name: "System" 
      },
      status: smsResponse?.sid ? "sent" : "unsent",
      meta: { transactionId: transaction._id, twilioSid: smsResponse.sid },
      sentAt: new Date(),
    });

    return true;
  } catch (err) {
    console.error("SMS sending error:", err);
    return false;
  }
}

/**
 * Send Invoice SMS
 */

async function sendInvoiceSMS(invoice, families, userDetail, sms_recipient) {
  try {
    if (!sms_recipient) throw new Error("SMS recipient not provided");

    const smsTemplate = await SmsTemplates.invoiceSMS(invoice, families, userDetail);
    if (!smsTemplate) throw new Error("No SMS template found");

    const smsResponse = await client.messages.create({
      body: smsTemplate,
      from: process.env.TWILIO_FROM,
      to: sms_recipient,
    });

    const family = families?.[0] || {};

    await createNotification({
      student_id: invoice.student_id,
      type: "SMS",
      subject: smsTemplate?.subject || "Invoice Notification",
      messageBody: smsTemplate?.message,
      slug: "sms-invoice-template",
      receiver: {
        phone: sms_recipient,
        name: family.full_name || `${userDetail?.first_name || ""} ${userDetail?.last_name || ""}`.trim() || "User",
      },
      sender: { phone: process.env.TWILIO_FROM, name: "System" },
      status: smsResponse?.sid ? "sent" : "unsent",
      meta: { invoiceId: invoice._id, twilioSid: smsResponse.sid },
      sentAt: new Date(),
    });

    return true;
  } catch (err) {
    console.error("Invoice SMS sending error:", err);
    return false;
  }
}

async function sendInvoiceReminderSMS(invoice, email, families, sms_recipient) {
  try {
    if (!sms_recipient) throw new Error("SMS recipient not provided");

    const family = families?.[0] || {};
    const name =  family.full_name || `${userDetail?.first_name || ""} ${userDetail?.last_name || ""}`.trim() || "User";

    const smsTemplate = await SmsTemplates.invoiceReminderSMS(invoice, email, name);
    if (!smsTemplate) throw new Error("No SMS template found");

    const smsResponse = await client.messages.create({
      body: smsTemplate,
      from: process.env.TWILIO_FROM,
      to: sms_recipient,
    });


    await createNotification({
      student_id: invoice.student_id,
      type: "SMS",
      subject: smsTemplate?.subject || "Invoice Reminder Notification",
      messageBody: smsTemplate?.message,
      slug: "sms-invoice-reminder-template",
      receiver: {
        phone: sms_recipient,
        name: family.full_name || `${userDetail?.first_name || ""} ${userDetail?.last_name || ""}`.trim() || "User",
      },
      sender: { phone: process.env.TWILIO_FROM, name: "System" },
      status: smsResponse?.sid ? "sent" : "unsent",
      meta: { invoiceId: invoice._id, twilioSid: smsResponse.sid },
      sentAt: new Date(),
    });

    return true;
  } catch (err) {
    console.error("Invoice reminder SMS sending error:", err);
    return false;
  }
}

async function sendCancelEventSMS(event,families, phoneNumber, eventDate, tutorName) {
  try {
    if (!phoneNumber) {
      throw new Error("Phone number not provided");
    }

    const smsTemplate = await SmsTemplates.cancelEventApprovedSMS(
      event,
      families,
      tutorName
    );

    const matchedFamily = families.find(contact => {

    const numbers = [
      contact.mobile_number,
      contact.home_number,
      contact.work_number
    ];

    return numbers.some(num => {

      if (!num?.phone) return false;

      const fullNumber =
        `+${num.dial_code ?? ''}${num.phone}`.replace(/\s+/g, '');

      return fullNumber === phoneNumber;
    });
  });

    const receiverName =
      matchedFamily?.user_id?.first_name
        ? `${matchedFamily.user_id.first_name} ${matchedFamily.user_id.last_name || ''}`.trim()
        : 'Parent';

        const smsResponse = await client.messages.create({
          body: smsTemplate,
          from: process.env.TWILIO_FROM,
          to: phoneNumber,
        });

    await createNotification({
      student_id: event.student_ids?.[0] || null,
      type: "SMS",
      subject: "Event Cancelled",
      messageBody: smsTemplate,
      slug: "event-cancellation-sms",
      receiver: {
        phone: phoneNumber,
        name: receiverName,
      },
      sender: {
        phone: process.env.TWILIO_FROM,
        name: "System",
      },
      status: smsResponse?.sid ? "sent" : "unsent",
      meta: {
        eventId: event._id,
        twilioSid: smsResponse?.sid,
      },
      sentAt: new Date(),
    });

    return true;
  } catch (err) {
    console.error("Cancel event SMS sending error:", err);
    return false;
  }
}

module.exports = {sendInvoiceSMS, sendTransactionSMS, sendInvoiceReminderSMS, sendCancelEventSMS};
