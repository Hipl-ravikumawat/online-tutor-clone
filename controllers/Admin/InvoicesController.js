const mysqlOrm = require('mysql-orm');
const moment = require("moment");
const ChargeCategory = require("../../models/ChargeCategory");
const Invoice = require("../../models/Invoice");
const User = require("../../models/User");
const mail = require("../../config/mail");
const MailTemplates = require("../../_helper/MailTemplates");
const globalConstant = require("../../_helper/GlobalConstants");
const globalHelper = require("../../_helper/GlobalHelper");
const InvoiceService = require("../../services/InvoiceService");
const { createNotification } = require("../../services/NotificationService");
const puppeteer = require("puppeteer");
const path = require("path");
const archiver = require("archiver");
const ExcelJS = require("exceljs");
const ejs = require("ejs");
const Invoices = require('../../models/Invoice');
const NotificationTemplate = require('../../models/NotificationTemplate');
const GlobalConstants = require('../../_helper/GlobalConstants');
const FamilyContact = require('../../models/FamilyContacts');

module.exports = {
  dataTable,
  create,
  store,
  invoiceDetails,
  getInvoiceEmailData,
  sendInvoiceEmail,
  getUnpaidInvoices,
  checkExistingInvoices,
  generatePdf,
  downloadInvoicesZip,
  downloadExcel,
  markAsPaid,
  markAsVoid,
  changeArchiveStatus,
  destroy,
};

