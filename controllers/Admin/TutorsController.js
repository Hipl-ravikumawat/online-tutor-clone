const User = require("../../models/User");
const Topic = require("../../models/Topic");
const Assessment = require("../../models/Assessment");
const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");
const Policy = require("../../models/Policy");
const global = require("../../_helper/GlobalHelper");
const MailTemplates = require("../../_helper/MailTemplates");
const mysqlOrm = require('mysql-orm');
var slugify = require("slugify");
const fs = require("fs");
const mail = require("../../config/mail");
const randomstring = require("randomstring");
const GlobalConstants = require("../../_helper/GlobalConstants");

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

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`
  remove: undefined, // remove characters that match regex, defaults to `undefined`
  lower: true, // convert to lower case, defaults to `false`
  strict: false, // strip special characters except replacement, defaults to `false`
  locale: "en", // language code of the locale to use
  trim: true, // trim leading and trailing replacement chars, defaults to `true`
};

/**
 *  list tutors.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const tutors = await User.find({ role: 2, isDeleted: false }).sort({
      first_name: 1,
    });

    const subject = await Topic.find({ isDeleted: false, status: 1 }).sort({ name: 1 });
    const totalTutor = await User.find({ role: 2, isDeleted: false })
      .sort({ first_name: 1 })
      .count();

    const activeTutor = await User.find({
      $and: [{ role: 2 }, { status: 1 }, { isDeleted: false }],
    })
      .sort({ first_name: 1 })
      .count();

    const deactiveTutor = await User.find({
      $and: [{ role: 2 }, { status: 0 }, { isDeleted: false }],
    })
      .sort({ _id: -1 })
      .count();

    const tutorObject = {
      total: totalTutor,
      active: activeTutor,
      deactive: deactiveTutor,
    };

    return res.render("../views/admin/tutors/index", {
      data: tutors,
      fs: fs,
      subject: subject,
      tutorObject: tutorObject,
    });
  } catch (e) {
    console.log(e);
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
    let obj = {};
    let subject_ids = [];
    let sort = {};
    const user_detail = res.locals.loggedUserInfo;
    let userRole = user_detail.role;
    let searchStr = req.body.search.value;

    searchStr = searchStr.trimEnd();
  
    if (req.body.id) {
      obj["_id"] = mysqlOrm.Types.ObjectId(req.body.id);
    }

    if (req.body.tutor_subjects) {
      let tutor_subject_ids = req.body.tutor_subjects;
      subject_ids = tutor_subject_ids.map(function (element) {
        return mysqlOrm.Types.ObjectId(element);
      }, this);
      obj["subject_ids"] = { $in: subject_ids };
    }

    if (req.body.status) {
      obj["status"] = req.body.status;
    }

    if (req.body.search.value) {
      var regex = new RegExp(req.body.search.value, "i");
      searchStr = {
        $or: [
          { first_name: regex },
          { last_name: regex },
          { email: regex },
          { phone: regex },
          {
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

    const filter = [
      "",
      "first_name",
      "email",
      "dial_code",
      "subject_ids",
      "status",
      "action",
    ];

    if (req.body.order == undefined) {
      sort = { _id: -1 };
    } else {
      const column_name = filter[req.body.order[0].column];
      const order_by = req.body.order[0].dir;

      if(column_name == "first_name"){
        sort = { [column_name]: order_by, ["last_name"]: order_by };
      }
      else if(column_name == "status"){
        sort = { [column_name]: order_by };
      }
    }

    let recordsTotal = 0;
    let recordsFiltered = 0;
    recordsTotal = await User.count({ role: 2 });
    recordsFiltered = await User.count({ $and: [{ role: 2 }, obj, searchStr] });
    let results = await User.find(
      { $and: [{ role: 2, isDeleted: false }, obj, searchStr] },
      "_id profile_image email first_name last_name dial_code phone subject_ids status",
      { skip: Number(req.body.start), limit: Number(req.body.length) }
    )
      .populate("subject_ids")
      .sort(sort);

    var data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: results,
      userRole: userRole,
    });

    return res.send(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    let activeSubjects = await Topic.find({ isDeleted: false, status: 1 }).sort(
      { _id: -1 }
    );
    let timeZones = await global.timeZoneAustralia();
    let tutorPayrollTypes = GlobalConstants.tutorPayrollTypes;
    
    return res.render("../views/admin/tutors/create", { 
      data: activeSubjects,
      timeZones:timeZones,
      tutorPayrollTypes: tutorPayrollTypes 
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    if (req.file != undefined) {
      req.body.profile_image = req.file.filename;
    } else {
      req.body.profile_image = "";
    }

    // role for tutor
    req.body.role = 2;
    let requestData = req.body;
    
    if (req.body.password) {
      let hash = global.securePassword(req.body.password);
      req.body.password = hash;
    } else {
      delete req.body.password;
    }
    // get the mail template
    // const randomString = randomstring.generate();
    // req.body.token = randomString;
    // req.body.register_number = await global.generateRegistrationNo();
    
    let tutor = await User.create(req.body);
    if (tutor) {
      // const resetLink = global.baseUrl(req) + "/reset-password?token=" + randomString;
      // let messageTemplate = await MailTemplates.signUp(requestData,resetLink);
      // let mailMessage = messageTemplate.message;
      // let mailSubject = messageTemplate.subject;
  
      // let mailOptions = {
      //   from: process.env.APP_EMAIL,
      //   to: req.body.email,
      //   subject: mailSubject,
      //   html: mailMessage,
      // };
      // let sendmail = await mail.transporter.sendMail(mailOptions)

      req.flash("success", "Tutor is Created successfully! Please check your mail");
      res.status(200).json({
        success: true,
        message: "Tutor is created successfully!",
        redirectUrl: "/tutors",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let tutorId = req.params.id;
    let tutor = await User.find({ _id: tutorId, role: 2, isDeleted: false });
    let timeZones = await global.timeZoneAustralia();
    let tutorPayrollTypes = GlobalConstants.tutorPayrollTypes;

    if (tutor) {
      let activeCategories = await Topic.find({
        isDeleted: false,
        status: 1,
      }).sort({ name: 1 });
      return res.render("../views/admin/tutors/edit", {
        moment: res.locals.moment,
        data: tutor[0],
        subjects: activeCategories,
        fs: fs,
        timeZones:timeZones,
        tutorPayrollTypes: tutorPayrollTypes 
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.tutor_id && req.body.tutor_id != "") {
      let tutor = await User.find({
        _id: req.body.tutor_id,
        role: 2,
        isDeleted: false,
      });
      if (tutor) {
        tutorData = tutor[0];
        let tutorImage = tutorData.profile_image;
        const filePath = "./assets/ProfileImage/" + tutorImage;

        req.body.role = 2;
        if (req.body.password) {
          let hash = global.securePassword(req.body.password);
          req.body.password = hash;
        } else {
          delete req.body.password;
        }

        if (req.file != undefined) {
          if (tutorImage != "") {
            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });
          }

          req.body.profile_image = req.file.filename;

          let tutorUpdated = await User.findByIdAndUpdate(
            req.body.tutor_id,
            req.body
          );
        } else {
          if (req.body.is_remove == 1) {
            let tutorUpdated = await User.updateOne(
              { _id: req.body.tutor_id },
              {
                $set: {
                  subject_ids: req.body.subject_ids,
                  title: req.body.title,
                  first_name: req.body.first_name,
                  last_name: req.body.last_name,
                  start_date: req.body.start_date,
                  end_date: req.body.end_date,
                  gender: req.body.gender,
                  email: req.body.email,
                  phone: req.body.phone,
                  password: req.body.password,
                  address: req.body.address,
                  calendar_color: req.body.calendar_color,
                  qualification:req.body.qualification,
                  profile_image: "",
                  note: req.body.note,
                  dial_code: req.body.dial_code,
                  iso_code: req.body.iso_code,
                  status: req.body.status,
                  role: req.body.role,
                  time_zone: req.body.time_zone,
                  payroll: req.body.payroll,
                },
              }
            );
          } else {
            let tutorUpdated = await User.updateOne(
              { _id: req.body.tutor_id },
              {
                $set: {
                  subject_ids: req.body.subject_ids,
                  title: req.body.title,
                  first_name: req.body.first_name,
                  last_name: req.body.last_name,
                  start_date: req.body.start_date,
                  end_date: req.body.end_date,
                  gender: req.body.gender,
                  email: req.body.email,
                  phone: req.body.phone,
                  password: req.body.password,
                  address: req.body.address,
                  calendar_color: req.body.calendar_color,
                  qualification:req.body.qualification,
                  note: req.body.note,
                  dial_code: req.body.dial_code,
                  iso_code: req.body.iso_code,
                  status: req.body.status,
                  role: req.body.role,
                  time_zone: req.body.time_zone,
                  payroll: req.body.payroll,
                },
              }
            );
          }
        }
        req.flash("success", "Tutor is updated successfully!");
        res.status(200).json({
          success: true,
          message: "Tutor is updated successfully!",
          redirectUrl: "/tutors",
        });
      }
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update status of the tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid != "") {
      let status = req.body.status == "true" ? "1" : "0";
      let tutor = await User.findByIdAndUpdate(req.body.uid, {
        status: status,
      });

      res.status(200).json({
        success: true,
        message: "Tutor status is updated successfully!",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete tutor.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    let id = req.params.id;
    
    let isAssessmentExists = await Assessment.find({
      tutor_id: mysqlOrm.Types.ObjectId(id),
    })
      .limit(1)
      .count();

    if (isAssessmentExists) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/tutors",
        message:
          "This Tutor is currently enrolled in a assessment and cannot be deleted at this time",
      });
    }

    const isTrainingAssessmentExist = await TutorTrainingAssessment.find({
      tutor_ids: mysqlOrm.Types.ObjectId(id),
    })
      .limit(1)
      .count();
    if (isTrainingAssessmentExist) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/tutors",
        message:
          "This Tutor is currently enrolled in a training assessment and cannot be deleted at this time",
      });
    }

    const filter = { "marked_as_read.tutor_id": mysqlOrm.Types.ObjectId(id) };
    const policies = await Policy.find(filter);

    for (policy of policies) {
      const markedData = policy.marked_as_read;

      let newMarkedData = markedData.filter(
        (item) => item.tutor_id.toString() != id
      );
      let result = await Policy.findByIdAndUpdate(policy.id, {
        marked_as_read: newMarkedData,
      });
    }

    let tutorUpdates = { isDeleted: true, deleted_at: new Date() };
    let tutorDeleted = await User.findOneAndUpdate({ _id: id }, tutorUpdates, {
      new: true,
    });

    if (tutorDeleted) {
      //   const tutorImageFilePath = studentDeleted.profile_image;
      //   if (tutorImageFilePath != "") {
      //     const filePath = "./assets/ProfileImage/" + studentImageFilePath;
      //     fs.exists(filePath, function (exists) {
      //       if (exists) {
      //         fs.unlinkSync(filePath);
      //       } else {
      //         console.log("File not found, so not deleted.");
      //       }
      //     });
      //   }
      req.flash("success", "Tutor is deleted successfully!");
      return res.status(200).json({
        success: true,
        redirectUrl: "/tutors",
        message: "Tutor is deleted successfully!",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: "/tutors",
        message: "Tutor not found or already deleted.",
      });
      // req.flash("error", "Tutor not found or already deleted.");
      // return res.redirect("/tutors");
    }
  } catch {
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutors",
      message: "Something went wrong, please try again later.",
    });
  }
}