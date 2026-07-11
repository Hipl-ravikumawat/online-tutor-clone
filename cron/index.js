const { scheduleCreateAutoInvoiceCronFromSettings } = require("./autoInvoicingJob");
const { scheduleInvoiceSummaryCron } = require("./sendAutoInvoicingSummary");
const { scheduleInvoiceReminderCronFromSettings } = require("./invoiceReminder");

function initCrons() {
  scheduleInvoiceSummaryCron();
  scheduleCreateAutoInvoiceCronFromSettings();
  scheduleInvoiceReminderCronFromSettings();
}

module.exports = { initCrons };
