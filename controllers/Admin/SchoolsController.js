const School = require("../../models/School");
const User = require("../../models/User");
const mysqlOrm = require('mysql-orm');

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,
  updateStatus,
};

/**
 * list schools.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const schools = await School.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { _id: -1 } },
      {
        $group: {
          _id: null,
          schools: { $push: "$$ROOT" },
          totalSchool: { $sum: 1 },
          activeSchool: { $sum: { $cond: [{ $eq: ["$status", 1] }, 1, 0] } },
          deactiveSchool: { $sum: { $cond: [{ $eq: ["$status", 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0, // Remove the default "_id" field
          schools: "$schools",
          totalSchool: "$totalSchool",
          activeSchool: "$activeSchool",
          deactiveSchool: "$deactiveSchool",
        },
      },
      { $sort: { _id: -1 } },
    ]);
    const schoolData = {
      schoolObject: schools,
    };
    return res.render("../views/admin/schools/index", {
      data: schoolData,
      moment: res.locals.moment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dataTable
 * @param {*} req
 * @param {*} res
 */
async function dataTable(req, res) {
  try {
    let searchStr = req.body.search.value;
    let obj = {};

    if (req.body.id) {
      obj["_id"] = req.body.id;
    }

    if (req.body.status) {
      obj["status"] = req.body.status;
    }

    if (searchStr) {
      let regex = new RegExp(searchStr, "i");
      searchStr = {
        $or: [{ name: regex }, { email: regex }, { phone: regex }],
      };
    } else {
      searchStr = {};
    }

    let filter = ["name", "email", "phone", "status"];
    let sort = {};

    if (req.body.order == undefined) {
      sort = { _id: -1 };
    } else {
      let column_name = filter[req.body.order[0].column];
      let order_by = req.body.order[0].dir;
      sort = { [column_name]: order_by };
    }

    let [recordsTotal, recordsFiltered] = await Promise.all([
      School.count({ isDeleted: false }),
      School.count({ $and: [searchStr, obj, { isDeleted: false }] }),
    ]);

    let results = await School.find(
      { $and: [{ isDeleted: false }, searchStr, obj] },
      "_id name email dial_code phone status slug",
      { skip: Number(req.body.start), limit: Number(req.body.length) }
    )
      .sort(sort)
      .exec();

    let data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: results,
    });

    return res.send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create school.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    return res.render("../views/admin/schools/create");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store school.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    if (Array.isArray(req.body)) {
      await School.insertMany(req.body);
      req.flash("success", "School are created successfully!");
    } else {
      await School.create(req.body);
      req.flash("success", "School is created successfully!");
    }
    res.status(200).json({
      success: true,
      message: "School are created successfully!",
      redirectUrl: "/schools",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit school.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let slug = req.params.slug;
    // Directly fetch the single school document
    let school = await School.findOne({ slug: slug, isDeleted: false });
    if (school) {
      return res.render("../views/admin/schools/edit", { data: school });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update school.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.school_id && req.body.school_id != "") {
      const updatedSchool = await School.updateOne(
        { _id: req.body.school_id },
        req.body
      );
      if (updatedSchool.modifiedCount === 1) {
        req.flash("success", "School is updated successfully!");
        res.status(200).json({
          success: true,
          message: "School is updated successfully!",
          redirectUrl: "/schools",
        });
      } else {
        req.flash("error", "School not found or already updated.");
        res.status(404).json({
          success: false,
          message: "School not found or already updated.",
        });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete school.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let id = req.params.id;
    let isSchoolExist = await User.find({school_id: mysqlOrm.Types.ObjectId(id), isDeleted:false}).limit(1).count();
    if(isSchoolExist){
      return res.status(400).json({
        success: false,
        redirectUrl: "/schools",
        message: "This School is currently enrolled in a student and cannot be deleted at this time.",
      });
    }

    let schoolUpdates = { isDeleted: true, deleted_at: new Date() };
    let schoolDeleted = await School.findOneAndUpdate(
      { _id: id },
      schoolUpdates,
      {
        new: true,
      }
    );

    if (schoolDeleted) {
      req.flash("success", "School is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/schools",
        message: "School is deleted successfully.",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: "/schools",
        message: "School not found or already deleted.",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      success: false,
      redirectUrl: "/schools",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update status of a school.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid != "") {
      let status = req.body.status === "true" ? "1" : "0";
      let school = await School.findByIdAndUpdate(req.body.uid, {
        status: status,
      });

      res.status(200).json({
        success: true,
        message: "School status is updated successfully!",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}