async function dataTable(req, res) {
  try {
    const isChecked = (val) => val === true || val === "1" || val === 1;

    const {
      family_or_invoice_number,
      filter_invoice_start_date,
      filter_invoice_end_date,
      hide_emailed,
      hide_voided,
      hide_due_invoices,
      archive_status,
    } = req.body;
    const studentId = req.body.studentId?.trim() || null;

    const excludedTypes = [];
    if (isChecked(hide_emailed)) excludedTypes.push("hide_emailed");
    if (isChecked(hide_voided)) excludedTypes.push("hide_voided");
    if (isChecked(hide_due_invoices)) excludedTypes.push("hide_due_invoices");

    const columnIndex = Number(req.body.order?.[0]?.column ?? 0);
    const sortDir = req.body.order?.[0]?.dir === "asc" ? 1 : -1;

    let sortField = "date";
    if (Array.isArray(req.body.columns) && req.body.columns[columnIndex]) {
      sortField = req.body.columns[columnIndex].data || req.body.columns[columnIndex].name || sortField;
    } else {
      const fallbackColumns = ["date", "invoice_amount", "family"];
      sortField = fallbackColumns[columnIndex] || "date";
    }

    const skip = Number(req.body.start) || 0;
    const limit = Number(req.body.length) || 10;

    let baseMatch = { isDeleted: false };
    const user_detail = res.locals.loggedUserInfo;

    if (user_detail.role == 2) {
      baseMatch.student_id = {
        $in: attachedStudentIds.map(id => new mysqlOrm.Types.ObjectId(id))
      };
    }

    if (
      moment(filter_invoice_start_date, "YYYY-MM-DD", true).isValid() &&
      moment(filter_invoice_end_date, "YYYY-MM-DD", true).isValid()
    ) {
      baseMatch.date = {
        $gte: moment(filter_invoice_start_date, "DD-MM-YYYY").toDate(),
        $lte: moment(filter_invoice_end_date, "DD-MM-YYYY").toDate(),
      };
    }

    if (excludedTypes.includes("hide_emailed")) baseMatch.is_emailed = { $ne: true };
    if (excludedTypes.includes("hide_voided")) baseMatch.is_void = { $ne: true };
    if (excludedTypes.includes("hide_due_invoices")) {
      baseMatch.due_date = null;
      baseMatch.is_paid = null;
    }

    if (studentId) baseMatch.student_id = new mysqlOrm.Types.ObjectId(studentId);

    if (archive_status && archive_status !== 'all') {
      if (archive_status === 'archived') baseMatch.is_archived = true;
      else if (archive_status === 'unarchived') baseMatch.is_archived = { $in: [false, null] };
    }

    const basePipeline = [
      { $match: baseMatch },
      { $lookup: { from: "users", localField: "student_id", foreignField: "_id", as: "student" } },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "family_contacts", localField: "student_id", foreignField: "student_id", as: "contacts" } },
      { $lookup: { from: "users", localField: "contacts.user_id", foreignField: "_id", as: "familyUsers" } },
      // --- Compute searchable and sortable fields ---
      {
        $addFields: {
          computedStudentName: {
            $concat: [
              { $ifNull: ["$student.first_name", ""] },
              " ",
              { $ifNull: ["$student.last_name", ""] }
            ]
          },
          family_sort: {
            $toLower: {
              $concat: [
                {
                  $reduce: {
                    input: "$familyUsers",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $cond: [{ $eq: ["$$value", ""] }, "", "; "] },
                        { 
                          $cond: [
                            { $ne: ["$$this.company_name", ""] },
                            "$$this.company_name",
                            { $concat: ["$$this.first_name", " ", "$$this.last_name"] }
                          ]
                        }
                      ]
                    }
                  }
                },
                { $cond: [{ $eq: ["$familyUsers", []] }, "", "; "] },
                { $concat: ["$student.first_name", " ", "$student.last_name"] }
              ]
            }
          },
          computedFamily: {
            $reduce: {
              input: "$familyUsers",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", "; "] },
                  { 
                    $cond: [
                      { $ne: ["$$this.company_name", ""] },
                      "$$this.company_name",
                      { $concat: ["$$this.first_name", " ", "$$this.last_name"] }
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ];

    // --- Search filter ---
    if (family_or_invoice_number) {
      const searchTerm = family_or_invoice_number.trim();
      const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearchTerm, "i");
      basePipeline.push({
        $match: {
          $or: [
            { invoice_number: regex },
            { "familyUsers.company_name": regex },
            { "familyUsers.first_name": regex },
            { "familyUsers.last_name": regex },
            { computedFamily: regex },
            { computedStudentName: regex }
          ]
        }
      });
    }

    // --- Projection ---
    basePipeline.push({
      $project: {
        student_name: "$computedStudentName",
        family: { $concat: ["$computedFamily", "$computedStudentName"] },
        family_sort: 1,
        invoice_amount: 1,
        invoice_amount_number: { $toDouble: "$invoice_amount" },
        invoice_number: 1,
        private_note: 1,
        date: 1,
        sort_date: { $ifNull: ["$date", new Date(0)] },
        due_date: 1,
        date_range: 1,
        is_emailed: 1,
        is_void: 1,
        is_paid: 1,
        email_sent_at: 1,
        is_archived: 1,
        student_id: 1
      }
    });

    const countRes = await Invoice.aggregate([...basePipeline, { $count: "count" }]);
    const recordsFiltered = countRes[0]?.count || 0;

    const recordsTotal = await Invoice.countDocuments(baseMatch);

    // --- Dynamic sort ---
    let dynamicSortStage;
    if (sortField === "date" || sortField === "invoice_date") dynamicSortStage = { $sort: { sort_date: sortDir } };
    else if (sortField === "invoice_amount") dynamicSortStage = { $sort: { invoice_amount_number: sortDir } };
    else if (sortField === "family") dynamicSortStage = { $sort: { family_sort: sortDir } };
    else dynamicSortStage = { $sort: { sort_date: -1 } };

    const mainPipeline = [...basePipeline, dynamicSortStage, { $skip: skip }, { $limit: limit }];
    const paginated = await Invoice.aggregate(mainPipeline);

    const currency = globalConstant.currency;
    const data = paginated.map(item => ({
      _id: item._id,
      currency: currency.symbol,
      student_id: item.student_id,
      is_archived: item.is_archived,
      is_emailed: item.is_emailed,
      is_paid: item.is_paid,
      email_sent_at: item.email_sent_at,
      is_void: item.is_void,
      invoice_date: item.date?.toISOString().split("T")[0] || "-",
      invoice_number: item.invoice_number || "-",
      due_date: item.due_date ? item.due_date.toISOString().split("T")[0] : null,
      family: item.family || item.student_name,
      student: item.student_name || "",
      invoice_amount: item.invoice_amount.toFixed(2) || 0,
      date_range: item.date_range
        ? `<div><p class="m-0">${new Date(item.date_range.start).toLocaleDateString("en-GB")} -</p><p class="m-0">${new Date(item.date_range.end).toLocaleDateString("en-GB")}</p></div>`
        : "-",
      private_note: item.private_note || "-",
      action: item._id
    }));

    res.json({
      draw: parseInt(req.body.draw) || 1,
      recordsTotal,
      recordsFiltered,
      data,
      currency: currency.symbol
    });

  } catch (err) {
    console.error("Invoices DataTable error:", err);
    res.status(500).json({ message: "Server error" });
  }
}


