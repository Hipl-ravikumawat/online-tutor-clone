const ChargeCategory = require("../../models/ChargeCategory");
const Transaction = require("../../models/Transaction");


module.exports = {
  index,
  store,
  edit,
  update,
  destroy,
  dataTable
};


/**
 * charge categories index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const charges = await ChargeCategory.find({ deleted_at: null });
    return res.render("../views/admin/invoicing/familyAndInvoices/charge-categories/index", { charges });
  } catch (error) {
    console.log(error, "error");
      return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dataTable of charges category.
 * @param {*} req
 * @param {*} res
 */

async function dataTable(req, res) {
  try {
    let searchStr = req.body.search.value;
    let searchQuery = {};

    if (searchStr) {
      const regex = new RegExp(searchStr, "i");
      searchQuery = { name: regex };
    }

    let column_name = ["name"][req.body.order[0].column] || "_id";
    let order_by = req.body.order[0].dir === "asc" ? 1 : -1;
    let sort = {};
    sort[column_name] = order_by;

    const baseFilter = { deleted_at: null };
    const finalQuery = { ...baseFilter, ...searchQuery };

    const [recordsTotal, recordsFiltered, results] = await Promise.all([
      ChargeCategory.countDocuments(baseFilter),
      ChargeCategory.countDocuments(finalQuery),
      ChargeCategory.find(finalQuery)
        .sort(sort)
        .skip(Number(req.body.start))
        .limit(Number(req.body.length))
        .select("name _id")
        .lean()
    ]);

    res.json({
      draw: req.body.draw,
      recordsTotal,
      recordsFiltered,
      data: results,
    });

  } catch (error) {
    console.error("DataTable Error:", error);
    return res.status(500).json({
      message: "Something went wrong while loading the charges.",
    });
  }
}


/**
 * charge categories store.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    await saveChargesCategories(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * charge categories edit.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    const ediCharge = await ChargeCategory.findById(req.params.id);
    if (!ediCharge) return res.status(404).json({ message: 'Not found' });
    res.json(ediCharge);
  } catch (error) {
    console.log("error");
      return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * charge categories update.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    const { _id, name } = req.body;

    if (!_id || !name) {
      return res.status(400).json({ success: false, message: "ID and name are required." });
    }

    const updated = await ChargeCategory.findByIdAndUpdate(
      _id,
      { name, updated_at: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Charge not found." });
    }

    res.json({ success: true, message: "Charge updated successfully.", data: updated, redirectUrl: "/families-invoices/categories" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error." });
  }
}


/**
 * charge categories delete.
 * @param {*} req
 * @param {*} res
 * @returns
 */

async function destroy(req, res) {
  try {
    const { id } = req.params;

    const isCategoryUsed = await Transaction.exists({ category: id, isDeleted: false });

    if (isCategoryUsed) {
      return res.status(400).json({
        success: false,
        message: "This category is used in transactions and cannot be deleted."
      });
    }
    
    const deleted = await ChargeCategory.findByIdAndUpdate(
      id,
      { deleted_at: new Date() },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Charge not found." });
    }

    res.json({ success: true, message: "Charge soft deleted successfully.", redirectUrl: "/families-invoices/categories" });
  } catch (error) {
    console.error("Soft delete error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
}

async function saveChargesCategories(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Charges name is required." });
    }

    const regex = new RegExp("^" + name + "$", "i");
    const existing = await ChargeCategory.findOne({ name: regex });
    let category = existing;
    if (existing) {
      const updateData = {
        deleted_at: null
      };
      
      await ChargeCategory.findByIdAndUpdate(existing._id, updateData, { new: false });
    }else{
      const newCharge = new ChargeCategory({ name });
      await newCharge.save();

      category = newCharge;
    }
    res.status(200).json({ "success": true, "category": category, redirectUrl: "/families-invoices/categories" });  
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong while saving the charge." });
    throw error;
  }
} 