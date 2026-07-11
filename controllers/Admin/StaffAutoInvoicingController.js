const mysqlOrm = require('mysql-orm');
const StaffAutoInvoicing = require("../../models/StaffAutoInvoicingSettings");
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
};

async function getAutomaticInvoicing(req, res){
  try {
    const autoInvoicing = await StaffAutoInvoicing.findOne({
      tutorId: req.body.tutorId,
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
    // console.log(data,'data');
    const user_detail = res.locals.loggedUserInfo;
    
    // Ensure studentId is always an array
    if (data.tutorId && typeof data.tutorId === "string") {
      data.tutorId = data.tutorId.split(",").map(id => id.trim());
    }
    data.created_by = user_detail._id || null;

    if (!Array.isArray(data.tutorId) || data.tutorId.length === 0) {
      req.flash("error", "No student IDs provided");
      return res.json({
        status: false,
        message: "No tutor IDs provided",
        data: null,
      });
    }

    let results = [];
    // Upsert each tutorId (update if exists, insert if not)
    for (let tutorId of data.tutorId) {
      const payload = { ...data, tutorId };

      const record = await StaffAutoInvoicing.findOneAndUpdate(
        { tutorId },          // match existing studentId
        { $set: payload },      // update fields
        { upsert: true, new: true } // insert if not exists, return updated doc
      );

      results.push(record);
    }

    // Update User collection in one query
    await User.updateMany(
      { _id: { $in: data.tutorId.map(id => mysqlOrm.Types.ObjectId(id)) } },
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
    try {
        let data = req.body;
        
        let tutorIds = data.tutorIds || data.tutorId;
        
        if (!tutorIds) {
            return res.status(400).json({
                status: false,
                message: "No tutor IDs provided"
            });
        }
        
        if (typeof tutorIds === "string") {
            tutorIds = tutorIds.split(",").map(id => id.trim());
        }
        
        if (!Array.isArray(tutorIds)) {
            tutorIds = [tutorIds];
        }
        
        const objectIds = tutorIds.map(id => mysqlOrm.Types.ObjectId(id));
        
        const result = await User.updateMany(
            { _id: { $in: objectIds } },
            { $set: { auto_invoice: false } }
        );
        
        await StaffAutoInvoicing.deleteMany({ tutorId: { $in: tutorIds } });
        
        if (result.modifiedCount > 0 || result.matchedCount > 0) {
            req.flash("success", "Auto Invoicing Settings disabled successfully");
            return res.json({
                status: true,
                message: "Auto Invoicing Settings disabled successfully",
                data: result,
            });
        } else {
            req.flash("error", "Auto Invoicing Settings not disabled");
            return res.json({
                status: false,
                message: "Auto Invoicing Settings not disabled",
                data: null,
            });
        }
        
    } catch (err) {
        console.log(err, "err");
        return res.status(500).json({
            status: false,
            message: "An error occurred while disabling auto invoicing",
            error: err.message
        });
    }
}


async function resendSummary(req, res) {
  try {
    const tutorIds = req.body.tutor_ids;
    const tutorBalance = [];

    const filtered = tutorBalance.filter(
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

function buildInvoiceTable(data) {
    const tableRows = data.map(inv => `
      <tr>
        <td>${inv.tutorId}</td>
        <td>${inv.tutorName}</td>
        <td>${inv.invoiceDate}</td>
        <td>${inv.dateRange}</td>
        <td>${inv.amount}</td>
      </tr>
    `).join("");

    return `
      <h3>Tutor Auto Invoicing Summary</h3>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="background:#f2f2f2;">
            <th>Tutor ID</th>
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




