const Grade = require("../../models/Grade");
const LearningContent = require("../../models/LearningContent");
const User = require("../../models/User");
const mysqlOrm = require('mysql-orm');
var slugify = require("slugify");

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`.
  remove: undefined, // remove characters that match regex, defaults to `undefined`.
  lower: true, // convert to lower case, defaults to `false`.
  strict: false, // strip special characters except replacement, defaults to `false`.
  locale: "en", // language code of the locale to use.
  trim: true, // trim leading and trailing replacement chars, defaults to `true`.
};

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  updateStatus,
  destroy,
};

/**
 * list grades.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const grades = await Grade.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { name: 1 } },
      {
        $group: {
          _id: null,
          grades: { $push: "$$ROOT" },
          totalGrade: { $sum: 1 },
          activeGrade: { $sum: { $cond: [{ $eq: ["$status", 1] }, 1, 0] } },
          deactiveGrade: { $sum: { $cond: [{ $eq: ["$status", 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0, // Remove the default "_id" field
          grades: "$grades",
          totalGrade: "$totalGrade",
          activeGrade: "$activeGrade",
          deactiveGrade: "$deactiveGrade",
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const gradeData = {
      gradeObject: grades,
    };

    return res.render("../views/admin/grades/index", {
      data: gradeData,
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
 * dataTable of grades.
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
      searchStr = { $or: [{ name: regex }] };
    } else {
      searchStr = {};
    }

    let filter = ["name", "status", "created_at"];
    let column_name = filter[req.body.order[0].column];
    let order_by = req.body.order[0].dir;
    let sort = {};

    if (!column_name) {
      sort = { _id: -1 };
    } else {
      sort = { [column_name]: order_by };
    }

    let [recordsTotal, recordsFiltered] = await Promise.all([
      Grade.count({ isDeleted: false }),
      Grade.count({ $and: [searchStr, obj, { isDeleted: false }] }),
    ]);

    let results = await Grade.find(
      { $and: [{ isDeleted: false }, searchStr, obj] },
      "_id name status created_at slug",
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
 * create grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    return res.render("../views/admin/grades/create");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    if (Array.isArray(req.body)) {
      await Grade.insertMany(req.body);
      req.flash("success", "Grades are created successfully!");
    } else {
      await Grade.create(req.body);
      req.flash("success", "Grade is created successfully!");
    }

    res.status(200).json({
      success: true,
      message: "Grades are created successfully!",
      redirectUrl: "/grades",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let slug = req.params.slug;

    // Directly fetch the single grade document
    let grade = await Grade.findOne({ slug: slug, isDeleted: false });

    if (grade) {
      return res.render("../views/admin/grades/edit", { data: grade });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.grade_id && req.body.grade_id !== "") {
      const updatedGrade = await Grade.updateOne(
        { _id: req.body.grade_id },
        req.body
      );

      if (updatedGrade.modifiedCount === 1) {
        req.flash("success", "Grade is updated successfully!");
        res.status(200).json({
          success: true,
          message: "Grade is updated successfully!",
          redirectUrl: "/grades",
        });
      } else {
        req.flash("error", "Grade not found or already updated.");
        res.status(404).json({
          success: false,
          message: "Grade not found or already updated.",
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
 * update status of the grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid !== "") {
      let status = req.body.status === "true" ? "1" : "0";
      let grade = await Grade.findByIdAndUpdate(req.body.uid, {
        status: status,
      });

      res.status(200).json({
        success: true,
        message: "Grade status is updated successfully!",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const gradeId = req.params.id;

    // Check if the grade ID is referenced in any student or learningContent document.
    let referencedInStudent = await User.find({
      isDeleted: false,
      role: 3,
      grade_id: mysqlOrm.Types.ObjectId(gradeId),
    })
      .limit(1)
      .count();

    if (referencedInStudent) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/grades",
        message:
          "This grade is currently enrolled in a student and cannot be deleted at this time.",
      });
    } 

    let referencedInLearningContent = await LearningContent.find({
      deleted_at: null,
      grade_id: mysqlOrm.Types.ObjectId(gradeId),
    })
      .limit(1)
      .count();    
    
    if (referencedInLearningContent) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/grades",
        message:
          "This grade is currently enrolled in a learning-content and cannot be deleted at this time.",
      });
    }

    // Grade ID is not referenced in any student or learningContent documents, proceed with deletion.
    const gradeUpdates = { isDeleted: true, deleted_at: new Date() };
    const gradeDeleted = await Grade.findOneAndUpdate(
      { _id: gradeId },
      gradeUpdates,
      { new: true }
    );

    if (gradeDeleted) {
      req.flash("success", "Grade is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/grades",
        message: "Grade is deleted successfully.",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: "/grades",
        message: "Grade not found or already deleted.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/grades",
      message: "Something went wrong, please try again later.",
    });
  }
}