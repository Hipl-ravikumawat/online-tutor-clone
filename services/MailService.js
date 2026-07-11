const MailTemplates = require("../_helper/MailTemplates");
const mail = require("../config/mail");
const globalHelper = require("../_helper/GlobalHelper");
const globalConstant = require("../_helper/GlobalConstants");
const { createNotification } = require("./NotificationService");
const { generateReceipt, attechInvoicePdf } = require("./attechmentService");
const path = require("path");
const ejs = require("ejs");
const moment = require("moment");
const User = require("../models/User");

async function sendInvoiceEmail(invoice, student_id, userDetail) {
  const familyData = await globalHelper.getFamiliesListForFamiliesInvoices([ student_id ]);
  let invoiceRecipients = familyData[0].contacts.filter(c => c.isInvoiceRecipient === true);
  const student = await User.findById(student_id).select("last_name");

  if (invoiceRecipients.length === 0) {
    invoiceRecipients = familyData[0]?.contacts || [];
  }

  const mailTemplate = await MailTemplates.invoiceEmail(invoice, invoiceRecipients, userDetail);
  if (!mailTemplate) return false;

  const receiptPath = await attechInvoicePdf(invoice._id.toString(), userDetail);
  const toEmail = invoiceRecipients[0]?.email || "";
  if (!toEmail) return false;


  const mailOptions = {
    from: process.env.APP_EMAIL,
    to: toEmail,
    subject: mailTemplate.subject,
    html: mailTemplate.message,
    attachments: [
        {
           filename: `Invoice-${student?.last_name}-${moment(new Date()).format('YYYY-MM-DD')}.pdf`,
           content: receiptPath,
        },
      ],
  };

  await mail.transporter.sendMail(mailOptions);
  return true;
}

async function sendInvoiceEmailToStaff(invoice, staff_id, userDetail) {
  const staff = await User.findById(staff_id).select("last_name, first_name");

  let invoiceRecipients = [];

  const mailTemplate = await MailTemplates.invoiceEmail(invoice, invoiceRecipients, userDetail);
  if (!mailTemplate) return false;

  const receiptPath = await attechInvoicePdf(invoice._id.toString(), userDetail);
  const toEmail = invoiceRecipients[0]?.email || "";
  if (!toEmail) return false;


  const mailOptions = {
    from: process.env.APP_EMAIL,
    to: toEmail,
    subject: mailTemplate.subject,
    html: mailTemplate.message,
    attachments: [
        {
           filename: `Invoice-${staff?.last_name}-${moment(new Date()).format('YYYY-MM-DD')}.pdf`,
           content: receiptPath,
        },
      ],
  };

  await mail.transporter.sendMail(mailOptions);
  return true;
}

async function sendTransactionEmail(transaction, user, email_recipient, cc_me_email) {
  const mailTemplate = await MailTemplates.paymentReceived(transaction, user.first_name);

   const receiptPath = await generateReceipt(transaction);
   const date = new Date(transaction.createdAt);
   const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  let mailResponse = null;
  if (mailTemplate) {
    const mailOptions = {
      from: process.env.APP_EMAIL,
      to: email_recipient,
      subject: mailTemplate.subject,
      html: mailTemplate.message,
       attachments: [
        {
           filename: `receipt_${transaction?.student_id?.first_name}_${formattedDate}.pdf`,
           content: receiptPath,
        },
      ],
    };

    if (cc_me_email && user.email) {
      mailOptions.cc = user.email;
    }

    mailResponse = mail.transporter.sendMail(mailOptions);
  }

  await createNotification({
    student_id: transaction.student_id,
    type: "Email",
    subject: mailTemplate?.subject || "Payment Notification",
    messageBody: mailTemplate?.message || "Thank you for your payment.",
    slug: "payment",
    cc_me_email,
    receiver: {
      name: `${user.first_name} ${user.last_name}`,
      email: email_recipient,
    },
    sender: {
      email: process.env.APP_EMAIL,
      name: "System",
    },
    status: mailResponse ? "sent" : "unsent",
    meta: { transactionId: transaction._id },
    sentAt: new Date(), 
  });

  return true;
}

