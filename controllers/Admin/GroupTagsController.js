const GroupTag = require("../../models/GroupTag");
const User = require("../../models/User");
const mysqlOrm = require('mysql-orm');
const globalConstant = require("../../_helper/GlobalConstants");
const globalHelper = require("../../_helper/GlobalHelper");
const LearningContent = require("../../models/LearningContent");


module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,
};

/**
 * list groupTags.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    return res.render("../views/admin/group_tags/index", {
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
 * dataTable of groupTags.
 * @param {*} req
 * @param {*} res
 */
async function dataTable(req, res) {
  try {
    const tag_colors = globalConstant.tag_colors;

    let searchStr = req.body.search.value;
    let obj = {};

    if (req.body.id) {
      obj["_id"] = req.body.id;
    }

    if (req.body.status) {
      obj["is_active"] = req.body.status;
    }

    if (searchStr) {
      let regex = new RegExp(searchStr, "i");
      searchStr = { $or: [{ name: regex }] };
    } else {
      searchStr = {};
    }

    let filter = ["name", "active_status", "created_at"];
    let column_name = filter[req.body.order[0].column];
    let order_by = req.body.order[0].dir;
    let sort = {};

    if (!column_name) {
      sort = { _id: -1 };
    } else {
      sort = { [column_name]: order_by };
    }

    let [recordsTotal, recordsFiltered] = await Promise.all([
      GroupTag.count({ isDeleted: false }),
      GroupTag.count({ $and: [searchStr, obj, { isDeleted: false }] }),
    ]);

    let matchConditions = [
      { isDeleted: false }
    ];

    if (searchStr && typeof searchStr === 'object') {
      matchConditions.push(searchStr);
    }

    if (obj && typeof obj === 'object') {
      matchConditions.push(obj);
    }

    let results = await GroupTag.find({ $and: matchConditions })
    .populate('student_ids', '_id first_name last_name')
    .select('_id name student_ids color description created_at slug')
    .sort(sort || { created_at: -1 }) // fallback to created_at descending if sort is not defined
    .skip(Number(req.body.start) || 0)
    .limit(Number(req.body.length) || 10);
    
    const resultData = results.map((entry) => {
      const plainEntry = entry.toObject();
      const colorRecord = tag_colors.find((tagColor) => tagColor.key === entry.color);
      return {
        ...plainEntry,
        colorRecord: colorRecord || {}, // fallback to empty object if not found
      };
    });

    let data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: resultData,
    });

    return res.send(data);
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create groupTag.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    const userDetail = res.locals.loggedUserInfo;
    const userRole = userDetail.role;

    const tag_colors = globalConstant.tag_colors;
    const students = await globalHelper.getStudentsList(userRole);

    return res.render("../views/admin/group_tags/create", { tag_colors, students });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store groupTag.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    // normalize list of assigned students from form
    let studentIds = [];
    if (req.body.student_ids) {
      studentIds = Array.isArray(req.body.student_ids)
        ? req.body.student_ids
        : [req.body.student_ids];
      // make sure the document will contain an array (possibly empty)
      req.body.student_ids = studentIds;
    } else {
      req.body.student_ids = [];
    }

    // create the tag and then update any selected students so their
    // group_tag_id field reflects this tag (keeps two sides in sync)
    const created = await GroupTag.create(req.body);

    if (created && studentIds.length) {
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $set: { group_tag_id: created._id } }
      );
    }

    req.flash("success", "Group Tag is created successfully!");

    res.status(200).json({
      success: true,
      message: "Group Tag is created successfully!",
      redirectUrl: "/group-tags",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit groupTag.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    const userDetail = res.locals.loggedUserInfo;
    const userRole = userDetail.role;

    const tag_colors = globalConstant.tag_colors;
    const students = await globalHelper.getStudentsList(userRole);

    let slug = req.params.slug;

    // Directly fetch the single groupTag document
    let groupTag = await GroupTag.findOne({ slug: slug, isDeleted: false });

    if (groupTag) {
      return res.render("../views/admin/group_tags/edit", { data: groupTag, tag_colors, students: students });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update groupTag.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.group_tag_id && req.body.group_tag_id !== "") {
      const tagId = req.body.group_tag_id;

      // fetch existing student membership before modification
      const existingTag = await GroupTag.findById(tagId).select("student_ids");
      const previousIds = existingTag
        ? existingTag.student_ids.map((id) => id.toString())
        : [];

      // normalize incoming student_ids from form and ensure it's always an array
      let incomingIds = [];
      if (req.body.student_ids) {
        incomingIds = Array.isArray(req.body.student_ids)
          ? req.body.student_ids
          : [req.body.student_ids];
      }
      // make sure we update the document with an explicit array (could be empty)
      req.body.student_ids = incomingIds;

      const added = incomingIds.filter((id) => !previousIds.includes(id));
      const removed = previousIds.filter((id) => !incomingIds.includes(id));

      // perform the update on the tag itself
      const updatedGroupTag = await GroupTag.updateOne(
        { _id: tagId },
        req.body
      );

      // now sync users
      try {
        if (added.length) {
          await User.updateMany(
            { _id: { $in: added } },
            { $set: { group_tag_id: tagId } }
          );
        }
        if (removed.length) {
          await User.updateMany(
            { _id: { $in: removed } },
            { $set: { group_tag_id: null } }
          );
        }
      } catch (err) {
        console.error("error syncing students after updating tag", err);
      }

      if (updatedGroupTag.matchedCount > 0) {
        // even if nothing needed to be modified, we consider it a success
        req.flash("success", "Group Tag is updated successfully!");
        res.status(200).json({
          success: true,
          message: "Group Tag is updated successfully!",
          redirectUrl: "/group-tags",
        });
      } else {
        req.flash("error", "Group Tag not found.");
        res.status(404).json({
          success: false,
          message: "Group Tag not found.",
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
 * delete groupTag.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const redirectUrl = "/group-tags";
    const groupTagId = req.params.id;

    // Check if the groupTag ID is referenced in any student or learningContent document.
    let referencedInStudent = await User.find({
      isDeleted: false,
      role: 3,
      groupTag_id: mysqlOrm.Types.ObjectId(groupTagId),
    })
      .limit(1)
      .count();

    if (referencedInStudent) {
      return res.status(400).json({
        success: false,
        redirectUrl: redirectUrl,
        message:
          "This groupTag is currently enrolled in a student and cannot be deleted at this time.",
      });
    } 

    let referencedInLearningContent = await LearningContent.find({
      deleted_at: null,
      groupTag_id: mysqlOrm.Types.ObjectId(groupTagId),
    })
      .limit(1)
      .count();    
    
    if (referencedInLearningContent) {
      return res.status(400).json({
        success: false,
        redirectUrl: redirectUrl,
        message:
          "This groupTag is currently enrolled in a learning-content and cannot be deleted at this time.",
      });
    }

    // Group Tag ID is not referenced in any student or learningContent documents, proceed with deletion.
    const groupTagUpdates = { isDeleted: true, deleted_at: new Date() };
    const groupTagDeleted = await GroupTag.findOneAndUpdate(
      { _id: groupTagId },
      groupTagUpdates,
      { new: true }
    );

    if (groupTagDeleted) {
      req.flash("success", "Group Tag is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: redirectUrl,
        message: "Group Tag is deleted successfully.",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: redirectUrl,
        message: "Group Tag not found or already deleted.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      redirectUrl: redirectUrl,
      message: "Something went wrong, please try again later.",
    });
  }
}