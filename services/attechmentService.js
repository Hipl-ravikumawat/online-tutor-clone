const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { getFamiliesListForFamiliesInvoices } = require("../_helper/GlobalHelper");
const ejs = require("ejs");
const GlobalConstants = require("../_helper/GlobalConstants");
const globalHelper = require("../_helper/GlobalHelper");
const Invoices = require("../models/Invoice");
const moment = require("moment");

async function generateReceipt(transaction) {
  try {
    const logoPath = path.resolve(__dirname, "../assets/images/logo.svg");
    const logoData = fs.readFileSync(logoPath);
    const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

    const templatePath = path.resolve(
      __dirname,
      "../views/admin/invoicing/familyAndInvoices/attechmentReceipt/receiptTemplate.ejs"
    );

    const date = new Date(transaction.date || Date.now());
    const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;

    const studentName = `${transaction.student_id?.first_name || ""} ${transaction.student_id?.last_name || ""}`;
    const createdBy = `${transaction.created_by?.first_name || ""} ${transaction.created_by?.last_name || ""}`;
    const amount = `${transaction.currency?.symbol || "$"}${Number(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const studentDetailsArr = await getFamiliesListForFamiliesInvoices(
      Array.isArray(transaction.student_id) ? transaction.student_id : [transaction.student_id]
    );

    const studentDetails = studentDetailsArr[0] || {};
    const familyNames = studentDetails.familyNames || "";
    const familyAddress = (studentDetails.contacts && studentDetails.contacts[0]?.address) || "";

    // Render EJS template
    const html = await ejs.renderFile(templatePath, {
      createdBy,
      date:formattedDate,
      studentName,
      amount,
      familyNames,
      familyAddress,
      absoluteLogoPath: logoBase64,
      note: transaction.note || "",
    });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return pdfBuffer;
  } catch (err) {
    throw err;
  }
}


async function generateStaffTransactionReceipt(transaction) {
  try {
    const logoPath = path.resolve(__dirname, "../assets/images/logo.svg");
    const logoData = fs.readFileSync(logoPath);
    const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

    const templatePath = path.resolve(
      __dirname,
      "../views/admin/invoicing/staffInvoices/attechmentReceipt/receiptTemplate.ejs"
    );

    const date = new Date(transaction.date || Date.now());
    const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;

    const tutorName = `${transaction.tutor_id?.first_name || ""} ${transaction.tutor_id?.last_name || ""}`;
    const createdBy = `${transaction.created_by?.first_name || ""} ${transaction.created_by?.last_name || ""}`;
    const amount = `${transaction.currency?.symbol || "$"}${Number(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    // Render EJS template
    const html = await ejs.renderFile(templatePath, {
      createdBy,
      date:formattedDate,
      tutorName,
      amount,
      absoluteLogoPath: logoBase64,
      note: transaction.note || "",
    });
    
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return pdfBuffer;
  } catch (err) {
    throw err;
  }
}

async function attechInvoicePdf(txnId, userDetail) {
  try {
    const currency = GlobalConstants.currency?.symbol || "₹";
    
    // Load business settings
    const businessSettings = await globalHelper.getBusinessSettingValue();
    let invoiceSettings = {};
    if (businessSettings.invoice_formatting) {
      invoiceSettings = businessSettings?.invoice_formatting[0];
    }
    
    const logoPath = path.resolve(__dirname, "../assets/images/logo.svg");
    const logoData = fs.readFileSync(logoPath, "utf8");
    const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

    // Load invoice
    const invoiceData = await Invoices.findById(txnId)
      .populate("student_id", "first_name last_name address ndis_number")
      .lean();

    if (!invoiceData) {
      return null;
    }
    const templatePath = path.resolve(
      __dirname,
      "../views/admin/familyAndInvoices/invoices/invoicePdf/invoice_pdf.ejs"
    );

    const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

    let totalCharges = invoiceData.total_charges || 0;
    let totalPayments = invoiceData.total_payments || 0;
    const taxSummary = {};

    const studentName = invoiceData.student_id
        ? `${invoiceData.student_id?.first_name || ""} ${invoiceData.student_id?.last_name || ""}`.trim()
        : "Unknown";

    // Build transaction rows
    function buildTransactionRows(transactions, displayType = "itemized") {
      const rows = [];

      if (!transactions || transactions.length === 0) {
        return `
          <tr>
            <td colspan="4" style="padding:10px; text-align:center;">
              There are no billable lessons, events, or charges in the invoice period
            </td>
          </tr>
          <hr>`;
      }
      
      if(invoiceData.previous_balance){
        rows.push(`
            <tr>
              <td style="padding:10px; border-bottom:1px solid #888;">${formatDate(invoiceData.date_range.start)}</td>
              <td style="padding:10px; border-bottom:1px solid #888;">(Balance Forward)</td>
              <td style="padding:10px; border-bottom:1px solid #888; text-align:right;"></td>
              <td style="padding:10px; border-bottom:1px solid #888; text-align:right;">${currency}${invoiceData.previous_balance.toFixed(2)}</td>
            </tr>
        `);
      }
      
      (transactions || []).forEach((txn) => {
        let chargeCell = "";
        let paymentCell = "";

        if (txn.type === "Charge") {
          chargeCell = `${currency}${txn.amount.toFixed(2)}`;
          // collect taxes
          (txn.charge_taxes || []).forEach((tax) => {
            const taxAmount = (txn.amount * tax.tax_rate) / 100;
            if (!taxSummary[tax.tax_name]) {
              taxSummary[tax.tax_name] = { rate: tax.tax_rate, amount: 0 };
            }
            taxSummary[tax.tax_name].amount += taxAmount;
          });
        } else if (txn.type === "Discount") {
          chargeCell = `-${currency}${txn.amount.toFixed(2)}`;
        } else if (txn.type === "Payment") {
          paymentCell = `${currency}${txn.amount.toFixed(2)}`;
        } else if (txn.type === "Refund") {
          paymentCell = `-${currency}${txn.amount.toFixed(2)}`;
        }

        rows.push(`
          <tr>
            <td style="padding:10px; border-bottom:1px solid #888;">${formatDate(txn.date)}</td>
            <td style="padding:10px; border-bottom:1px solid #888;">${txn.note || txn.type}</td>
            <td style="padding:10px; border-bottom:1px solid #888; text-align:right;">${chargeCell}</td>
            <td style="padding:10px; border-bottom:1px solid #888; text-align:right;">${paymentCell}</td>
          </tr>
        `);
      });

      rows.push(`
        <tr>
            <td style="padding:10px; border-bottom:1px solid #888;"></td>
            <td style="padding:10px; font-weight:bold; border-bottom:1px solid #888;">${studentName}, Subtotal</td>
            <td style="padding:10px; font-weight:bold; border-bottom:1px solid #888;text-align:right;">${currency}${Math.abs(invoiceData.total_charges).toFixed(2)}</td>
            <td style="padding:10px; border-bottom:1px solid #888;"></td>
        </tr>`
      ); // studentName

      // Add tax rows if enabled
      if (invoiceSettings?.options?.includes("3") && Object.keys(taxSummary).length > 0) {
        rows.push(`
          <tr>
            <td style="padding:3px;"></td>
            <td style="padding:3px; font-weight:bold;">
              Taxes (Included in Total)
            </td>
            <td style="padding:3px;"></td>
            <td style="padding:3px;"></td>
          </tr>
        `);

        Object.entries(taxSummary).forEach(([taxName, { rate, amount }]) => {
          rows.push(`
            <tr>
              <td style="padding:3px;border-bottom:1px solid #888;"></td>
              <td style="padding:3px;border-bottom:1px solid #888;">
                ${taxName} - (${rate}%)
              </td>
              <td style="padding:3px;border-bottom:1px solid #888; text-align:right;">
                ${currency}${amount.toFixed(2)}
              </td>
              <td style="padding:3px;border-bottom:1px solid #888;"></td>
            </tr>
          `);
        });
      }

      return rows.join("");
    }

    const transactionRows = buildTransactionRows(invoiceData.transactions, invoiceData.displayType || "itemized");
    const balance = totalPayments - totalCharges;
    const previousBalance = -invoiceData.previous_balance || 0;
    
    // Render EJS template
    const html = await ejs.renderFile(templatePath, {
      invoiceDate: moment(invoiceData.date).format('DD-MM-YYYY'),
      invoiceData,
      dueDate: invoiceData.due_date ? moment(invoiceData.due_date).format('DD-MM-YYYY') : null,
      invoiceNumber: invoiceData.invoice_number || "",
      studentAddress: invoiceData.student_id?.address || "",
      studentName: studentName,
      ndisNumber: invoiceData.student_id?.ndis_number || "",
      invoiceAmount: `${currency} ${Math.abs(invoiceData.invoice_amount  || 0).toFixed(2)}`,
      txnId,
      absoluteLogoPath: logoBase64,
      transactionRows,
      chargesTotal: `${currency} ${totalCharges.toFixed(2)}`,
      paymentsTotal: `${currency} ${totalPayments.toFixed(2)}`,
      invoiceFooterTxt: invoiceSettings?.invoice_footer_text || (invoiceData.footer_note),
      balance: `${currency}${balance.toFixed(2)}`,
      userDetail,
      previousBalance: `${currency} ${previousBalance.toFixed(2)}`,
    });

    // Generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "40px", bottom: "60px" }
    });

    await browser.close();
    return pdfBuffer;
  } catch (err) {
    console.error("Error in generatePdfBuffer:", err);
    return null;
  }
}

module.exports = { generateReceipt, generateStaffTransactionReceipt ,attechInvoicePdf };


