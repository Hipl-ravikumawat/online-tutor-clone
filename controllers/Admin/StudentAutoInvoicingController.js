const mysqlOrm = require('mysql-orm');
const StudentAutoInvoicingSettings = require("../../models/StudentAutoInvoicingSettings");
const User = require("../../models/User");
const { getStudentBalance } = require("../../services/UserService");
const globalHelper = require("../../_helper/GlobalHelper");
const mail = require("../../config/mail");
const moment = require("moment");
const mailService = require("../../services/MailService");

module.exports = {
  getAutomaticInvoicing,
  store,
  disabled,
  resendSummary,
  update,
  destroy,
};

async function getAutomaticInvoicing(req, res){
  try {
    const autoInvoicing = await StudentAutoInvoicingSettings.findOne({
      studentId: req.body.studentId,
      isActive: true
    });

    if (!autoInvoicing) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: autoInvoicing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * store tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    let data = req.body;
    const user_detail = res.locals.loggedUserInfo;
    
    // Ensure studentId is always an array
    if (data.studentId && typeof data.studentId === "string") {
      data.studentId = data.studentId.split(",").map(id => id.trim());
    }
    data.created_by = user_detail._id || null;

    if (!Array.isArray(data.studentId) || data.studentId.length === 0) {
      req.flash("error", "No student IDs provided");
      return res.json({
        status: false,
        message: "No student IDs provided",
        data: null,
      });
    }

    let results = [];
    // Upsert each studentId (update if exists, insert if not)
    for (let studentId of data.studentId) {
      const payload = { ...data, studentId };

      const record = await StudentAutoInvoicingSettings.findOneAndUpdate(
        { studentId },          // match existing studentId
        { $set: payload },      // update fields
        { upsert: true, new: true } // insert if not exists, return updated doc
      );

      results.push(record);
    }

    // Update User collection in one query
    await User.updateMany(
      { _id: { $in: data.studentId.map(id => mysqlOrm.Types.ObjectId(id)) } },
      { $set: { auto_invoice: true } }
    );

    const successMsg = "Auto Invoicing Settings saved/updated successfully";
    req.flash("success", successMsg);
    return res.json({
      status: true,
      message: successMsg,
      data: results,
    });

  } catch (err) {
    console.error(err, "err");
    return res.json({
      status: false,
      message: "An error occurred while saving Auto Invoicing Settings",
      error: err.message,
    });
  }
}


/**
 * edit tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function disabled(req, res) {
  try{
    let data = req.body;
    if (data.studentId && typeof data.studentId === "string") {
      data.studentId = data.studentId.split(",").map(id => id.trim());
    }
    const result = await User.updateMany({ _id: { $in: data.studentId.map(id => mysqlOrm.Types.ObjectId(id)) } },{ $set: { auto_invoice: false },new : true });

    await StudentAutoInvoicingSettings.deleteMany({ studentId: { $in: data.studentId } });
    if(result){
      let successMsg = "Auto Invoicing Settings disabled successfully";
        req.flash("success", successMsg);
        return res.json({
          status: true,
          message: "Auto Invoicing Settings disabled successfully",
          data: result,
      });
    }else{
      let successMsg = "Auto Invoicing Settings not disabled";
      req.flash("error", successMsg);
      return res.json({
        status: false,
        message: "Auto Invoicing Settings not disabled",
        data: null,
      });
    }
    
  }catch(err){
    console.log(err,"err");
  }
}


async function resendSummary(req, res) {
  try {
    const studentIds = req.body.student_ids;
    const studentBalance = await getStudentBalance(studentIds);

    const filtered = studentBalance.filter(
      s => s.auto_invoice === true && s.balance < 0
    );

    const invoiceDataArray = await Promise.all(
      filtered.map(async (s) => {
        return await globalHelper.buildInvoiceRow(
          s._id.toString(),
          s.balance,
          s.auto_invoicings?.invoiceDetails
        );
      })
    );

    const user_detail = res.locals.loggedUserInfo;
    const todayDate = moment().format("DD-MM-YYYY");

    await mailService.sendAutomaticInvoiceSummaryEmail(
      todayDate,
      user_detail?.first_name || "System",
      invoiceDataArray,
      user_detail.email
    );

    return res.json({
      status: true,
      message: "Resend Summary Email Sent",
      data: invoiceDataArray,
    });
  } catch (err) {
    console.error("Error in resendSummary:", err);
    return res.json({ status: false, message: "Error sending summary", error: err.message });
  }
}

  
/**
 * update tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
}

/**
 * destroy tab's information.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
}


  function buildInvoiceTable(data) {
    const tableRows = data.map(inv => `
      <tr>
        <td>${inv.studentId}</td>
        <td>${inv.studentName}</td>
        <td>${inv.invoiceDate}</td>
        <td>${inv.dateRange}</td>
        <td>${inv.amount}</td>
      </tr>
    `).join("");

    return `
      <h3>Student Auto Invoicing Summary</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th>Student ID</th>
            <th>Name</th>
            <th>Invoice Date</th>
            <th>Date Range</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  }




