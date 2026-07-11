const cron = require("node-cron");
const StudentAutoInvoicingSettings = require("../models/StudentAutoInvoicingSettings");
const BusinessSettings = require("../models/BusinessSetting");
const InvoiceService = require("../services/InvoiceService");
const moment = require("moment");

let summaryTask = null;

async function processAutomaticInvoiceSummary() {
  // console.log("Running Auto-Invoicing summary job:", new Date().toISOString());
  try {
    const autoInvoicing = await StudentAutoInvoicingSettings.find({ isActive: true })
      .populate("created_by", "_id first_name last_name email")
      .lean();

    // Filter all students that should generate invoice today
    const eligibleDocs = [];
    for (const autoDoc of autoInvoicing) {
      if (!autoDoc.invoiceDetails?.billingCycleStartDate) continue;
      const shouldGenerate = await InvoiceService.shouldGenerateInvoice(autoDoc);
      if (shouldGenerate) eligibleDocs.push(autoDoc);
    }

    if (eligibleDocs.length === 0) {
      console.log("No eligible invoices for today.");
      return;
    }

    // Send one email with all eligible students
    const creator = eligibleDocs[0].created_by; // assuming same creator for all
    await InvoiceService.sendInvoiceSummaryEmail(eligibleDocs, creator);

  } catch (err) {
    console.error("Auto-Invoicing summary job failed:", err.message);
  }
}



async function scheduleInvoiceSummaryCron() {
  const cronExp = `1 0 * * *`;
  
  // Schedule new job
  if (summaryTask) {
    summaryTask.stop();
  }

  summaryTask = cron.schedule(cronExp, async () => {
    await processAutomaticInvoiceSummary();
  });
}


module.exports = { scheduleInvoiceSummaryCron };