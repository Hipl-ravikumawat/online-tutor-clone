// const fs = require("fs");
// const path = require("path");
// const puppeteer = require("puppeteer");

// async function generateInvoicePDF(invoiceData) {
//   const templatePath = path.join(
//     __dirname,
//     "../views/admin/familyAndInvoices/invoices/invoicePdf/invoice_pdf.html"
//   );

//   // Read static HTML file
//   let html = fs.readFileSync(templatePath, "utf8");

//   // OPTIONAL: Replace placeholders manually
//   html = html
//     .replace("{{INVOICE_NUMBER}}", invoiceData.invoiceNumber)
//     .replace("{{TOTAL_AMOUNT}}", invoiceData.totalAmount);

//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.setContent(html, { waitUntil: "networkidle0" });

//   const pdfDir = path.join(__dirname, "../public/invoices");
//   if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

//   const pdfPath = path.join(pdfDir, `invoice-${invoiceData._id}.pdf`);
//   await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
//   await browser.close();

//   return `/invoices/invoice-${invoiceData._id}.pdf`;
// }


// module.exports = {generateInvoicePDF};