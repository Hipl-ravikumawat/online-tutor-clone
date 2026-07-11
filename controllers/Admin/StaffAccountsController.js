const mysqlOrm = require('mysql-orm');
const User = require("../../models/User");
const globalHelper = require("../../_helper/GlobalHelper");
const globalConstant = require("../../_helper/GlobalConstants");
const moment = require("moment");
const StaffAutoInvoicingSettings = require("../../models/StaffAutoInvoicingSettings");

module.exports = {
  index,
  dataTable,
  tutorAccountDetails,
};

async function index(req, res) {
  try {
    const businessSettingValue = await globalHelper.getBusinessSettingValue('accounts');

    const currency = globalConstant.currency;
    const invoiceTypes = globalConstant.invoice_types;
    const userData = await User.findOne({role:1}).lean();
    const sentFrom = [{ value: userData._id, label: `${userData.first_name} ${userData.last_name} <${userData.email}>` }];
    if(req.user.role != 1){
      sentFrom.push({ value: req.user._id, label: `${req.user.first_name} ${req.user.last_name} <${req.user.email}>` });
    }
    return res.render("../views/admin/invoicing/staffInvoices/index", { businessSettingValue, currency, invoiceTypes, sentFrom });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function dataTable(req, res) {
  try {
    const start = Number(req.body.start) || 0;
    const length = Number(req.body.length) || 10;
    const tutorId = req.params.tutorId;
    const filterDate = req.body.filterDate || null;
    const user_detail = res.locals.loggedUserInfo;
    let userRole = user_detail.role;

    const searchStaff = req.body.searchStaff?.trim() || "";
    const showInactive = req.body.showInactive == 1;

    const order = req.body.order?.[0] || {};
    const orderColumnIndex = parseInt(order.column);
    const orderDirection = order.dir === "asc" ? 1 : -1;
    const columnMap = {
      1: "staffName",
      3: "balance",
      6: "auto_pay",
      7: "auto_invoice",
      9: "last_invoice_date",
      10: "last_payment_date"
    };

    // --- Base student match ---
    const baseMatch = {
      isDeleted: false,
      role: 2,
      ...(tutorId && { _id: new mysqlOrm.Types.ObjectId(tutorId) }),
    };

    // --- Pipeline ---
    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "staff_auto_invoicings",
          let: { tutorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$tutorId", "$$tutorId"] } } },
            { $project: { _id: 0, invoiceDetails: 1, preferences: 1, isActive: 1 } },
            { $limit: 1 }
          ],
          as: "auto_invoice_settings"
        }
      },
      { $unwind: { path: "$auto_invoice_settings", preserveNullAndEmptyArrays: true } },
      // --- Transactions Lookup with typePriority and transactionDelta ---
      {
        $lookup: {
          from: "staff_transactions",
          let: { tutorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tutor_id", "$$tutorId"] },
                    { $eq: ["$deleted_at", null] },
                    ...(filterDate ? [{ $lte: ["$date", moment.utc(filterDate, "DD-MM-YYYY").endOf("day").toDate()] }] : [])
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                type: 1,
                amount: 1,
                date: 1,
                typePriority: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$type", "Payment"] }, then: 1 },
                      { case: { $eq: ["$type", "Discount"] }, then: 2 },
                      { case: { $eq: ["$type", "Refund"] }, then: 3 },
                      { case: { $eq: ["$type", "Charge"] }, then: 4 }
                    ],
                    default: 99
                  }
                },
                transactionDelta: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$type", "Charge"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                      { case: { $eq: ["$type", "Refund"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                      { case: { $eq: ["$type", "Discount"] }, then: { $ifNull: ["$amount", 0] } },
                      { case: { $eq: ["$type", "Payment"] }, then: { $ifNull: ["$amount", 0] } }
                    ],
                    default: 0
                  }
                }
              }
            },
            { $sort: { date: 1, typePriority: 1 } }
          ],
          as: "transactions"
        }
      },

       // --- Calculate balance in the pipeline BEFORE sorting ---
      {
        $addFields: {
          calculatedBalance: {
            $reduce: {
              input: "$transactions",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      { $isArray: "$$this.transactionDelta" },
                      0,
                      { $ifNull: ["$$this.transactionDelta", 0] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },

      // --- Last invoice ---
      {
        $lookup: {
          from: "staff_invoices",
          let: { tutorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$tutor_id", "$$tutorId"] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
            { $project: { date: 1 } }
          ],
          as: "lastInvoice"
        }
      },

      // --- Last payment ---
      {
        $lookup: {
          from: "staff_transactions",
          let: { tutorId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ["$tutor_id", "$$tutorId"] }, { $eq: ["$type", "Payment"] }, { $eq: ["$deleted_at", null] } ] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
            { $project: { date: 1 } }
          ],
          as: "lastPayment"
        }
      },

      ...(!showInactive ? [{ $match: { status: { $in: [1, 2, 3] } } }] : []),
      ...(searchStaff
      ? [
          
          {
            $addFields: {
              tutorFullName: {
                $concat: [
                  { $ifNull: ["$first_name", ""] },
                  " ",
                  { $ifNull: ["$last_name", ""] }
                ]
              }
            }
          },  
          {
            $match: {
              $or: [
                { tutorFullName: { $regex: searchStaff, $options: "i" } },
              ]
            }
          }
        ]
      : []),
      {
        $project: {
          _id: 1,
          tutorName: {
            $concat: [
              { $ifNull: ["$first_name", ""] },
              " ",
              { $ifNull: ["$last_name", ""] }
            ]
          },
          staffEmail: "$tutorEmail",
          auto_pay: 1,
          auto_invoice: 1,
          calculatedBalance: 1,
          auto_invoice_settings: 1,
          transactions: 1,  
          last_invoice_date: { $arrayElemAt: ["$lastInvoice.date", 0] },
          last_payment_date: { $arrayElemAt: ["$lastPayment.date", 0] }
        }
      }

    ];

    // --- Count ---
    const countResult = await User.aggregate([...pipeline, { $count: "total" }]);
    const recordsFiltered = countResult[0]?.total || 0;

    // --- Fetch paginated with case-insensitive sorting ---
      const sortStage = {};

      // Step 1: Add lowercase fields in the pipeline
      pipeline.push({
        $addFields: {
          staffName_sort: { $toLower: "$tutorName" }
        }
      });

      // Step 2: Determine which field to sort
      if (columnMap[orderColumnIndex] === "staffName") {
        sortStage["staffName_sort"] = orderDirection;
      } else if (columnMap[orderColumnIndex] === "balance") {
        // SPECIFIC FIX FOR BALANCE COLUMN: Sort by the calculatedBalance field
        sortStage["calculatedBalance"] = orderDirection;
      } else if (columnMap[orderColumnIndex]) {
        sortStage[columnMap[orderColumnIndex]] = orderDirection;
      } else {
        sortStage["staffName_sort"] = 1; // default
      }

      // Step 3: Aggregate with sort
      const paginatedResults = await User.aggregate([
        ...pipeline,
        { $sort: sortStage },
        { $skip: start },
        { $limit: length }
      ]);

    // --- Calculate derived balance per student ---
    const dataWithBalance = paginatedResults.map(entry => {
      return { 
        ...entry, 
        balance: entry.calculatedBalance || 0 
      };
    });

    const currency = globalConstant.currency;

    // --- Format for DataTables ---
    const data = dataWithBalance.map(entry => {
      const autoInvoiceSettings = entry.auto_invoice_settings;
      let invoiceSettingsHtml = formatAutoInvoice(autoInvoiceSettings, currency, entry.balance || 0, true);

      return {
        _id: entry._id,
        balance_txt: `${currency.symbol}${(entry.balance || 0).toFixed(2)}`,
        balance: (entry.balance || 0).toFixed(2),
        auto_invoice: entry.auto_invoice ? "Enabled" : "-",
        auto_pay: entry.auto_pay || null,
        auto_invoice_settings: entry.auto_invoice_settings || null,
        auto_invoice_setting: invoiceSettingsHtml,
        staff_name: entry.tutorName || "-",
        staff_email: entry.staffEmail || "-",
        last_invoice_date: entry.last_invoice_date || null,
        last_payment_date: entry.last_payment_date || null
      };
    });

    // --- Totals ---
    let prepaidTotal = 0, owedTotal = 0;
    dataWithBalance.forEach(entry => {
      const bal = entry.balance || 0;
      if (bal >= 0) prepaidTotal += bal;
      else owedTotal += bal;
    });

    return res.json({
      draw: req.body.draw,
      recordsTotal: recordsFiltered,
      recordsFiltered,
      data,
      totalPrepaid: prepaidTotal,
      totalOwed: Number(owedTotal.toFixed(2)),
      currency: `${currency.symbol}`
    });
  } catch (err) {
    console.error("Staff Accounts DataTable Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
}


function formatAutoInvoice(autoInvoiceSettings, currency, balance = 0, asHtml = false) {
  if (!autoInvoiceSettings) return asHtml ? "-" : null;

  const { invoiceDetails, preferences } = autoInvoiceSettings;

  const billingStart = moment(invoiceDetails?.billingCycleStartDate);
  const billingEnd = billingStart.clone().add(1, "month").subtract(1, "day");

  let nextInvoiceDate;
  if (invoiceDetails.invoiceCreationDate.option === "first_day_of_billing_cycle") {
    nextInvoiceDate = billingStart.clone();
  } else if (invoiceDetails.invoiceCreationDate.option === "choose_date") {
    nextInvoiceDate = moment(invoiceDetails.invoiceCreationDate.customDate);
  } else {
    nextInvoiceDate = billingStart.clone();
  }

  let freqLabel = invoiceDetails.autoInvoicingSchedule.frequency;
  if (freqLabel === "monthly") freqLabel = "month";
  else if (freqLabel === "yearly") freqLabel = "year";

  const obj = {
    nextInvoiceDate: nextInvoiceDate.format("DD-MM-YYYY"),
    billingRange: `${billingStart.format("DD-MM-YYYY")} to ${billingEnd.format("DD-MM-YYYY")}`,
    balanceForward: preferences?.balanceForward ? "Enabled" : "Disabled",
    autoEmail: preferences?.autoEmail ? "Enabled" : "Disabled",
    invoiceFor: invoiceDetails?.invoiceFor?.[0] === "upcoming_lessons" ? "Prepaid Lessons" : "Postpaid Lessons",
    repeatRule: `${invoiceDetails.autoInvoicingSchedule.frequency} on day ${billingStart.date()} every ${invoiceDetails.autoInvoicingSchedule.repeatsEvery} ${freqLabel}`,
    nextInvoiceBalance: `${currency.symbol}${(balance < 0 ? Math.abs(balance) : 0).toFixed(2)}`
  };

  // return HTML for datatable OR object for rendering
  if (asHtml) {
    return `
      <div class="auto-invoice-settings">
        <p class="m-1"><strong>Next Invoice:</strong> ${obj.nextInvoiceDate}</p>
        <p class="d-block m-1"><strong>Billing Period:</strong> ${obj.billingRange}</p>
        <p class="m-1"><strong>Balance Forward:</strong> ${obj.balanceForward}</p>
        <p class="m-1"><strong>Auto email:</strong> ${obj.autoEmail}</p>
        <p class="d-block m-1"><strong>Interval:</strong> ${obj.repeatRule}</p>
        <p class="d-block m-1"><strong>Next Invoice Balance:</strong> ${obj.nextInvoiceBalance}</p>
      </div>
    `;
  }

  return obj;
}

async function tutorAccountDetails(req, res) {
  try {
    const tutorId = req.params.id;
    if(!tutorId) return;

    const businessSettingValue = await globalHelper.getBusinessSettingValue('accounts');
    const invoiceTypes = globalConstant.invoice_types;

    const tutor = await User.findOne({ _id: tutorId }).lean();

    // Optional filter date
    const filterDate = req.query.filterDate ? new Date(req.query.filterDate) : null;

    const finalBalance = 0;
    const currency = globalConstant.currency;

    const userData = await User.findOne({ role: 1 }).lean();
    const sentFrom = [{ value: userData._id, label: `${userData.first_name} ${userData.last_name} <${userData.email}>` }];
    if(req.user.role != 1){
      sentFrom.push({ value: req.user._id, label: `${req.user.first_name} ${req.user.last_name} <${req.user.email}>` });
    }

    // Fetch auto-invoicing data
    const autoInvoice = await StaffAutoInvoicingSettings.findOne({
      tutorId,
      isActive: true,
    }).lean();

    const autoInvoiceDisplay = formatAutoInvoice(autoInvoice, currency, 0, false);
    
    let studentStatus = 0;

    return res.render("../views/admin/invoicing/staffInvoices/staffAccounts/staff-details", {
      tutor,
      contacts: [],
      filterDate,
      finalBalance,
      tutorId,
      ucwords: globalHelper.ucwords,
      businessSettingValue,
      currency,
      sentFrom,
      invoiceTypes,
      autoInvoiceDisplay,
    });

  } catch (error) {
    console.error("Family Details Error:", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