async function sendStaffTransactionEmail(transaction, user, email_recipient, cc_me_email) {
  const mailTemplate = await MailTemplates.paymentReceived(transaction, user.first_name);

   const receiptPath = await generateReceipt(transaction);
   const date = new Date(transaction.createdAt);
   const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  let mailResponse = null;
  if (mailTemplate) {
    const mailOptions = {
      from: process.env.APP_EMAIL,
      to: email_recipient,
      subject: mailTemplate.subject,
      html: mailTemplate.message,
       attachments: [
        {
           filename: `receipt_${transaction?.tutor_id?.first_name}_${formattedDate}.pdf`,
           content: receiptPath,
        },
      ],
    };

    if (cc_me_email && user.email) {
      mailOptions.cc = user.email;
    }

    mailResponse = mail.transporter.sendMail(mailOptions);
  }

  await createNotification({
    tutor_id: transaction.tutor_id,
    type: "Email",
    subject: mailTemplate?.subject || "Payment Notification",
    messageBody: mailTemplate?.message || "Thank you for your payment.",
    slug: "payment",
    cc_me_email,
    receiver: {
      name: `${user.first_name} ${user.last_name}`,
      email: email_recipient,
    },
    sender: {
      email: process.env.APP_EMAIL,
      name: "System",
    },
    status: mailResponse ? "sent" : "unsent",
    meta: { transactionId: transaction._id },
    sentAt: new Date(), 
  });

  return true;
}

async function sendInvoiceOverdueReminderEmail(invoice, email_recipient, first_name=null, last_name=null, company_name=null) {
  const mailTemplate = await MailTemplates.fetchMailTemplates("invoice-reminder");
  const { subject, message } = mailTemplate;
  const formatted = moment(invoice.date).format("DD-MM-YYYY");

  const currency = globalConstant.currency;
  const formattedAmount = `${currency.symbol}${invoice.invoice_amount}`;
  const tutorName = `${invoice?.created_by?.first_name} ${invoice?.created_by?.last_name}`;
  const fromEmail = invoice?.created_by?.email;
  const subjectData = subject
    .replace(/%InvoiceDate%/g, formatted)
    .replace(/%LastName%/g, last_name);

  const receiverName = first_name ? (first_name+ +last_name) : company_name; 
  const bodyData = message
    .replace(/%FirstName%/g, first_name || company_name)
    .replace(/%InvoiceAmount%/g, formattedAmount)
    .replace(/%InvoiceDate%/g, formatted)
    .replace(/%TutorFirstName%/g, tutorName)
    .replace(/%BusinessName%/g, process.env.APP_NAME)
    .replace(/%InvoicePayURL%/g, "");

  const mailOptions = {
    from: fromEmail,
    to: email_recipient,
    subject: subjectData,
    html: bodyData,
  };

  const mailResponse = await mail.transporter.sendMail(mailOptions);
  
  await createNotification({
    student_id: invoice.student_id,
    type: "Email",
    subject: subjectData,
    messageBody: bodyData,
    slug: "invoice-reminder",
    cc_me_email: false,
    receiver: {
      name: `${receiverName}`,
      email: email_recipient,
    },
    sender: {
      email: process.env.APP_EMAIL,
      name: "System",
    },
    status: mailResponse ? "sent" : "unsent",
    meta: { invoiceId: invoice._id },
    sentAt: new Date(), 
  });

  return true;
}

async function sendAutomaticInvoiceSummaryEmail(todayDate,creatorName,invoiceDataArray,email_recipient){
  const templatePath = path.resolve(__dirname, "../views/mailer/autoInvoiceSummary.ejs");
  const businessName = process.env.APP_NAME;

  const html = await ejs.renderFile(templatePath, {
    todayDate,
    creatorName,
    invoiceDataArray,
    businessName,
  });

  const mailOptions = {
    from: process.env.APP_EMAIL,
    to: email_recipient,
    subject: `Automatic Invoice Summary - ${todayDate}`,
    html,
  };
  
  mailResponse = await mail.transporter.sendMail(mailOptions);

  return true;
}

async function sendStaffInvoiceNotification(invoice, action, tutorEmail, tutorName, adminUser, rejectionComment = null) {
    try {
        let mailTemplate;
        
        if (action === 'approved') {
            mailTemplate = await MailTemplates.invoiceApprovedNotification(invoice, tutorName, adminUser);
        } else {
            mailTemplate = await MailTemplates.invoiceRejectedNotification(invoice, tutorName, adminUser, rejectionComment);
        }
        
        if (!mailTemplate) {
            console.error('Mail template not found for action:', action);
            return false;
        }
        
        const mailOptions = {
            from: process.env.APP_EMAIL || 'superadmin@stagingpioneers.com',
            to: tutorEmail,
            subject: mailTemplate.subject,
            html: mailTemplate.message,
        };

        // Send email
        const mailResponse =  mail.transporter.sendMail(mailOptions);
        
        return true;
        
    } catch (error) {
        console.error(`Error sending ${action} email:`, error);
        return false;
    }
}

module.exports = {
  sendInvoiceEmail,
  sendTransactionEmail,
  sendInvoiceOverdueReminderEmail,
  sendAutomaticInvoiceSummaryEmail,
  sendInvoiceEmailToStaff,
  sendStaffTransactionEmail,
  sendStaffInvoiceNotification
};