async function create(req, res) {
  try {
    const studentId = req.params.studentId || null;

    let studentIdArr = [];
    if(studentId){
      studentIdArr = [studentId];
    }
    const families = await globalHelper.getFamiliesListForFamiliesInvoices(studentIdArr);    
    const groupTags = await globalHelper.getGroupTagsList();
    const invoiceTypes = globalConstant.invoice_types;
    const currency = globalConstant.currency;

    // const categories = await ChargeCategory.find({ deleted_at: null });
    const categories = await globalHelper.getChargeCategories();
    
    return res.render("../views/admin/invoicing/familyAndInvoices/invoices/create", { families, categories, studentId, groupTags, invoiceTypes,currency });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function store(req, res) {
  try {
    const userDetail = res.locals.loggedUserInfo;
    const redirectTo = req.body.redirect_to || '/families-invoices#Invoices';
    const result = await InvoiceService.createInvoices({
      ...req.body,
      userDetail,
    });
    req.flash("success", result.message);
    return res.status(200).json({ success: true, message: result.message ,redirectUrl: redirectTo});
  } catch (err) {
    console.error("Invoice creation error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

async function checkExistingInvoices(req, res) {
  try {
    const { families, date_range } = req.body;
    const existingInvoices = await InvoiceService.checkExistingInvoices({
      families,
      date_range,
    });

    if (existingInvoices > 0) {
      return res.json({
        success: true,
        exists: true,
        invoices_count: existingInvoices,
      });
    }

    return res.json({ success: true, exists: false });
  } catch (err) {
    console.error("Check invoice error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

async function generatePdfBuffer(txnId, userDetail) {
  try {
    const currency = globalConstant.currency?.symbol || "â‚¹";
    
    // Load business settings
    const businessSettings = await globalHelper.getBusinessSettingValue();
    let invoiceSettings = {};
    if (businessSettings.invoice_formatting) {
      invoiceSettings = businessSettings?.invoice_formatting[0];
    }
    
    const logoPath = path.resolve(__dirname, "../../assets/images/logo.svg");
    const logoData = fs.readFileSync(logoPath, "utf8");
    const logoBase64 = `data:image/svg+xml;base64,${Buffer.from(logoData).toString("base64")}`;

    // Load invoice
    const invoiceData = await Invoice.findById(txnId)
      .populate("student_id", "first_name last_name address ndis_number")
      .lean();

    if (!invoiceData) {
      return null;
    }

    const templatePath = path.resolve(
      __dirname,
      "../../views/admin/invoicing/familyAndInvoices/invoices/invoicePdf/invoice_pdf.ejs"
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
          chargeCell = `${currency}-${txn.amount.toFixed(2)}`;
        } else if (txn.type === "Payment") {
          paymentCell = `${currency}${txn.amount.toFixed(2)}`;
        } else if (txn.type === "Refund") {
          paymentCell = `${currency}-${txn.amount.toFixed(2)}`;
        }

        rows.push(`
          <tr>
            <td style="padding:10px; border-bottom:1px solid #888;">${formatDate(txn.date)}</td>
            <td style="padding:10px; border-bottom:1px solid #888;">${txn.note ? `${txn.type} - ${txn.note}` : txn.type}</td>
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

async function generatePdf(req, res) {
  try {
    const userDetail = res.locals.loggedUserInfo;
    const txnId = req.params.txnId;
    const invoice = await Invoices.findById(txnId).populate("student_id", "first_name last_name");
    if (!invoice) {
      return res.status(404).send("Invoice not found");
    }

    const student = invoice.student_id; 
    const studentLastName = student?.last_name || "User";
    const invoiceDate = invoice.date ? new Date(invoice.date) : new Date();
    const formattedDate = `${String(invoiceDate.getDate()).padStart(2, "0")}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}-${invoiceDate.getFullYear()}`;


    const businessSettings = await globalHelper.getBusinessSettingValue();     
    let invoiceSettings = {};    
    if(businessSettings.invoice_formatting){
      invoiceSettings = businessSettings.invoice_formatting[0];
    }
    const fileNamePrefix = invoiceSettings?.invoice_name || "Invoice";
    const pdfBuffer = await generatePdfBuffer(txnId, userDetail);

    const isDownload = req.query.download === "true";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename=${fileNamePrefix}-${studentLastName}-${formattedDate}.pdf`
    );
    res.end(pdfBuffer);
  } catch (err) {
    console.error("Error generating invoice PDF:", err);
    res.status(500).send("Internal server error");
  }
}

async function downloadInvoicesZip(req, res) {
  try {
    const ids = req.query.ids ? req.query.ids.split(",") : [];
    if (ids.length === 0) {
      return res.status(400).send("No invoice IDs provided.");
    }
    
    const dateString = new Date().toLocaleDateString('en-CA');
    
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=InvoiceBundle_${dateString}.zip`);
    
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);
    
    const userDetail = res.locals.loggedUserInfo;
    for (const id of ids) {
      const pdfBuffer = await generatePdfBuffer(id, userDetail);

      if (pdfBuffer) {
        const bufferToUse = Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer);

        console.log(`Appending invoice ${id}, buffer length: ${bufferToUse.length}`);
        archive.append(bufferToUse, { name: `invoice_${id}.pdf` });
      } else {
        console.warn(`âš ï¸ Skipping invoice ${id}, no buffer returned`);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error("Error creating invoices ZIP:", err);
    res.status(500).send("Error creating ZIP file");
  }
}

async function downloadExcel(req, res) {
  try {
    const currency = GlobalConstants.currency;
    const ids = req.query.ids ? req.query.ids.split(",") : [];
    if (!ids.length) {
      return res.status(400).send("No invoices selected");
    }

    const invoices = await Invoice.find({ _id: { $in: ids } })
      .populate("student_id", "first_name last_name ndis_number")
      .lean();

    if (!invoices.length) {
      return res.status(404).send("No invoices found for the selected IDs");
    }

    // --- Fetch families & addresses for each invoice ---
    for (let inv of invoices) {
      inv.family_name = "";
      inv.family_address = "";

      if (inv.student_id?._id) {
        const familyContacts = await FamilyContact.find({
          student_id: inv.student_id._id,
          isDeleted: false,
        }).lean();

        if (familyContacts?.length) {
          const familyNames = [];
          const familyAddresses = [];

          for (let contact of familyContacts) {
            if (contact.user_id) {
              const familyUser = await User.findById(contact.user_id)
                .select("first_name last_name address company_name")
                .lean();

              if (familyUser) {
                let name = "";
                if (familyUser.first_name || familyUser.last_name) {
                  name = `${familyUser.first_name || ""} ${familyUser.last_name || ""}`.trim();
                } else {
                  name = familyUser.company_name || "";
                }

                if (name) familyNames.push(name);
                if (familyUser.address) familyAddresses.push(familyUser.address);
              }
            }
          }

          inv.family_name = familyNames.join(", ");
          inv.family_address = familyAddresses.join(", ");
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Invoices");

    worksheet.columns = [
      { header: "Invoice #", key: "invoiceNumber", width: 20 },
      { header: "Invoice Date", key: "invoiceDate", width: 15 },
      { header: "Due Date", key: "dueDate", width: 15 },
      { header: "Family", key: "family", width: 20 },
      { header: "Address", key: "address", width: 25 },
      { header: "Students", key: "studentName", width: 25 },
      { header: "Date Range", key: "dateRange", width: 25 },
      { header: "Description", key: "description", width: 30 },
      { header: "Invoice Amount", key: "invoiceAmount", width: 15 },
      { header: "Paid", key: "paid", width: 10 },
      { header: "Void", key: "void", width: 10 },
      { header: "Emailed Date", key: "emailedDate", width: 20 },
      { header: "Reminded Date", key: "remindedDate", width: 20 },
    ];

    const dateString = moment().format("YYYY-MM-DD");

    invoices.forEach((inv) => {
      worksheet.addRow({
        invoiceNumber: inv.invoice_number || "",
        invoiceDate: inv.date ? moment(inv.date).format("DD-MM-YYYY") : "",
        dueDate: inv.due_date ? moment(inv.due_date).format("DD-MM-YYYY") : "",
        family: inv.family_name || "",
        address: inv.family_address || "",
        studentName: inv.student_id
          ? `${inv.student_id.first_name || ""} ${inv.student_id.last_name || ""}`.trim()
          : "",
        dateRange: inv.date_range
          ?`${moment(inv.date_range.start).format("DD-MM-YYYY")} - ${moment(
              inv.date_range.end
            ).format("DD-MM-YYYY")}`
          : "",
        description: inv.private_note || "",
        invoiceAmount: inv.invoice_amount ? `${currency.symbol}${inv.invoice_amount}` : `${currency.symbol}0.00`,
        paid: inv.is_paid ? "Y" : "N",
        void: inv.is_void ? "Y" : "N",
        emailedDate: inv.email_sent_at
          ? moment(inv.email_sent_at).format("DD-MM-YYYY") : "",
        remindedDate: inv.reminded_at
          ?  moment(inv.reminded_at).format("DD-MM-YYYY") : "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="InvoiceDetails_${dateString}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating Excel:", err);
    res.status(500).send("Failed to generate Excel");
  }
}


async function invoiceDetails(req, res) {
  try {
    const studentId = req.params.id;

    if (!mysqlOrm.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const invoices = await Invoice.aggregate([
      {
        $match: {
          student_id: new mysqlOrm.Types.ObjectId(studentId),
          isDeleted: { $ne: true }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "families",
          foreignField: "_id",
          as: "family_users"
        }
      },
      {
        $project: {
          invoice_date: 1,
          date_range: 1,
          balance_snapshot: 1,
          families: 1,
          student_id: 1,
          familyNames: {
            $map: {
              input: "$family_users",
              as: "f",
              in: {
                $cond: [
                  { $ne: ["$$f.company_name", ""] },
                  "$$f.company_name",
                  { $concat: ["$$f.first_name", " ", "$$f.last_name"] }
                ]
              }
            }
          }
        }
      },
      { $sort: { invoice_date: -1 } }
    ]);

    res.json({data: invoices });

  } catch (err) {
    console.error("Error fetching student invoices:", err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getInvoiceEmailData(req, res) {
  try {
    const invoiceId = req.body.invoiceIds;
    const templateType = req.body.templateType;
    const selectedValueEmailTo = req.body.selectedValueEmailTo;
    const currency = globalConstant.currency;
    let paymentUrl = process.env.PAYMENT_URL || '';
    const { first_name, last_name, email: adminEmail } = await User.findOne({ role: 1, isDeleted: false })
      .select("first_name last_name email")
      .lean();
    const userDetail = res.locals.loggedUserInfo;
    const userName = `${userDetail.first_name} ${userDetail.last_name}` ;
    if (!adminEmail) {
      return res.status(404).json({ error: "Admin user not found" });
    }

    // Get Invoice
    const invoice = await Invoice.find({ _id: { $in: invoiceId }}).populate('student_id').lean();
    const studentIds = invoice.map(inv => inv.student_id?._id.toString());
    const uniqueIds = [...new Set(studentIds)];
    const families = await globalHelper.getFamiliesListForFamiliesInvoices(uniqueIds);
    
    let lastName = "";
    const formatted = families.flatMap(student => {
      // Flatten and filter contacts with actual data
      const contacts = (student.contacts || []).flat().filter(c => c && c.email);
      if (contacts.length > 0) {
        lastName = contacts[0]?.last_name || contacts[0]?.company_name || "";
        // Map all valid contacts
        return contacts.map(contact => ({
          value:  contact._id.toString(), // ensure string 
          label: `${contact.full_name || contact.company_name || (contact.first_name + " " + contact.last_name)} <${contact.email}>`
        }));
      } else {
        // Fallback to student details
        return {
          value: student._id,
          label: `${student.studentName} <${student.student_email}>`
        };
      }
    });


    if (!invoice || invoice.length === 0) {
      return res.status(404).json({ error: "Invalid invoice data" });
    }
    
    let mailSubject = "";
    let mailMessage = "";

    if (templateType === "invoice_email") {
        const notificationTemplates = await NotificationTemplate.find({slug: 'invoice'});
        if (!notificationTemplates || notificationTemplates.length === 0) {
            throw new Error("Invoice email template not found");
        }

        mailSubject = notificationTemplates[0].subject;
        mailMessage = notificationTemplates[0].message;

    } else if (templateType === "invoice_reminder") {
          const reminderData = await MailTemplates.invoiceReminder(invoice, families);
          mailSubject = reminderData.subject;
          mailMessage = reminderData.message;
      }

  let subject = mailSubject;
  let message = mailMessage;
    if(invoiceId && invoiceId.length == 1){
      let firstName = '';
      if (families.length > 0) {
        const family = families[0];

        if (Array.isArray(family.contacts) && family.contacts.length > 0) {
          const contactItem = family.contacts.find(obj =>
            obj._id && obj._id.toString() === selectedValueEmailTo
          );
          firstName = contactItem?.full_name || family.studentName; // fallback here
        } else {
          firstName = family.studentName; // fallback when contacts empty
        }
      } 
      const formattedDate = moment(invoice[0].date).format("DD-MM-YYYY");
       message =  message
      .replace(/%FirstName%/g, firstName)
      .replace(/%InvoiceAmount%/g, `${currency.symbol}${invoice[0].invoice_amount}`)
      .replace(/%InvoicePayURL%/g, `<a href=${paymentUrl}>Pay Now</a>`) // example dynamic URL
      .replace(/%TutorFirstName%/g, userName)  // replace with actual tutor name
      .replace(/%BusinessName%/g, process.env.APP_NAME) // replace with actual business name
      .replace(/%InvoiceDate%/g, formattedDate); // replace with actual business name
      subject = subject.replace(/%InvoiceDate%/g, formattedDate).replace(/%LastName%/g,lastName);
      
    }else{
      console
    }
    res.json({
      firstName: first_name,
      lastName: lastName,
      adminEmail,
      sendTo:formatted,
      isDropdown:uniqueIds.length == 1,
      subject: subject || "",
      message: message || "",
    });
  } catch (err) {
    console.error(" Error fetching invoice email data:", err);
    res.status(500).send("Server Error");
  }
}

async function sendInvoiceEmail(req, res) {
  try {
    const { invoiceId, from_mail, subject, message, bcc_email, template_type} = req.body;
   
    let fromEmail;
    if (Array.isArray(from_mail) && from_mail.length > 0) {
      const fromUser = await User.findById(from_mail[0]).lean();
      fromEmail = fromUser?.email || process.env.APP_EMAIL;
    } else {
      const fromUser = await User.findById(from_mail).lean();
      fromEmail = fromUser?.email || process.env.APP_EMAIL;
    }
    
    const currency = globalConstant.currency;
    const invoices = invoiceId.split(',');
    const userDetail = res.locals.loggedUserInfo;
    const userName = `${userDetail.first_name} ${userDetail.last_name}` ;
    const userEmail = [];

    for (let data of invoices) {
      const invoice = await Invoice.findById(data).lean();
      const uniqueIds = [invoice.student_id];
      const families = await globalHelper.getFamiliesListForFamiliesInvoices(uniqueIds);

      const formatted = families.flatMap(student => {
        // Flatten and filter contacts with actual emails
        const contacts = (student.contacts || []).flat().filter(c => c && c.email);

        if (contacts.length > 0) {
          // Return objects for each contact
          return contacts.map(contact => ({
            student_id: invoice.student_id,
            invoice_id: invoice._id,
            email: contact.email.trim(),
            date: invoice.date,
            amount:invoice.invoice_amount,
            name: contact.first_name && contact.first_name.trim() !== ""
              ? `${contact.first_name} ${contact.last_name || ""}`.trim()
              : (contact.company_name || contact.full_name || student.studentName),
            
            lastName: contact.last_name && contact.last_name.trim() !== ""
              ? `${contact.last_name}`.trim()
              : (contact.company_name || contact.full_name || student.studentName)
          }));
        } else {
          // Fallback to student email
          return student.student_email
            ? [{
                student_id: invoice.student_id,
                invoice_id: invoice._id,
                email: student.student_email.trim(),
                amount:invoice.invoice_amount,
                date: invoice.date,
                name: student.studentName,
                lastName: student.studentName
              }]
            : [];
        }
      });
      userEmail.push(...formatted)
    }

    // helper to throttle emails
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    for(let data of userEmail){
      let paymentUrl = process.env.PAYMENT_URL || '';
      const invoice = await Invoice.findById(data.invoice_id);
      const formatted = moment(data.date).format("DD MMM YYYY");
      const lastName = data?.lastName

      const bodyData =  message
        .replace(/%FirstName%/g, data.name)
        .replace(/%InvoiceAmount%/g,  `${currency.symbol}${data.amount}`)
        .replace(/%InvoicePayURL%/g, `<a href="${paymentUrl}">Pay Now</a>`) // example dynamic URL
        .replace(/%TutorFirstName%/g, userName)  // replace with actual tutor name
        .replace(/%BusinessName%/g, process.env.APP_NAME); // replace with actual business name

      const subjectData = subject.replace(/%InvoiceDate%/g, formatted).replace(/%LastName%/g, lastName);

      const pdfBuffer =  await generatePdfBuffer(data.invoice_id.toString(),userDetail);
       const attachments = [];
        if (pdfBuffer) {
          attachments.push({
            filename: `Invoice-${data.invoice_id.toString()}.pdf`,
            content: pdfBuffer,
          });
        }

      const mailOptions = {
        from: fromEmail,
        to: data.email,
        bcc: bcc_email ? fromEmail : undefined,
        subject: subjectData,
        html: bodyData,
        attachments: attachments,
      };

      const info =  await mail.transporter.sendMail(mailOptions);

      //  create notification
      await createNotification({
        student_id: data.student_id,
        type: "Email",
        subject: subjectData || "Payment Notification",
        messageBody: bodyData || "Thank you for your payment.",
        slug: template_type == 'invoice_reminder' ? "Invoice Reminder" : "Invoice",
        bcc_email: bcc_email ? "on" : null,
        receiver: {
          name: `${data.name}`,
          email: data.email,
        },
        sender: {
          email: process.env.APP_EMAIL,
          name: "System",
        },
        status: info ? "sent" : "unsent",
        meta: { invoiceId: data.invoice_id },
        sentAt: new Date(), 
      });

      if (invoice) {
        invoice.is_emailed = 1;
        invoice.email_sent_at = new Date();
        await invoice.save();
      }
      await sleep(500); // 500ms delay between emails
    }
    return res.status(200).json({ success: true, message: "Invoice email(s) sent.", results: userEmail });
  } catch (err) {
    console.error(" Error sending invoice email:", err);
    return res.status(500).json({ success: false, message: "Failed to send invoice email(s)." });
  }
}

async function markAsPaid(req, res){
  try {
    const { id } = req.params;
    const userDetail = res.locals.loggedUserInfo;

    const invoice = await InvoiceService.updateInvoices([id], {
      is_paid: true,
      is_void: false,
      voided_by: null,
      voided_at: null,
      paid_at: new Date(),
      paid_by: userDetail._id || null,
    });
    res.json({ success: true, message:"Status updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to mark as paid" });
  }
}


async function markAsVoid(req, res){
  try {
    const { id } = req.params;
    const userDetail = res.locals.loggedUserInfo;

    const invoice = await InvoiceService.updateInvoices([id], {
      is_void: true,
      is_paid: false,
      paid_by: null,
      paid_at: null,
      voided_at: new Date(),
      voided_by: userDetail._id || null,
    });
    res.json({ success: true, message:"Status updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to mark as void" });
  }
}

async function changeArchiveStatus(req, res) {
  try {
    const { invoice_ids = [], action } = req.body;
    const userDetail = res.locals.loggedUserInfo;

    if (!invoice_ids.length || !["archive", "unarchive"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const updateData =
      action === "archive"
        ? { is_archived: true, archived_at: new Date(), archived_by: userDetail._id }
        : { is_archived: false, archived_at: null, archived_by: null };

    const invoices = await InvoiceService.updateInvoices(invoice_ids, updateData);

    res.json({ success: true, message: `Invoices ${action}d successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update invoices" });
  }
}

async function getUnpaidInvoices(req, res){
  try {
    const { studentId } = req.body;
    if(!mysqlOrm.Types.ObjectId.isValid(studentId)){
      return res.status(200).json({
        message: "Something went wrong, please try again later.",
      });
    }
    const invoices = await Invoice.find({ student_id: mysqlOrm.Types.ObjectId(studentId), is_paid: { $ne: 1 }, invoice_amount: { $gt: 0 } });
    const currency = globalConstant.currency;
    const result = {
      invoices,
      currency
    };
    return res.status(200).json({success: true, message: "Unpaid invoices.", results: result});
  }catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function destroy(req, res){
  try {
    const { invoice_ids } = req.body;

    if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No invoice IDs provided"
      });
    }

    // Soft delete
    await Invoice.updateMany(
      { _id: { $in: invoice_ids } },
      { $set: { isDeleted: true, deleted_at: new Date() } }
    );

    return res.json({
      success: true,
      message: `${invoice_ids.length} invoice(s) deleted successfully`
    });
  } catch (error) {
    console.error("Error deleting invoices:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting invoices."
    });
  }
}
