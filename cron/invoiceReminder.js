const cron = require("node-cron");
const { getInvoiceRecipients } = require("../_helper/GlobalHelper");
const Invoices = require("../models/Invoice");
const BusinessSetting = require('../models/BusinessSetting');
const FamilyContact = require('../models/FamilyContacts');
const MailService = require("../services/MailService");
const SmsService = require("../services/SmsService");

let currentTask = null; 

async function sendInvoiceReminder() {
  try {
    const businessSetting = await BusinessSetting.find({}).select("invoice_settings");
    const invoiceSettings = businessSetting[0]?.invoice_settings?.[0] ?? null;

    if (!invoiceSettings) {
      console.log("No invoice settings found");
      return;
    }

    const notificationsReminders = invoiceSettings.notifications_reminders || [];
    const overDueReminder = invoiceSettings.overdue_reminder_day ?? null;

    // === Overdue reminders
    if (notificationsReminders.includes("2") && overDueReminder != null) {
        const days = parseInt(overDueReminder, 10);

        const invoices = await Invoices.find({
            is_paid: { $ne: true },
            is_void: { $ne: true },
            due_date: { $lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        })
        .populate("created_by", "first_name last_name email")
        .lean();

      for (let data of invoices) {
        const studentId = data.student_id.toString();
        const invoiceRecipients = await getInvoiceRecipients([studentId]);
        const { email, first_name, last_name, company_name } = invoiceRecipients[0].recipient;

        if(email){
            const response = await MailService.sendInvoiceOverdueReminderEmail(data, email, first_name, last_name, company_name);

            console.log(`Reminder prepared for ${email}`);

            if (notificationsReminders.includes("1")) {
                const familyContacts = await FamilyContact.find({
                    student_id: studentId,                
                    preferred_invoice_recipient: true       
                });
        
                if (familyContacts?.length > 0) {
                    for (const family of familyContacts) {
                        let smsRecipient = null;
                        if(family?.mobile_number?.sms_capable){
                            smsRecipient = `+${family?.mobile_number?.dial_code}${family?.mobile_number?.phone}`;
                        }
            
                        if (smsRecipient) {
                            await SmsService.sendInvoiceReminderSMS(data, email, [family], smsRecipient);
                        }
                    }
                }
            }
        }
      }
    } else {
      console.log("Cron: Overdue reminders disabled");
    }
  } catch (error) {
    console.error("Error in sendInvoiceReminder:", error.message);
  }
}


/**
 * Create cron schedule dynamically from business settings
 */
async function scheduleInvoiceReminderCronFromSettings() {
  const settings = await BusinessSetting.findOne();
  
  let runTime = settings?.invoice_settings?.[0]?.email_time_frame || "02:00";

  // Ensure valid format HH:mm
  if (!/^\d{2}:\d{2}$/.test(runTime)) {
    console.warn(`Invalid runTime format: ${runTime}, defaulting to 02:00`);
    runTime = "02:00";
  }

  const [hour, minute] = runTime.split(":").map(num => Number(num));

  // Ensure valid hour/minute
  const safeHour = isNaN(hour) || hour < 0 || hour > 23 ? 2 : hour;
  const safeMinute = isNaN(minute) || minute < 0 || minute > 59 ? 0 : minute;

  const cronExp = `${safeMinute} ${safeHour} * * *`;
//   const cronExp = `* * * * *`;

  console.log(`Scheduling Auto-Invoicing at ${safeHour}:${String(safeMinute).padStart(2, "0")} -> cron: ${cronExp}`);

  if (currentTask) {
    currentTask.stop();
  }

  currentTask = cron.schedule(cronExp, async () => {
    try {
      await sendInvoiceReminder();
    } catch (err) {
      console.error("Error in Auto-Invoicing job:", err.message);
    }
  });
}



module.exports = { scheduleInvoiceReminderCronFromSettings };
