const NotificationTemplate = require("../models/NotificationTemplate");
const User = require("../models/User");
const globalConstant = require("./GlobalConstants");

class SmsTemplates {
  
    constructor() { }
    async paymentReceivedSMS(transaction) {
        try {
            const currency = globalConstant.currency;
            const slug = transaction?.type === "Payment" ? "payment" : "refund-issued";
            const type = "sms";
            const notificationTemplates = await NotificationTemplate.find({ slug ,type });

            if (!notificationTemplates || notificationTemplates.length === 0) {
                throw new Error("Payment SMS template not found");
            }

            let smsMessage = notificationTemplates[0]?.message;

           
            const businessName = "PioneersLearningHub";
            const formattedDate = new Date(transaction.date).toLocaleDateString("en-IN");
            const formattedAmount = `${currency.symbol}${Number(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

            // Replace placeholders
            
            smsMessage = smsMessage.replace(/%Amount%/g, formattedAmount);
            // smsMessage = smsMessage.replace(/%TutorFirstName%/g, tutorFirstName || "");
            smsMessage = smsMessage.replace(/%BusinessName%/g, businessName);
            smsMessage = smsMessage.replace(/%Date%/g, formattedDate);
            
            return smsMessage;
        } catch (err) {
            console.error("SMS template error:", err);
            return "Payment received. Thank you.";
        }
    };

    async invoiceSMS(invoice, families, userDetail) {
        try {
            const slug = 'invoice';
            const type = "sms";
            const notificationTemplates = await NotificationTemplate.find({ slug , type });

            if (!notificationTemplates || notificationTemplates.length === 0) {
                throw new Error("Invoice SMS template not found");
            }

            let smsMessage = notificationTemplates[0].message;

                const family = families?.[0] || {};

                const user = await User.findOne({ _id: family?.user_id }, { email: 1 });
                const email = user?.email || "";

                const formattedAmount = `${globalConstant.currency.symbol}${Number(invoice.total_payments || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
                const formattedDate = new Date(invoice.date).toLocaleDateString("en-IN");
                const businessName = process.env.APP_NAME;

                // Replace placeholders
                smsMessage = smsMessage.replace(/%Email%/g, email);
                smsMessage = smsMessage.replace(/%InvoiceAmount%/g, formattedAmount);
                smsMessage = smsMessage.replace(/%InvoiceDate%/g, formattedDate);
                smsMessage = smsMessage.replace(/%BusinessName%/g, businessName);

                return smsMessage;
        } catch (err) {
            console.error("SMS template error:", err);
            return "Invoice generated. Please check your account.";
        }
    };

    async invoiceReminderSMS(invoice, email, name=null) {
        try {
            const slug = 'invoice-reminder';
            const type = "sms";
            const notificationTemplates = await NotificationTemplate.find({ slug , type });

            if (!notificationTemplates || notificationTemplates.length === 0) {
                throw new Error("Invoice reminder SMS template not found");
            }

            let smsMessage = notificationTemplates[0].message;

            const formattedDate = new Date(invoice.invoice_date).toLocaleDateString("en-IN");
            const businessName = process.env.APP_NAME;

            // Replace placeholders
            smsMessage = smsMessage.replace(/%Email%/g, email);
            smsMessage = smsMessage.replace(/%InvoiceDate%/g, formattedDate);
            smsMessage = smsMessage.replace(/%BusinessName%/g, businessName);

            return smsMessage;
        } catch (err) {
            console.error("SMS template error:", err);
            return "Invoice generated. Please check your account.";
        }
    };

    async cancelEventApprovedSMS(event, families, tutorName) {
        try {
            const slug = 'event-cancellation-sms';
            const type = "sms";

            const notificationTemplates = await NotificationTemplate.find({slug,type});

            if (!notificationTemplates || notificationTemplates.length === 0) {
                throw new Error("Cancel event SMS template not found");
            }

            let smsMessage = notificationTemplates[0].message;

            const family = families?.[0] || {};

            const user = await User.findOne(
                { _id: family?.user_id },
                { email: 1 }
            );

            const email = user?.email || "";

            const businessName = process.env.APP_NAME;

            const formattedDate = new Date(event.start_time)
                .toLocaleDateString("en-IN");

            const formattedTime = new Date(event.start_time)
                .toLocaleTimeString("en-IN", {
                    hour: '2-digit',
                    minute: '2-digit'
                });

            // Replace placeholders
            smsMessage = smsMessage.replace(/%Email%/g, email);
            smsMessage = smsMessage.replace(/%TutorName%/g, tutorName || "Tutor");
            smsMessage = smsMessage.replace(/%EventDate%/g, formattedDate);
            smsMessage = smsMessage.replace(/%EventTime%/g, formattedTime);
            smsMessage = smsMessage.replace(/%BusinessName%/g, businessName);

            return smsMessage;

        } catch (err) {
            console.error("Cancel event SMS template error:", err);
            return "Your scheduled event has been cancelled.";
        }
    }

   
}
module.exports = new SmsTemplates();
