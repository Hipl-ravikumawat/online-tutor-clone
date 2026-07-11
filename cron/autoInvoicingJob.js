const cron = require("node-cron");
const StudentAutoInvoicingSettings = require("../models/StudentAutoInvoicingSettings");
const BusinessSettings = require("../models/BusinessSetting");
const InvoiceService = require("../services/InvoiceService");
const moment = require("moment");
const mysqlOrm = require('mysql-orm');

let currentTask = null; 

async function processAutoInvoicing() {
  // console.log("Running Auto-Invoicing Job:", new Date().toISOString());

  try {
    // Fetch all active auto-invoicing records
    const autoInvoicing = await StudentAutoInvoicingSettings.find({ isActive: true })
      .populate("studentId", "first_name last_name email")
      .populate("created_by", "_id first_name last_name email")
      .lean();


    for (const autoDoc of autoInvoicing) {
      try {
        const systemUser = autoDoc.created_by;
        const result = await InvoiceService.autoGenerateInvoiceIfEnabled(autoDoc, systemUser);
        // console.log('result',result);
        if (result) {
          await StudentAutoInvoicingSettings.findByIdAndUpdate(autoDoc._id, {
            lastProcessed: new Date(),
          });
          
          // console.log(`Invoice created for student ${autoDoc.studentId.first_name}`);
        } else {
          // console.log(`Skipped (no invoice due) for student ${autoDoc.studentId}`);
        }
      } catch (err) {
        console.error(`Failed auto-invoicing for student ${autoDoc.studentId.first_name}:`, err);
      }
    }
  } catch (err) {
    console.error("Auto-Invoicing job failed:", err.message);
  }
}


/**
 * Create cron schedule dynamically from business settings
 */
async function scheduleCreateAutoInvoiceCronFromSettings() {
  const settings = await BusinessSettings.findOne();
  
  let runTime = settings?.invoice_settings?.[0]?.email_time_frame || "02:00";
  // Ensure valid format HH:mm
  // if (!/^\d{2}:\d{2}$/.test(runTime)) {
  if (runTime == null) {
    console.warn(`Invalid runTime format: ${runTime}, defaulting to 02:00`);
    runTime = "02:00";
  }
  console.log(runTime,'runTime');
  const [hour, minute] = runTime.split(":").map(num => Number(num));

  // Ensure valid hour/minute
  const safeHour = isNaN(hour) || hour < 0 || hour > 23 ? 2 : hour;
  const safeMinute = isNaN(minute) || minute < 0 || minute > 59 ? 0 : minute;

  const cronExp = `${safeMinute} ${safeHour} * * *`;
  // const cronExp = `* * * * *`;

  console.log(`Scheduling Auto-Invoicing at ${safeHour}:${String(safeMinute).padStart(2, "0")} -> cron: ${cronExp}`);

  if (currentTask) {
    currentTask.stop();
  }

  currentTask = cron.schedule(cronExp, async () => {
    try {
      await processAutoInvoicing();
    } catch (err) {
      console.error("Error in Auto-Invoicing job:", err.message);
    }
  });
}



module.exports = { scheduleCreateAutoInvoiceCronFromSettings };