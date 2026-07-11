const mysqlOrm = require('mysql-orm');
const moment = require("moment");
const User = require("../../models/User");
const BusinessSetting = require("../../models/BusinessSetting");
const ChargeCategory = require("../../models/ChargeCategory");
const FamilyContact = require("../../models/FamilyContacts");
const StaffTransaction = require("../../models/StaffTransaction");
const globalHelper = require("../../_helper/GlobalHelper");
const globalConstant = require("../../_helper/GlobalConstants");
const { saveTransaction } = require("../../services/StaffTransactionService");
const { generateReceipt, generateStaffTransactionReceipt } = require("../../services/attechmentService");

module.exports = {
  index,
  dataTable,
  create,
  edit,
  update,
  studentListByCompany,
  destroy,
  store,
  downloadReceipt,
};


/**
 * transaction index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    return res.render("../views/admin/invoicing/staffInvoices/index");
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}


async function dataTable(req, res) {
  try {
    const isChecked = (val) => val === true || val === "1" || val === 1;

    const {
      filterDate,
      filter_start_date,
      filter_end_date,
      tutorId,
      searchCategory = "",
      searchAmount = "",
      showZeroEntries,
      family_or_note = "",
      show_payments,
      show_refunds,
      show_charges,
      show_discounts,
    } = req.body;

    // --- Determine sort field robustly using DataTables columns if provided ---
    const columnIndex = Number(req.body.order?.[0]?.column ?? 0);
    const sortDir = (req.body.order?.[0]?.dir === "asc") ? 1 : -1;

    let sortField = "date";
    if (Array.isArray(req.body.columns) && req.body.columns[columnIndex]) {
      sortField = req.body.columns[columnIndex].data || req.body.columns[columnIndex].name || sortField;
    } else {
      const fallbackColumns = ["date", "type", "note"];
      sortField = fallbackColumns[columnIndex] || "date";
    }

    const skip = Number(req.body.start) || 0;
    const limit = Number(req.body.length) || 10;

    // ---- Parse date filters ----
    let parsedFilterStart = null;
    let parsedFilterEnd = null;
    if (moment(filterDate, "DD-MM-YYYY", true).isValid()) {
      parsedFilterStart = null;
      parsedFilterEnd = moment.utc(filterDate, "DD-MM-YYYY").endOf("day");
    }
    if (
      moment(filter_start_date, "DD-MM-YYYY", true).isValid() &&
      moment(filter_end_date, "DD-MM-YYYY", true).isValid()
    ) {
      parsedFilterStart = moment.utc(filter_start_date, "DD-MM-YYYY").startOf("day");
      parsedFilterEnd = moment.utc(filter_end_date, "DD-MM-YYYY").endOf("day");
    }

    // ---- Base match (adjusted to include recurring transactions that may have started before rangeEnd) ----
    let baseMatch = { isDeleted: false };
    const user_detail = res.locals.loggedUserInfo;

    // Tutor users should only see their own staff transactions.
    // Use the passed tutorId first, otherwise fall back to the logged-in tutor id.
    const requestedTutorId = req.body.tutorId || (user_detail?.role === 2 ? user_detail._id : null);
    if (requestedTutorId) {
      baseMatch.tutor_id = new mysqlOrm.Types.ObjectId(requestedTutorId);
    }

    // If there's a date range, include:
    //  - non-recurring transactions within [start, end]
    //  - recurring transactions whose base date is <= rangeEnd (so we can expand them into occurrences inside the range)
    if (parsedFilterStart && parsedFilterEnd) {
      baseMatch.$or = [
        { date: { $gte: parsedFilterStart.toDate(), $lte: parsedFilterEnd.toDate() } },
        { recurring: true, date: { $lte: parsedFilterEnd.toDate() } },
      ];
    } else if (parsedFilterEnd && !parsedFilterStart) {
      // single filterDate case handled as <= end (keeps old behavior but allows recurring base before end)
        baseMatch.$or = [
          { date: { $lte: parsedFilterEnd.toDate() } },
          { recurring: true, date: { $lte: parsedFilterEnd.toDate() } },
        ];
    }
    // else no date filtering applied at DB level (original behavior kept when no date filters provided)

    const includeTypes = [];
    if (isChecked(show_payments)) includeTypes.push("Payment");
    if (isChecked(show_refunds)) includeTypes.push("Refund");
    if (isChecked(show_charges)) includeTypes.push("Charge");
    if (isChecked(show_discounts)) includeTypes.push("Discount");
    if (includeTypes.length) baseMatch.type = { $in: includeTypes };

    if (searchAmount && !isNaN(parseFloat(searchAmount))) {
      baseMatch.amount = parseFloat(searchAmount);
    } else if (!showZeroEntries) {
      baseMatch.amount = { $ne: 0 };
    }

    // ---- Aggregation to fetch base documents (we will expand recurring in JS) ----
    const basePipeline = [
      { $match: baseMatch },

      {
        $lookup: {
          from: "charge_categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $lookup: {
          from: "events",
          let: { eventId: "$event_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$eventId"] } } },
            { $project: { _id: 1, name: 1, start_date: 1, start_time: 1, duration: 1 } },
          ],
          as: "event",
        },
      },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          let: { sid: "$tutor_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$sid"] } } }, { $project: { first_name: 1, last_name: 1 } }],
          as: "tutor",
        },
      },
      { $unwind: { path: "$tutor", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          computedTutorName: {
            $concat: [
              { $ifNull: ["$tutor.first_name", ""] },
              " ",
              { $ifNull: ["$tutor.last_name", ""] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          let: { sid: "$student_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$sid"] } } }, { $project: { first_name: 1, last_name: 1 } }],
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          computedStudentName: {
            $concat: [
              { $ifNull: ["$student.first_name", ""] },
              " ",
              { $ifNull: ["$student.last_name", ""] },
            ],
          },
        },
      },

      {
        $project: {
          tutor_id: 1,
          tutor_name: {
            $concat: [
              { $ifNull: ["$tutor.first_name", ""] },
              " ",
              { $ifNull: ["$tutor.last_name", ""] },
            ],
          },
          student_name: {
            $concat: [
              { $ifNull: ["$student.first_name", ""] },
              " ",
              { $ifNull: ["$student.last_name", ""] },
            ],
          },
          amount: 1,
          type: 1,
          date: 1,
          recurring: 1,
          recurring_info: 1,
          "category.name": 1,
          note: 1,
          "event._id": 1,
          "event.name": 1,
          "event.start_date": 1,
          "event.start_time": 1,
          "event.duration": 1,
          slug: 1,
        },
      },
    ];

    if (searchCategory) {
      const regex = new RegExp(searchCategory, "i");
      basePipeline.push({ $match: { $or: [{ type: regex }, { note: regex }, { "category.name": regex }] } });
    }
    if (family_or_note) {
      const searchTerm = family_or_note.trim();
      const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearchTerm, "i");

      basePipeline.push({
        $match: {
          $or: [{ note: regex }, { family: regex }, { tutor_name: regex }, { student_name: regex }],
        },
      });
    }

    // ---- Fetch base results ----
    const baseResults = await StaffTransaction.aggregate([...basePipeline]);

    // ---- recurring expansion helper ----
    const generateOccurrences = (item) => {
      if (!item.recurring || !Array.isArray(item.recurring_info) || !item.recurring_info.length) {
        return [item];
      }
      // if no date-range provided, return only base item (keeps previous behavior)
      if (!parsedFilterStart || !parsedFilterEnd) return [item];

      const info = item.recurring_info[0];
      const occs = [];
      const baseDate = item.date ? moment.utc(item.date).startOf("day") : null;
      // compute end bound as min(parsedFilterEnd, repeat_until if present)
      let rangeStart = parsedFilterStart.clone();
      let rangeEnd = parsedFilterEnd.clone();
      if (info.repeat_until && moment(info.repeat_until).isValid()) {
        const ru = moment.utc(info.repeat_until).endOf("day");
        if (ru.isBefore(rangeEnd)) rangeEnd = ru.clone();
      }

      // if baseDate after rangeEnd, then no occurrences
      if (baseDate && baseDate.isAfter(rangeEnd)) return [];

      const MAX_OCC = 20000; // safety cap
      const pushIfInRange = (m) => {
        if (m.isSameOrAfter(rangeStart) && m.isSameOrBefore(rangeEnd)) {
          const clone = { ...item };
          clone.date = m.toDate();
          clone.dateOnly = m.format("YYYY-MM-DD");
          clone._generated_from = item._id;
          occs.push(clone);
        }
      };

      if (!info.frequency || info.frequency === "daily") {
        let cur = rangeStart.clone();
        let cnt = 0;
        while (cur.isSameOrBefore(rangeEnd) && cnt < MAX_OCC) {
          if (!baseDate || cur.isSameOrAfter(baseDate)) {
            if (!info.repeat_days || !info.repeat_days.length) {
              pushIfInRange(cur);
            } else {
              const wd = cur.format("dddd").toLowerCase();
              if (info.repeat_days.map(d => d.toLowerCase()).includes(wd)) pushIfInRange(cur);
            }
          }
          cur.add(1, "day");
          cnt++;
        }
      } else if (info.frequency === "weekly") {
        const days = (info.repeat_days || []).map(d => d.toLowerCase());
        if (days.length === 0 && baseDate) days.push(baseDate.format("dddd").toLowerCase());
        let cur = rangeStart.clone();
        let cnt = 0;
        while (cur.isSameOrBefore(rangeEnd) && cnt < MAX_OCC) {
          const wd = cur.format("dddd").toLowerCase();
          if (days.includes(wd) && (!baseDate || cur.isSameOrAfter(baseDate))) {
            pushIfInRange(cur);
          }
          cur.add(1, "day");
          cnt++;
        }
      } else if (info.frequency === "monthly") {
        if (!baseDate) return [];
        const dayOfMonth = baseDate.date();
        let cur = rangeStart.clone().date(1).startOf("day");
        let cnt = 0;
        while (cur.isSameOrBefore(rangeEnd) && cnt < MAX_OCC) {
          const candidate = cur.clone().date(dayOfMonth);
          if (candidate.month() === cur.month()) {
            if (
              (!baseDate || candidate.isSameOrAfter(baseDate)) &&
              candidate.isSameOrAfter(rangeStart) &&
              candidate.isSameOrBefore(rangeEnd)
            ) {
              pushIfInRange(candidate);
            }
          }
          cur.add(1, "month");
          cnt++;
        }
       } else if (info.frequency === "yearly") {
          if (!baseDate) return [];
          const month = baseDate.month();
          const day = baseDate.date();
          let cur = rangeStart.clone().startOf('year');
          let cnt = 0;
          while (cur.isSameOrBefore(rangeEnd) && cnt < MAX_OCC) {
            const candidate = cur.clone().month(month).date(day);
            if (
              (!baseDate || candidate.isSameOrAfter(baseDate)) &&
              candidate.isSameOrAfter(rangeStart) &&
              candidate.isSameOrBefore(rangeEnd)
            ) {
              pushIfInRange(candidate);
            }
            cur.add(1, 'year');
            cnt++;
          }
        }
        else {
        // unknown frequency -> fallback to base
        return [item];
      }

      return occs;
    };

    // ---- Expand all baseResults into expandedRows ----
    let expandedRows = [];
    for (const doc of baseResults) {
      // ensure dateOnly exists for original docs
      if (!doc.dateOnly && doc.date) doc.dateOnly = moment.utc(doc.date).format("YYYY-MM-DD");
      const occ = generateOccurrences(doc);
      // If generateOccurrences returns [], keep the base doc only if base date is in range (for non-recurring or borderline)
      if (occ.length === 0 && (!doc.recurring || !parsedFilterStart)) {
        expandedRows.push(doc);
      } else {
        expandedRows.push(...occ);
      }
    }

    // ---- compute numeric/derived fields for each expanded row ----
    expandedRows = expandedRows.map((r) => {
      const item = { ...r };
      const amt = Number(item.amount) || 0;
      item.typePriority = (() => {
        switch (item.type) {
          case "Payment": return 1;
          case "Discount": return 2;
          case "Refund": return 3;
          case "Charge": return 4;
          default: return 99;
        }
      })();
      item.transaction = (["Refund", "Discount"].includes(item.type)) ? -1 * amt : amt;
      item.transactionDelta = (["Charge", "Refund"].includes(item.type)) ? -1 * amt : amt;
      item.displayAmount = (["Refund", "Discount"].includes(item.type)) ? -1 * amt : amt;
      if (!item.dateOnly && item.date) item.dateOnly = moment.utc(item.date).format("YYYY-MM-DD");
      return item;
    });

    // ---- records and totals ----
    const recordsFiltered = expandedRows.length;
    const recordsTotal = await StaffTransaction.countDocuments({ isDeleted: false });

    // owed total (sum of transactionDelta across expanded rows)
    const owedTotal = expandedRows.reduce((acc, x) => acc + (Number(x.transactionDelta) || 0), 0);

    // ---- compute running (derived) balance per student ----
    const grouped = {};
    for (const row of expandedRows) {
      const sid = String(row.student_id || "no_student");
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(row);
    }

    for (const sid of Object.keys(grouped)) {
      grouped[sid].sort((a, b) => {
        if (a.dateOnly < b.dateOnly) return -1;
        if (a.dateOnly > b.dateOnly) return 1;
        if ((a.typePriority || 0) > (b.typePriority || 0)) return -1;
        if ((a.typePriority || 0) < (b.typePriority || 0)) return 1;
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });

      let running = 0;
      for (const r of grouped[sid]) {
        running += Number(r.transactionDelta) || 0;
        r.derivedBalance = running;
      }
    }

    let finalRows = Object.values(grouped).flat();

    // ---- apply global sort according to requested sortField & sortDir (fix for "sorting not working") ----
    const applyGlobalSort = (arr) => {
      const dir = sortDir === 1 ? 1 : -1;
      arr.sort((a, b) => {
        if (sortField === "date" || sortField === "dateOnly") {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          if (da < db) return -1 * dir;
          if (da > db) return 1 * dir;
          if ((a.typePriority || 0) > (b.typePriority || 0)) return -1;
          if ((a.typePriority || 0) < (b.typePriority || 0)) return 1;
          return 0;
        } else if (["amount", "displayAmount", "transaction"].includes(sortField)) {
          const ta = Number(a.transaction || 0);
          const tb = Number(b.transaction || 0);
          if (ta < tb) return -1 * dir;
          if (ta > tb) return 1 * dir;
          return 0;
        } else if (sortField === "family") {
          const fa = (a.family_sort || "").toLowerCase();
          const fb = (b.family_sort || "").toLowerCase();
          if (fa < fb) return -1 * dir;
          if (fa > fb) return 1 * dir;
          return 0;
        } else {
          const va = a[sortField] ?? "";
          const vb = b[sortField] ?? "";
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        }
      });
      return arr;
    };

    finalRows = applyGlobalSort(finalRows);

    // ---- pagination ----
    const pageRows = finalRows.slice(skip, skip + limit);

    // ---- format response rows for DataTable ----
    const currency = globalConstant.currency;
    const data = pageRows.map((item) => {
      let noteTxt = item.note || "-";
      if (item.event) {
        const eventData = item.event;
        let timeTxt = "";
        try {
          timeTxt = eventData.start_time ? moment(eventData.start_time).format("h:mm A") : "";
        } catch (err) {
          timeTxt = "";
        }
        noteTxt = `${timeTxt}${eventData.duration ? ` (${eventData.duration} min.)` : ""} - ${item.note || ""}`.trim();
      }

      const derived = Number(item.derivedBalance) || 0;
      const displayAmt = typeof item.displayAmount !== "undefined" ? Number(item.displayAmount) : (Number(item.amount) || 0);

      return {
        _id: item._id,
        date: item.date ? moment(item.date).toISOString().split("T")[0] : "-",
        student_name: item.student_name || "",
        family: item.family || item.tutor_name,
        event: item.event?._id || null,
        transaction: item.transaction,
        currency: `${currency.symbol}`,
        amount: displayAmt,
        transaction_type: item.type,
        category: item.category?.name || "",
        note: noteTxt,
        derived_balance_txt: `${derived < 0 ? "-" : ""}${currency.symbol}${Math.abs(derived)}`,
        derived_balance: derived,
        recurring: item.recurring,
        action: item.slug,
      };
    });

    res.json({
      draw: req.body.draw,
      recordsTotal,
      recordsFiltered,
      data,
      owed: Number(owedTotal.toFixed(2)),
      currency: `${currency.symbol}`,
    });
  } catch (err) {
    console.error("Transaction DataTable error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}


async function create(req, res) {
  try {
    const roleId = res.locals.loggedUserInfo.role;

    const tutorId = req.params.tutorId || null;

    const business = await BusinessSetting.findOne();
    const paymentMethods = business?.family_contact_settings?.[0]?.payment_methods || [];
    const taxes = business?.sales_taxes || [];
    const chargeCategories = await globalHelper.getChargeCategories();

    const recurringFrequency = globalConstant.recurringFrequency;
    const repeatDays = globalConstant.repeatDays;
    const transactionTypes = globalConstant.transactionTypes;
    const currency = globalConstant.currency;

    let staffs;

    if (roleId == 1) {
      staffs = await globalHelper.getStaffsListForStaffInvoices();
    } else {
      staffs = await globalHelper.getStaffsListForStaffInvoices([tutorId]);
    }
    
    return res.render("../views/admin/invoicing/staffInvoices/transaction/create", {
      paymentMethods,
      chargeCategories,
      taxes,
      tutorId,
      staffs,
      transactionTypes,
      recurringFrequency,
      repeatDays,
      currency,
      staffsObj: JSON.stringify(staffs) ,
    });

  } catch (error) {
    console.error("Transaction Create Error:", error);
    return res.status(500).json({ message: "Something went wrong, please try again later." });
  }
}

async function store(req, res) {
  try {  
    const tutor_id =
      req.body.transaction_type === 'Payment' || req.body.transaction_type === "Refund"
        ? req.body.payment_tutor_id
        : req.body.charge_tutor_id;
          
    const transaction = await saveTransaction({
      user: res.locals.loggedUserInfo,
      tutor_id: tutor_id,
      ...req.body,  // automatically passes student_id, type, etc.
      payment_date: req.body.payment_refund_date ? moment(req.body.payment_refund_date, 'DD-MM-YYYY').toDate() : null,
      discount_date: req.body.charges_discount_date ? moment(req.body.charges_discount_date, 'DD-MM-YYYY').toDate() : null,
      type: req.body.transaction_type || null,
    });

    const redirectUrl = req.body.redirect_to || "/families-invoices";
    return res.status(200).json({
      success: true,
      message: "Transaction saved successfully.",
      redirectUrl: redirectUrl,
      data: transaction
    });
  } catch (error) {
    console.error("Error saving transaction:", error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

async function edit(req, res) {
  try {
    
    let id = req.params.id;
    const editTransaction = await StaffTransaction.findById(id).populate("tutor_id", "first_name last_name");
    
    if (!editTransaction) return res.status(404).json({ message: 'Not found' });
    const tutorId = editTransaction?.tutor_id?._id || null;

    const recurringFrequency = globalConstant.recurringFrequency;
    const repeatDays = globalConstant.repeatDays;
    const transactionTypes = globalConstant.transactionTypes;
    const currency = globalConstant.currency;
    const business = await BusinessSetting.findOne();  //get payment method
    const paymentMethods = business?.family_contact_settings?.[0]?.payment_methods || [];  //get payment method
    
    const chargeCategories = await globalHelper.getChargeCategories();
    
    const taxes = business?.sales_taxes || [];  // Get list of taxes
    
    const staffs = await globalHelper.getStaffsListForStaffInvoices();

    return res.render("../views/admin/invoicing/staffInvoices/transaction/edit", { 
      paymentMethods, 
      chargeCategories, 
      taxes, 
      staffs, 
      editTransaction, 
      transactionTypes, 
      recurringFrequency, 
      repeatDays, 
      tutorId, 
      currency, 
      staffsObj: JSON.stringify(staffs) 
    });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

function parseDate(dateStr, existingDate) {
  if (!dateStr) return existingDate || new Date();
  const [day, month, year] = dateStr.split('-').map(Number);

  // use time from existingDate if available, else current time
  const baseTime = existingDate ? new Date(existingDate) : new Date();

  return new Date(Date.UTC(
    year,
    month - 1,
    day,
    baseTime.getHours(),
    baseTime.getMinutes(),
    baseTime.getSeconds(),
    baseTime.getMilliseconds()
  ));
}

async function update(req, res) {
  try {
    const id = req.params.id;

    const {
      tutor_id,
      transaction_type,
      charge_type,
      payment_refund_date,
      payment_method,
      payment_refund_amount,
      charges_discount_amount,
      charges_discount_date,
      charges_discount_description,
      payment_refund_description,
      charge_taxes,
      category,
      recurring,
      recurring_info,
    } = req.body;

    // Determine which date field to use
    const selectedDate = ['Payment','Refund'].includes(transaction_type) ? payment_refund_date : charges_discount_date;

    const existingTx = await StaffTransaction.findById(id);
    if(!existingTx){
      return res.status(500).send("Something went wrong"); 
    }
    const parsedDate = selectedDate
      ? parseDate(selectedDate, existingTx?.date)
      : existingTx?.date || new Date();
    
    // Handle Payment/Refund
    if (transaction_type === 'Payment' || transaction_type === 'Refund') {
      const updateData = {
        payment_method: payment_method,
        amount: payment_refund_amount,
        note: payment_refund_description,
        date: parsedDate,
      };
      await StaffTransaction.findByIdAndUpdate(id, updateData, { new: true });

    } else if (transaction_type === 'Charge' || transaction_type === 'Discount') {
      const { frequency, repeat_days, repeat_until, repeat } = recurring_info || {};

      // --- Helper: max allowed date based on frequency ---
      function getMaxAllowedDate(frequency) {
        const now = new Date();
        let maxDate = new Date(now);
        switch ((frequency || "").toLowerCase()) {
          case "daily": maxDate.setMonth(maxDate.getMonth() + 6); break;
          case "weekly": maxDate.setMonth(maxDate.getMonth() + 12); break;
          case "monthly": maxDate.setMonth(maxDate.getMonth() + 15); break;
          case "yearly": maxDate.setMonth(maxDate.getMonth() + 24); break;
          default: maxDate.setMonth(maxDate.getMonth() + 15);
        }
        return maxDate;
      }

      let recurringInfo = [];
      if (recurring === '1' || recurring === true) {
        let finalRepeatUntil = repeat_until ? new Date(repeat_until) : null;
        const maxAllowed = getMaxAllowedDate(frequency);
        if (finalRepeatUntil && finalRepeatUntil > maxAllowed) finalRepeatUntil = maxAllowed;

        recurringInfo.push({
          frequency: frequency || null,
          repeat_days: Array.isArray(repeat_days) && repeat_days.length ? repeat_days : undefined,
          recurring_montly_on: ['monthly_on_day','monthly_on_date'].includes(repeat) ? repeat : undefined,
          repeat_until: finalRepeatUntil || undefined,
          // NOTE: repeat_indefinitely removed
        });
      }

      let chargeTaxes = [];
      if (Array.isArray(charge_taxes) && charge_taxes.length > 0) {
        const business = await BusinessSetting.findOne();
        const taxes = business?.sales_taxes || [];
        charge_taxes.forEach((charge_tax) => {
          const tax = taxes.find((t) => t._id.toString() === charge_tax.toString());
          if (tax) {
            chargeTaxes.push({
              _id: tax._id,
              tax_name: tax.tax_name,
              tax_rate: tax.tax_rate
            });
          }
        });
      }

      const updateData = {
        date: parsedDate,
        charge_type,
        amount: charges_discount_amount,
        note: charges_discount_description,
        charge_taxes: chargeTaxes,
        category: mysqlOrm.Types.ObjectId.isValid(category) ? category : undefined,
        recurring: !!recurring,
        recurring_info: recurringInfo.length ? recurringInfo : [],
      };
      await Transaction.findByIdAndUpdate(id, updateData, { new: true });
    }

    return res.redirect(`/staff-invoices/staff/${tutor_id}`);
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).send("Something went wrong");
  }
}


async function destroy(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Transaction.findByIdAndUpdate(
      id,
      { isDeleted: true, deleted_at: new Date() },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, message: "Transaction soft deleted successfully.", redirectUrl: "/families-invoices#transactions" });
  } catch (error) {
    console.error("Soft delete error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
}

// Get student list by family company user ID
async function studentListByCompany(req, res) {
  try {
    const { companyId: studentId } = req.params;

    // Find all families linked to this student
    const linkedFamilies = await FamilyContact.find({
      student_id: studentId,
      isDeleted: false
    });

    const familyUserIds = linkedFamilies.map(link => link.user_id);

    // Now get all students connected to these families (might include the same student or more)
    const familyStudentLinks = await FamilyContact.find({
      user_id: { $in: familyUserIds },
      isDeleted: false
    });

    const studentIds = familyStudentLinks.map(link => link.student_id);

    const students = await User.find({
      _id: { $in: studentIds },
      isDeleted: false,
      role: 3
    }, {
      first_name: 1,
      last_name: 1
    });

    return res.json({ students });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function downloadReceipt(req, res) {
  try {
    const { id } = req.params;

    // 1. Find transaction
    const transaction = await StaffTransaction.findById(id)
      .populate("tutor_id", "first_name last_name")
      .populate("created_by", "first_name last_name")
      .lean();

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // 2. Generate PDF buffer
    const pdfBuffer = await generateStaffTransactionReceipt(transaction);

    // if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    //   console.error("Invalid PDF buffer generated");
    //   return res.status(500).json({ success: false, message: "Failed to generate receipt" });
    // }

    // 3. Build safe filename
    const formattedDate = new Date().toISOString().split("T")[0];
    const studentName = (transaction?.tutor_id?.first_name || "staff")
      .replace(/[^a-z0-9]/gi, "_"); // sanitize to avoid issues in filename

    const fileName = `receipt_${studentName}_${formattedDate}.pdf`;

    // 4. Send response with proper headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.end(pdfBuffer);

  } catch (error) {
    console.error("downloadReceipt error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}








