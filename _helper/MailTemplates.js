// Import required modules
const NotificationTemplate = require("../models/NotificationTemplate");
const globalConstant = require("./GlobalConstants");
const moment = require("moment");


// Define the MailTemplates class
class MailTemplates {
    // Constructor
    constructor() {}

    // Instance method for user sign-up
    async signUp(userData,resetLink) {
        try {
            // Fetch notification template from the database
            const notificationTemplates = await NotificationTemplate.find({slug:'portal-login-setup'});;
            // Extract subject and message from the fetched template
            let mailSubject = notificationTemplates[0].subject;
            let mailMessage = notificationTemplates[0].message;

            // Replace placeholders in the message template with actual values
            let messageTemplate = mailMessage;
            let name = userData.first_name + ' ' + userData.last_name;
            let appName = process.env.APP_NAME;
            let appUrl = process.env.APP_URL;
            messageTemplate = messageTemplate.replace(/%UserName%/g, name);
            messageTemplate = messageTemplate.replace(/%EmailAddress%/g, userData.email);
            messageTemplate = messageTemplate.replace(/%PasswordSetupURL%/g, `<a href="${resetLink}">${resetLink}</a>`);
            messageTemplate = messageTemplate.replace(/%URL%/g, `<a href="${appUrl}">${appUrl}</a>`);
            messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);

            return {message:messageTemplate, subject:mailSubject};
        } catch (error) {
            console.error(error);
            // Handle error appropriately
        }
    }
    async resetPassword(userData) {
        try {
            // Fetch notification template from the database
            const notificationTemplates = await NotificationTemplate.find({slug:'reset-password'});
            // Extract subject and message from the fetched template
            let mailSubject = notificationTemplates[0].subject;
            let mailMessage = notificationTemplates[0].message;

            // Replace placeholders in the message template with actual values
            let messageTemplate = mailMessage;
            let name = userData.userName?.trim() ? userData.userName : "User";
            let appName = process.env.APP_NAME;
            messageTemplate = messageTemplate.replace(/%UserName%/g, name);
            messageTemplate = messageTemplate.replace(/%ResetPasswordURL%/g, `<a href="${userData.resetLink}">Reset Link</a>`);
            messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);

            return {message:messageTemplate, subject:mailSubject};
        } catch (error) {
            console.error(error);
            // Handle error appropriately
        }
    }
    async  cancelEventRequestToAdmin(userData, link, eventDate, comment) {
        try {
            const notificationTemplates = await NotificationTemplate.find({slug: 'cancel-event-request-to-admin'});
            if (!notificationTemplates.length) {
                throw new Error('No notification template found for cancel-event-request-to-admin');
            }
            let template = notificationTemplates[0];
            if (!template.subject || !template.message) {
                throw new Error('Notification template is missing subject or message');
            }
            let appName = process.env.APP_NAME;
            let mailSubject = template.subject;
            let mailMessage = template.message;
            let userName = `${userData.first_name} ${userData.last_name}`;

            let subjectTemplate = mailSubject;
            subjectTemplate = subjectTemplate.replace(/%Date%/g, eventDate);
            // Replace placeholders in the message template with actual values
            let messageTemplate = mailMessage;
            messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);
            messageTemplate = messageTemplate.replace(/%TutorName%/g, userName);
            messageTemplate = messageTemplate.replace(/%Date%/g, eventDate);
            messageTemplate = messageTemplate.replace(/%Comment%/g, comment);
            messageTemplate = messageTemplate.replace(/%URL%/g, `<a href="${link}">click here</a>`);
            return {message: messageTemplate, subject: subjectTemplate};
        } catch (error) {
            console.error(error);
            // Return a default value or handle the error appropriately
            return {message: 'Error generating email template', subject: 'Error'};
        }
    }

    async cancelEventReplyToTutor(status,eventDate,tutorName){
        try{
            const notificationTemplates = await NotificationTemplate.find({ slug: 'cancel-event-reply-to-tutor' });
            let appName = process.env.APP_NAME;
            let mailSubject = notificationTemplates[0].subject;
            let mailMessage = notificationTemplates[0].message;
            // Replace placeholders in the message template with actual values

           let subjectTemplate = mailSubject;
           subjectTemplate = subjectTemplate.replace(/%Date%/g, eventDate);
           subjectTemplate = subjectTemplate.replace(/%Status%/g, status);

            let messageTemplate = mailMessage;
            messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);
            messageTemplate = messageTemplate.replace(/%Date%/g, eventDate);
            messageTemplate = messageTemplate.replace(/%Status%/g, status);
            messageTemplate = messageTemplate.replace(/%TutorName%/g, tutorName);

            return { message: messageTemplate, subject: subjectTemplate };

        } catch (error) {
            console.error(error);
            // Handle error appropriately
        }
    }
    async cancelEventNotifyToUser(date, tutorName) {
        try {
            const notificationTemplates = await NotificationTemplate.find({ slug: 'cancel-event-notification-to-user' });

            if (!notificationTemplates || notificationTemplates.length === 0) {
                throw new Error('No notification template found for cancel-event-notification-to-user');
            }
            const template = notificationTemplates[0];
            if (!template.subject || !template.message) {
                throw new Error('Notification template is missing subject or message');
            }
            const appName = process.env.APP_NAME;
            const mailSubject = template.subject;
            let mailMessage = template.message;
            // Replace placeholders in the message template with actual values
            
            let subjectTemplate = mailSubject;
            subjectTemplate = subjectTemplate.replace(/%Date%/g, date);

            mailMessage = mailMessage.replace(/%BusinessName%/g, appName);
            mailMessage = mailMessage.replace(/%TutorName%/g, tutorName);
            mailMessage = mailMessage.replace(/%Date%/g, date);
            return {message: mailMessage, subject: subjectTemplate};
        } catch (error) {
            console.error('Error in cancelEventNotifyToUser:', error.message);
            return { message: 'Error generating email template', subject: 'Error' };
        }
    }

    async paymentReceived(transaction, tutorFirstName="") {
        try {
            const currency = globalConstant.currency;

            const notificationTemplates = await NotificationTemplate.find({ slug: 'payment' });            

            if (!notificationTemplates || notificationTemplates.length === 0) {
                throw new Error("Payment email template not found");
            }

            let mailSubject = notificationTemplates[0].subject;
            let mailMessage = notificationTemplates[0].message;

            const userName = transaction.student_id?.first_name+" "+transaction.student_id?.last_name || "User";
            const firstName = transaction.student_id?.first_name || "User";
            const businessName = "PioneersLearningHub";
            const formattedDate = new Date(transaction.date).toLocaleDateString("en-IN");
            const formattedAmount = `${currency.symbol}${Number(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

            // Replace placeholders
            let messageTemplate = mailMessage;
            messageTemplate = messageTemplate.replace(/%UserName%/g, userName);
            messageTemplate = messageTemplate.replace(/%FirstName%/g, firstName);
            messageTemplate = messageTemplate.replace(/%Amount%/g, formattedAmount);
            messageTemplate = messageTemplate.replace(/%TutorFirstName%/g, tutorFirstName || '');
            messageTemplate = messageTemplate.replace(/%BusinessName%/g, businessName);
            messageTemplate = messageTemplate.replace(/%Date%/g, formattedDate);
            messageTemplate = messageTemplate.replace(/%Note%/g, transaction.note || "—");

            return {
                subject: mailSubject,
                message: messageTemplate,
            };
        } catch (err) {
            console.error("Email template error:", err);
            return {
                subject: "Payment Received",
                message: "Thank you for your payment.",
            };
        }
    };

async invoiceEmail(invoice,families,userDetail) {
  try {
    
    const notificationTemplates = await NotificationTemplate.find({ $or: [{slug: 'invoice-email'},{slug: 'invoice'}] });

    if (!notificationTemplates || notificationTemplates.length === 0) {
      throw new Error("Invoice email template not found");
    }

    let mailSubject = notificationTemplates[0].subject;
    let mailMessage = notificationTemplates[0].message;
    let appName = process.env.APP_NAME;
    let paymentUrl = process.env.PAYMENT_URL || '';
    // Use first family (optional: loop through all if needed)
    const family = families?.[0] || {};
    const userName = `${family.first_name || ''}`.trim() || "User";
    const subjectName = `${family.last_name || ''}  ${family.company_name || ''}`.trim();

    const yourName = `${userDetail?.first_name} ${userDetail?.last_name}`; // or get from logged-in user
    const formattedAmount = `${globalConstant.currency.symbol} ${Number(invoice.invoice_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const formattedDate = moment(invoice.date).format("DD-MM-YYYY");


    let subjectTemplate = mailSubject
    subjectTemplate = subjectTemplate.replace(/%InvoiceDate%/g, formattedDate);
    subjectTemplate = subjectTemplate.replace(/%LastName%/g, subjectName);

    let messageTemplate = mailMessage;
    messageTemplate = messageTemplate.replace(/%FirstName%/g, userName);
    messageTemplate = messageTemplate.replace(/%TutorFirstName%/g, yourName);
    messageTemplate = messageTemplate.replace(/%InvoiceAmount%/g, formattedAmount);
    messageTemplate = messageTemplate.replace(/%InvoiceDate%/g, formattedDate);
    messageTemplate = messageTemplate.replace(/%InvoicePayURL%/g, `<a href="${paymentUrl}">${paymentUrl}</a>`);
    messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);

    return {
      subject: subjectTemplate,
      message: messageTemplate,
    };
  } catch (err) {
    console.error("Email template error:", err);
    return {
      subject: "Invoice Ready",
      message: "Your invoice is ready. Please check the attachment.",
    };
  }
}

async invoiceEmailStaff(invoice,staffs,userDetail) {
  try {
    
    const notificationTemplates = await NotificationTemplate.find({ $or: [{slug: 'staff-invoice-email'},{slug: 'invoice'}] });

    if (!notificationTemplates || notificationTemplates.length === 0) {
      throw new Error("Invoice email template not found");
    }

    let mailSubject = notificationTemplates[0].subject;
    let mailMessage = notificationTemplates[0].message;
    let appName = process.env.APP_NAME;
    let paymentUrl = process.env.PAYMENT_URL || '';
    // Use first family (optional: loop through all if needed)
    const family = staffs?.[0] || {};
    const userName = `${family.first_name || ''}`.trim() || "User";
    const subjectName = `${family.last_name || ''}`.trim();

    const yourName = `${userDetail?.first_name} ${userDetail?.last_name}`; // or get from logged-in user
    const formattedAmount = `${globalConstant.currency.symbol} ${Number(invoice.invoice_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const formattedDate = moment(invoice.date).format("DD-MM-YYYY");


    let subjectTemplate = mailSubject
    subjectTemplate = subjectTemplate.replace(/%InvoiceDate%/g, formattedDate);
    subjectTemplate = subjectTemplate.replace(/%LastName%/g, subjectName);

    let messageTemplate = mailMessage;
    messageTemplate = messageTemplate.replace(/%FirstName%/g, userName);
    messageTemplate = messageTemplate.replace(/%TutorFirstName%/g, yourName);
    messageTemplate = messageTemplate.replace(/%InvoiceAmount%/g, formattedAmount);
    messageTemplate = messageTemplate.replace(/%InvoiceDate%/g, formattedDate);
    messageTemplate = messageTemplate.replace(/%InvoicePayURL%/g, `<a href="${paymentUrl}">${paymentUrl}</a>`);
    messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);

    return {
      subject: subjectTemplate,
      message: messageTemplate,
    };
  } catch (err) {
    console.error("Email template error:", err);
    return {
      subject: "Invoice Ready",
      message: "Your invoice is ready. Please check the attachment.",
    };
  }
}

async invoiceReminder(invoice,families) {
  try {
    const notificationTemplates = await NotificationTemplate.find({ slug: 'invoice-reminder' });

    if (!notificationTemplates || notificationTemplates.length === 0) {
      throw new Error("Invoice email template not found");
    }

    let mailSubject = notificationTemplates[0].subject;
    let mailMessage = notificationTemplates[0].message;

    // Use first family (optional: loop through all if needed)
    const family = families?.[0] || {};
    const userName = `${family.first_name || ''} ${family.last_name || ''} ${family.company_name || ''}`.trim() || "User";

    const yourName = "yogita prajapat"; // or get from logged-in user
    const formattedAmount = `₹ ${Number(invoice.balance_snapshot || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const formattedDate = new Date(invoice.invoice_date).toLocaleDateString("en-IN");
    const subjectName = `${family.last_name || ''}  ${family.company_name || ''}`.trim();

    let subjectTemplate = mailSubject
    subjectTemplate = subjectTemplate.replace(/%Date%/g, formattedDate);
    subjectTemplate = subjectTemplate.replace(/%LastName%/g, subjectName);

    let messageTemplate = mailMessage;
    messageTemplate = messageTemplate.replace(/%UserName%/g, userName);
    messageTemplate = messageTemplate.replace(/%ReceivedBy%/g, yourName);
    messageTemplate = messageTemplate.replace(/%Amount%/g, formattedAmount);
    messageTemplate = messageTemplate.replace(/%Date%/g, formattedDate);

    return {
      subject: subjectTemplate,
      message: messageTemplate,
    };
  } catch (err) {
    console.error("Email template error:", err);
    return {
      subject: "Invoice Ready",
      message: "Your invoice is ready. Please check the attachment.",
    };
  }
}
async fetchMailTemplates(slug) {
  try {
    const notificationTemplates = await NotificationTemplate.find({ slug: slug });

    if (!notificationTemplates || notificationTemplates.length === 0) {
      throw new Error("Invoice email template not found");
    }

    let mailSubject = notificationTemplates[0].subject;
    let mailMessage = notificationTemplates[0].message;

    return {
      subject: mailSubject,
      message: mailMessage,
    };
  }catch (err) {
    console.error("Email template error:", err);
    return {
      subject: "Invoice Ready",
      message: "Your invoice is ready. Please check the attachment.",
    };
  }
}

async invoiceApprovedNotification(invoice, tutorName, adminUser) {
    try {
        const notificationTemplates = await NotificationTemplate.find({ slug: 'staff-invoice-approved' });
        
        if (!notificationTemplates || notificationTemplates.length === 0) {
            throw new Error("Staff invoice email template not found");
        }

        let mailSubject = notificationTemplates[0].subject;
        let mailMessage = notificationTemplates[0].message;

        let subjectTemplate = mailSubject;
        subjectTemplate = subjectTemplate.replace(/%InvoiceNumber%/g, invoice.invoice_number || invoice._id);
        
        const appName = process.env.APP_NAME;
        const formattedAmount = `${globalConstant.currency.symbol} ${Number(invoice.amount || invoice.invoice_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
        const formattedDate = moment(invoice.approved_at || new Date()).format("DD-MM-YYYY");
        const adminName = `${adminUser?.first_name || ''} ${adminUser?.last_name || ''}`.trim() || "Administrator";

        // Replace placeholders
        let messageTemplate = mailMessage;
        messageTemplate = messageTemplate.replace(/%TutorName%/g, tutorName);
        messageTemplate = messageTemplate.replace(/%InvoiceNumber%/g, invoice.invoice_number || invoice._id);
        messageTemplate = messageTemplate.replace(/%InvoiceAmount%/g, formattedAmount);
        messageTemplate = messageTemplate.replace(/%ApprovedDate%/g, formattedDate);
        messageTemplate = messageTemplate.replace(/%AdminName%/g, adminName);
        messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);

        return {
            subject: subjectTemplate,
            message: messageTemplate
        };
    } catch (err) {
        throw new Error("Failed to generate invoice approval email template");
    }
}

async invoiceRejectedNotification(invoice, tutorName, adminUser, rejectionComment) {
    try {
        const notificationTemplates = await NotificationTemplate.find({ slug: 'staff-invoice-rejected' });
        
        if (!notificationTemplates || notificationTemplates.length === 0) {
            throw new Error("Staff invoice rejection email template not found");
        }

        let mailSubject = notificationTemplates[0].subject;
        let mailMessage = notificationTemplates[0].message;

        let subjectTemplate = mailSubject;
        subjectTemplate = subjectTemplate.replace(/%InvoiceNumber%/g, invoice.invoice_number || invoice._id);
        
        const appName = process.env.APP_NAME;
        const formattedAmount = `${globalConstant.currency.symbol} ${Number(invoice.amount || invoice.invoice_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
        const formattedDate = moment(invoice.rejected_at || new Date()).format("DD-MM-YYYY");
        const adminName = `${adminUser?.first_name || ''} ${adminUser?.last_name || ''}`.trim() || "Administrator";
        const reason = rejectionComment || invoice.status_comment || "No specific reason provided";

        // Replace placeholders
        let messageTemplate = mailMessage;
        messageTemplate = messageTemplate.replace(/%TutorName%/g, tutorName);
        messageTemplate = messageTemplate.replace(/%InvoiceNumber%/g, invoice.invoice_number || invoice._id);
        messageTemplate = messageTemplate.replace(/%InvoiceAmount%/g, formattedAmount);
        messageTemplate = messageTemplate.replace(/%RejectedDate%/g, formattedDate);
        messageTemplate = messageTemplate.replace(/%AdminName%/g, adminName);
        messageTemplate = messageTemplate.replace(/%RejectionReason%/g, reason);
        messageTemplate = messageTemplate.replace(/%BusinessName%/g, appName);

        return {
            subject: subjectTemplate,
            message: messageTemplate
        };
    } catch (err) {
        console.error("Email template error for invoice rejection:", err);
        throw new Error("Failed to generate invoice rejection email template");
    }
}

}

// Export an instance of the MailTemplates class
module.exports = new MailTemplates();
