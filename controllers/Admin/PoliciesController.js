const mysqlOrm = require('mysql-orm');
const fs = require("fs");
const path = require("path");
const Policy = require("../../models/Policy");
const User = require("../../models/User");

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,
  markAsRead,
  fetchPolicyReaders,
  policyReadersDataTable,
};

/**
 * index page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    let totalPolicies = await Policy.find({}).sort({ title: 1 }).count();

    let policyObj = {
      total: totalPolicies,
    };

    const policies = await Policy.find({}, "_id title").sort({ title: 1 });
    const user_detail = res.locals.loggedUserInfo;
    const userId = user_detail._id.toString();
    const userRole = user_detail.role;

    return res.render("../views/admin/policies/index", {
      policyObj: policyObj,
      policies: policies,
      moment: res.locals.moment,
      userId: userId,
      userRole:userRole,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dataTable page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dataTable(req, res) {
  try {
    let searchStr = req.body.search.value;
    let obj = {};
    const user_detail = res.locals.loggedUserInfo;
    const userRole = user_detail.role;

    if (req.body.policyId) {
      obj["_id"] = req.body.policyId;
    }

    if (searchStr) {
      let regex = new RegExp(searchStr, "i");
      searchStr = { $or: [{ title: regex }] };
    } else {
      searchStr = {};
    }

    let filter = ["title"];
    let sort = {};

    if (req.body.order == undefined) {
      sort = { _id: -1 };
    } else {
      let column_name = filter[req.body.order[0].column];
      let order_by = req.body.order[0].dir;
      sort = { [column_name]: order_by };
    }


    let [recordsTotal, recordsFiltered] = await Promise.all([
      Policy.count({}),
      Policy.count({ $and: [searchStr, obj, {}] }),
    ]);

    let results = await Policy.find(
      { $and: [{}, searchStr, obj] },
      "_id title attachment slug marked_as_read",
      { skip: Number(req.body.start), limit: Number(req.body.length) }
    )
      .sort(sort)
      .exec();

    let data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: results,
      userRole: userRole,
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
 * create policy.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    return res.render("../views/admin/policies/create");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store policy.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    if (req.file != undefined) {
      req.body.attachment = req.file.filename;
    } else {
      req.body.attachment = "";
    }

    const policy = await Policy.create(req.body);
    if (policy) {
      let crudMessage = "Policy created successfully!";
      req.flash("success", crudMessage);
      res.status(200).json({
        success: true,
        message: crudMessage,
        redirectUrl: "/policies",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
}

/**
 * edit policy.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let slug = req.params.slug;
    let policy = await Policy.findOne({ slug: slug });
    if (policy) {
      return res.render("../views/admin/policies/edit", {
        data: policy,
        fs: fs,
      });
    } else {
      return res.status(404).json({
        message: "Policy not found.",
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
 * update policy.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    let policyId = req.body.policy_id;

    if (!policyId || policyId.trim() === "") {
      return res.status(400).json({
        message: "Invalid policy ID.",
      });
    } else {
      let policy = await Policy.findOne({
        _id: policyId,
      });
      if (policy) {
        if (req.file != undefined) {
          let policyAttachment = policy.attachment;
          const filePath = "./assets/Policies/" + policyAttachment;
          if (policyAttachment != "") {
            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                console.log("File not found, so not deleting.");
              }
            });
          }
          req.body.attachment = req.file.filename;
          req.body.marked_as_read = [];
        }

        const policyUpdated = await Policy.findByIdAndUpdate(
          policyId,
          req.body
        );

        let crudMessage = "Policy updated successfully!";
        req.flash("success", crudMessage);
        res.status(200).json({
          success: true,
          message: crudMessage,
          redirectUrl: "/policies",
        });
      } else {
        let crudMessage = "Policy not found or already deleted!";
        req.flash("error", crudMessage);
        return res.status(400).json({
          success: false,
          message: crudMessage,
          redirectUrl: "/policies",
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
 * delete policy.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let policy_id = req.params.id;
    const policy = await Policy.findById(policy_id);

    if (policy) {
      let attachment = policy.attachment;
      if (attachment != "") {
        const filePath = "./assets/Policies/" + attachment;
        fs.exists(filePath, function (exists) {
          if (exists) {
            fs.unlinkSync(filePath);
          } else {
            console.log("File not found, so not deleted.");
          }
        });
      }

      await Policy.findByIdAndDelete(policy_id);
      let crudMessage = "The policy is deleted successfully!";
      req.flash("success", crudMessage);
      return res.status(200).json({
        success: true,
        message: crudMessage,
        redirectUrl: "/policies",
      });
    } else {
      let crudMessage = "Policy not found or already deleted!";
      req.flash("error", crudMessage);
      return res.status(400).json({
        success: false,
        message: crudMessage,
        redirectUrl: "/policies",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
      redirectUrl: "/policies",
    });
  }
}

/**
 * mark a policy as read.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function markAsRead(req, res) {
  try {
    const policy = await Policy.findById(req.params.policyId);
    const user_detail = res.locals.loggedUserInfo;

    if (policy) {
      let newObj = {
        tutor_id: user_detail._id.toString(),
        marked_at: res.locals.moment().format("YYYY-MM-DD"),
      };
      await Policy.findByIdAndUpdate(req.params.policyId, {
        $push: { marked_as_read: newObj },
      });

      let crudMessage = "The policy is marked as read successfully!";
      req.flash("success", crudMessage);
      return res.status(200).json({
        success: true,
        message: crudMessage,
        redirectUrl: "/policies",
      });
    } else {
      let crudMessage = "Policy not found or already deleted!";
      req.flash("error", crudMessage);
      return res.status(400).json({
        success: false,
        message: crudMessage,
        redirectUrl: "/policies",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
      redirectUrl: "/policies",
    });
  }
}

/**
 * fetch policy readers.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function fetchPolicyReaders(req, res) {
  try {
    const policy = await Policy.find({ slug: req.params.slug });   
    const tutors = await User.find(
      { isDeleted: false, role: 2 },
      "_id first_name last_name"
    ).sort({ created_at: -1 });

    const policyAttachedTutorIds = [];
    const markedData = policy[0].marked_as_read;
    let readAtObject = {};

    for (let data of markedData) {
      if(data.tutor_id !== undefined){
        policyAttachedTutorIds.push(data.tutor_id.toString());
        readAtObject[data.tutor_id] = data.marked_at;
      }
    }
    const allTutorIds = tutors.map((obj) => obj._id.toString());
    // Efficiently filter using Set for membership check
    const policyDetachedTutorIds = allTutorIds.filter(
      (id) => !new Set(policyAttachedTutorIds).has(id)
    );

    let policyStatics = {
      policyAttachedTutorIds: policyAttachedTutorIds,
      policyDetachedTutorIds: policyDetachedTutorIds,
    };


    return res.render("../views/admin/policies/policy_readers", {
      policy: policy[0],
      policyObj: policyStatics,
      tutors: tutors,
      readAtObject:readAtObject,
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
async function policyReadersDataTable(req, res) {
  try {
    let obj = {};
    const policyAttachedTutorIds = [];
    const policy = await Policy.findById(req.body.policyId);
    const markedData = policy.marked_as_read;
    const user_detail = res.locals.loggedUserInfo;

    for (data of markedData) {
      if(data.tutor_id !== undefined){
        policyAttachedTutorIds.push(data.tutor_id.toString());
      }
    }


    if (req.body.tutorId != '' && req.body.status == '') {
      obj["_id"] = req.body.tutorId;
    }

    if (req.body.tutorId == '' && req.body.status == "read") {
        obj["_id"] = { $in: policyAttachedTutorIds };
    }

    if (req.body.tutorId == '' && req.body.status == "unread") {
      obj["_id"] = { $nin: policyAttachedTutorIds };
    }


    if (req.body.tutorId != '' && req.body.status == "read") {
      let checkTutor = policyAttachedTutorIds.includes(req.body.tutorId);
      if(checkTutor){
        obj["_id"] = req.body.tutorId;
      }else{
        obj["_id"] = user_detail.id;

      }
    }

    if (req.body.tutorId != '' && req.body.status == "unread") {
      let checkTutor = !policyAttachedTutorIds.includes(req.body.tutorId);
      if(checkTutor){
        obj["_id"] = req.body.tutorId;
      } 
      else{
        obj["_id"] = user_detail.id;
      }
    }

    let searchStr = req.body.search.value;
    searchStr = searchStr.trimEnd();

    if (req.body.search.value) {
      var regex = new RegExp(req.body.search.value, "i");
      searchStr = {
        $or: [
          { first_name: regex },
          { last_name: regex },
          { email: regex },
          { phone: regex },
          {
            // Add full name search using aggregation pipeline
            $expr: {
              $regexMatch: {
                input: { $concat: ["$first_name", " ", "$last_name"] },
                regex: regex,
              },
            },
          },
        ],
      };
    } else {
      searchStr = {};
    }

    let userRole = user_detail.role;
    const filter = ["first_name", "last_name", "read_at","status"];
    let sort = {};
    if (req.body.order == undefined) {
      sort = { _id: -1 };
    } else {
      const column_name = filter[req.body.order[0].column];
      const order_by = req.body.order[0].dir;
      sort = { [column_name]: order_by };
    }
    var recordsTotal = 0;
    var recordsFiltered = 0;
    recordsTotal = await User.count({ role: 2 });
    recordsFiltered = await User.count({ $and: [{ role: 2 }, obj, searchStr] });
    let results = await User.find(
      { $and: [{ role: 2, isDeleted: false }, obj, searchStr] },
      "_id first_name last_name email status",
      { skip: Number(req.body.start), limit: Number(req.body.length) }
    ).sort(sort);
    var data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: results,
      userRole: userRole,
    });
    return res.send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}
