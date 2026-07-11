const User = require("../../models/User");
const School = require("../../models/School");
const Grade = require("../../models/Grade");
const Assessment = require("../../models/Assessment");
const global = require("../../_helper/GlobalHelper");
const mysqlOrm = require('mysql-orm');
const moment = require("moment");
const fs = require("fs");
const mail = require("../../config/mail");
const randomstring = require("randomstring");
const MailTemplates = require("../../_helper/MailTemplates");
const ChargeCategory = require("../../models/ChargeCategory");
const AssignedTutors = require("../../models/AssignedTutors");
const GlobalConstants = require("../../_helper/GlobalConstants");
const GroupTag = require("../../models/GroupTag");
const PointBalance = require("../../models/PointBalance");
const Event = require("../../models/Event");
const EventCourse = require("../../models/EventCourse");
const Lesson = require("../../models/Lesson");
const LessonVersion = require("../../models/LessonVersions");

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,
  updateStatus,
  renderStudents,
  updateAutoInvoiceStatus,
  viewSession,
  getStudentEvents,
};

/**
 * list students.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    let students = [];
    let totalStudent = 0;
    let activeStudent = 0;
    let trialStudent = 0;
    let waitingStudent = 0;
    let deactiveStudent = 0;

    const user_detail = res.locals.loggedUserInfo;
    if (user_detail.role == 2) {
      if (attachedStudentIds && attachedStudentIds.length > 0) {
        students = await User.find({
          _id: { $in: attachedStudentIds },
          isDeleted: false,
          role: 3,
        }, '_id role first_name last_name').sort({ first_name: 1 });

        totalStudent = attachedStudentIds?.length !== undefined ? attachedStudentIds?.length : 0;
        [
          activeStudent,
          trialStudent,
          waitingStudent,
          deactiveStudent,
        ] = await Promise.all([
          User.countDocuments({
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
            status: 1
          }),
          User.countDocuments({
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
            status: 2
          }),
          User.countDocuments({
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
            status: 3
          }),
          User.countDocuments({
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
            status: 0
          }),
        ]);
      }
    } else {
      [
        students,
        totalStudent,
        activeStudent,
        trialStudent,
        waitingStudent,
        deactiveStudent,
      ] = await Promise.all([
        User.find({ isDeleted: false, role: 3 }).sort({ first_name: 1 }),
        User.countDocuments({ role: 3, isDeleted: false }),
        User.countDocuments({ role: 3, isDeleted: false, status: 1 }),
        User.countDocuments({ role: 3, isDeleted: false, status: 2 }),
        User.countDocuments({ role: 3, isDeleted: false, status: 3 }),
        User.countDocuments({ role: 3, isDeleted: false, status: 0 }),
      ]);
    }

    const grades = await Grade.find({ isDeleted: false, status: 1 }).sort({ name: 1 });

    const studentObject = {
      total: totalStudent,
      active: activeStudent,
      trial: trialStudent,
      waiting: waitingStudent,
      deactive: deactiveStudent,
    };

    return res.render("../views/admin/students/index", {
      fs: fs,
      studentObject: studentObject,
      students: students,
      grade: grades,
      userRole: user_detail.role,
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
    let obj = {};
    let searchStr = req.body.search.value;
    const user_detail = res.locals.loggedUserInfo;

    searchStr = searchStr.trimEnd();

    if (req.body.id) {
      obj["_id"] = mysqlOrm.Types.ObjectId(req.body.id);
    }
    if (req.body.grade) {
      obj["grade_id"] = req.body.grade;
    }
    if (req.body.status) {
      obj["status"] = req.body.status;
    }
    if (req.body.search.value) {
      var regex = new RegExp(req.body.search.value, "i");
      searchStr = {
        $or: [{ first_name: regex }, { email: regex }, { phone: regex }, { username: regex },
        { // Add full name search using aggregation pipeline
          $expr: {
            $regexMatch: {
              input: { $concat: ["$first_name", " ", "$last_name"] },
              regex: regex
            }
          }
        }],
      };
    } else {
      searchStr = {};
    }

    const filter = [
      "",
      "first_name",
      "username",
      "email",
      "dial_code",
      "awarded_reward_points",
      "grade_id",
      "status",
      "action",
    ];

    let sort = {};
    if (req.body.order == undefined) {
      sort = { _id: -1 };
    } else {
      const column_name = filter[req.body.order[0].column];
      const order_by = req.body.order[0].dir;
      if (column_name == "first_name") {

        sort = {
          [column_name]: order_by,
          ["last_name"]: order_by
        };

      } else {

        sort = { [column_name]: order_by };

      }
    }

    if (user_detail.role == 2) {
      if (req.body.id) {
        obj["_id"] = mysqlOrm.Types.ObjectId(req.body.id);
      } else {
        obj["_id"] = { $in: attachedStudentIds };
      }
    }

    let recordsTotal = 0;
    let recordsFiltered = 0;
    User.count({ $and: [{ role: 3 }, obj, searchStr] }, function (err, c) {
      recordsTotal = c;
      User.count({ $and: [{ role: 3 }, obj, searchStr] }, function (err, c) {
        recordsFiltered = c;
        User.find(
          { $and: [{ role: 3, isDeleted: false }, obj, searchStr] },
          "_id profile_image email first_name last_name username dial_code phone status",
          { skip: Number(req.body.start), limit: Number(req.body.length) },
          async function (err, results) {
            if (err) {
              console.log("error while getting results" + err);
              return;
            }

            // Get all student ids
            const userIds = results.map(item => item._id);

            // Fetch reward points
            const pointBalances = await PointBalance.find({
              userId: { $in: userIds }
            }).lean();

            // Create map for fast lookup
            const pointMap = {};

            pointBalances.forEach(item => {
              pointMap[item.userId.toString()] = item.balance || 0;
            });

            // Attach points in response
            results = results.map(item => {
              const student = item.toObject();
              student.awarded_reward_points =
                pointMap[item._id.toString()] || 0;
              return student;

            });

            if (filter[req.body.order?.[0]?.column] === "awarded_reward_points") {
              const order_by = req.body.order[0].dir;
              results.sort((a, b) => {
                const pointsA = a.awarded_reward_points || 0;
                const pointsB = b.awarded_reward_points || 0;
                return order_by === "asc"
                  ? pointsA - pointsB
                  : pointsB - pointsA;
              });
            }

            var data = JSON.stringify({
              draw: req.body.draw,
              recordsFiltered: recordsFiltered,
              recordsTotal: recordsTotal,
              data: results,
            });
            return res.send(data);
          }
        )
          .populate("grade_id")
          .sort(sort);
      });
    });
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * create student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    let schools = await School.find({ isDeleted: false, status: 1 }).sort({ _id: -1 });
    let grade = await Grade.find({ isDeleted: false, status: 1 });
    let timeZones = await global.timeZoneAustralia();
    const category = GlobalConstants.lessonCategory.map(cat => ({ _id: cat.key, name: cat.label }));
    let groupTags = await GroupTag.find({ isDeleted: false, active_status: true }).sort({ name: 1 });

    const tutors = await User.find({
      $or: [
        { role: 2, status: 1, isDeleted: false },
        // { role: 3, status: 1, isDeleted: false },
      ],
    }).sort({ role: 1, first_name: 1 });
    // let tutors = relatedUsers.filter((user) => user.role === 2);

    return res.render("../views/admin/students/create", {
      data: schools,
      grade: grade,
      timeZones: timeZones,
      categories: category,
      tutors: tutors,
      groupTags: groupTags,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store student.
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

    if (!req.body.school_id || req.body.school_id === "") {
      delete req.body.school_id;
    }
    // set role for students
    req.body.role = 3;
    req.body.account_number = await global.generateAccountNo();

    if (!req.body.email || req.body.email === "") {
      delete req.body.email;
    } else {
      req.body.email = req.body.email.toLowerCase().trim();
    }

    if (!req.body.phone || req.body.phone === "") {
      delete req.body.phone;
      delete req.body.dial_code;
      delete req.body.iso_code;
    }

    // Generate username BEFORE creating the document
    try {
      req.body.username = await User.generateUniqueUsername(
        req.body.first_name,
        req.body.last_name,
        req.body.email
      );
    } catch (usernameError) {
      console.error("Username generation error:", usernameError);
      // Fallback username
      req.body.username = `student_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }


    if (req.body.password) {
      let hash = global.securePassword(req.body.password);
      req.body.password = hash;
    } else {
      delete req.body.password;
    }
    // get the mail template
    const randomString = randomstring.generate();


    req.body.token = randomString;
    let requestData = req.body;
    if (!req.body.group_tag_id || req.body.group_tag_id === "") {
      delete req.body.group_tag_id;
    }
    let student = await User.create(req.body);

    // maintain group tag membership if one was chosen
    if (student && req.body.group_tag_id) {
      try {
        await GroupTag.updateOne(
          { _id: req.body.group_tag_id },
          { $addToSet: { student_ids: student._id } }
        );
      } catch (err) {
        console.error('Failed to add student to group tag during store', err);
      }
    }

    if (req.body.assign_tutor === 'true') {
      const {
        tutor_id,
        default_lesson_category,
        default_duration,
        default_price,
        default_billing
      } = req.body;

      await AssignedTutors.create({
        student_id: student._id,
        tutor_id,
        default_lesson_category,
        default_duration,
        price: default_price,
        default_billing,
        deleted_at: null,
      });
    }

    if (student) {
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

      req.flash("success", "Student is created successfully! Please check your mail.");
      res.status(200).json({
        success: true,
        message: "Student is created successfully!",
        redirectUrl: "/students",
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
 * edit student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    let StudentId = req.params.id;
    let schools = await School.find({ isDeleted: false, status: 1 }).sort({ _id: -1 });
    let grade = await Grade.find({ isDeleted: false, status: 1 });
    let student = await User.find({ _id: StudentId, isDeleted: false });
    let timeZones = await global.timeZoneAustralia();
    let groupTags = await GroupTag.find({ isDeleted: false, active_status: true }).sort({ name: 1 });
    const redirectUrl = req.query.redirect || "/students";

    let start_date = res.locals
      .moment(student[0].start_date)
      .format("YYYY-MM-DD");
    let birth_day = res.locals
      .moment(student[0].birth_day)
      .format("YYYY-MM-DD");
    if (student) {
      return res.render("../views/admin/students/edit", {
        data: student[0],
        grade: grade,
        school_data: schools,
        start_date: start_date,
        birth_day: birth_day,
        fs: fs,
        timeZones: timeZones,
        groupTags: groupTags,
        redirectUrl: redirectUrl
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
 * update student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.student_id && req.body.student_id != "") {
      const redirectUrl = req.body.redirectUrl || "/students";
      let studentData = await User.findOne({
        _id: req.body.student_id,
        isDeleted: false,
      });

      if (studentData) {
        
        let profileImage = studentData.profile_image;
        const filePath = "./assets/profileImage/" + profileImage;

        // Prepare update data object
        let updateData = {};

        // Handle basic fields
        const fieldsToUpdate = ['title', 'first_name', 'last_name', 'gender', 'time_zone',
          'birth_day', 'grade_id', 'school_id', 'group_tag_id', 'referrer', 'status',
          'start_date', 'end_date', 'note', 'ndis_number', 'address'];

        fieldsToUpdate.forEach(field => {
          if (req.body[field] !== undefined) {
            if (req.body[field] === "") {
              updateData[field] = null;
            } else {
              updateData[field] = req.body[field];
            }
          }
        });

        // Handle school_id
        if (req.body.school_id === "") {
          updateData.school_id = null;
        }

        // Handle group_tag_id
        if (!req.body.group_tag_id || req.body.group_tag_id === "") {
          updateData.group_tag_id = null;
        }

        // Handle email for students (optional)
        // Handle email for students (optional)
        let unsetData = {};

        if (studentData.role === 3) {
          if (!req.body.email || req.body.email === "") {
            unsetData.email = "";
          } else {
            updateData.email = req.body.email.toLowerCase().trim();
          }
        } else {
          if (req.body.email && req.body.email !== "") {
            updateData.email = req.body.email.toLowerCase().trim();
          }
        }

        // Handle phone for students (optional)
        if (studentData.role === 3) {
          if (!req.body.phone || req.body.phone === "") {
            updateData.phone = null;
            updateData.dial_code = null;
            updateData.iso_code = null;
          } else {
            updateData.phone = req.body.phone;
            updateData.dial_code = req.body.dial_code;
            updateData.iso_code = req.body.iso_code;
          }
        } else {
          // For non-students, phone is required
          if (req.body.phone && req.body.phone !== "") {
            updateData.phone = req.body.phone;
            updateData.dial_code = req.body.dial_code;
            updateData.iso_code = req.body.iso_code;
          }
        }

        // Handle send_sms
        if (req.body.send_sms !== undefined) {
          updateData.send_sms = req.body.send_sms == 1 ? 1 : 0;
        }

        // Handle password
        if (req.body.password && req.body.password !== "") {
          updateData.password = global.securePassword(req.body.password);
        }

        // Generate username for student if missing
        if (studentData.role === 3 && !studentData.username) {
          updateData.username = await User.generateUniqueUsername(
            req.body.first_name || studentData.first_name,
            req.body.last_name || studentData.last_name,
            updateData.email || studentData.email
          );
        }

        // Handle profile image
        if (req.file != undefined) {
          // Delete old image if exists
          if (profileImage && profileImage != "") {
            fs.existsSync(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              }
            });
          }
          updateData.profile_image = req.file.filename;
        }

        // Update the student
        let updateQuery = { $set: updateData };
        if (Object.keys(unsetData).length > 0) {
          updateQuery.$unset = unsetData;
        }

        let student = await User.findByIdAndUpdate(
          req.body.student_id,
          updateQuery,
          { new: true, runValidators: false }
        );

        // sync the group tag membership if changed
        try {
          const oldTag = studentData.group_tag_id ? studentData.group_tag_id.toString() : null;
          const newTag = req.body.group_tag_id ? req.body.group_tag_id.toString() : null;

          if (oldTag !== newTag) {
            // remove from old tag if there was one
            if (oldTag) {
              await GroupTag.updateOne(
                { _id: oldTag },
                { $pull: { student_ids: mysqlOrm.Types.ObjectId(req.body.student_id) } }
              );
            }
            // add to new tag if present
            if (newTag) {
              await GroupTag.updateOne(
                { _id: newTag },
                { $addToSet: { student_ids: mysqlOrm.Types.ObjectId(req.body.student_id) } }
              );
            }
          }
        } catch (err) {
          console.error('Failed to sync group tag membership during update', err);
        }
      } else {
        delete req.body.profile_image;
        let student = await User.findByIdAndUpdate(
          req.body.student_id,
          req.body
        );

        try {
          const oldTag = studentData?.group_tag_id ? studentData.group_tag_id.toString() : null;
          const newTag = req.body.group_tag_id ? req.body.group_tag_id.toString() : null;

          if (oldTag !== newTag) {
            if (oldTag) {
              await GroupTag.updateOne(
                { _id: oldTag },
                { $pull: { student_ids: mysqlOrm.Types.ObjectId(req.body.student_id) } }
              );
            }
            if (newTag) {
              await GroupTag.updateOne(
                { _id: newTag },
                { $addToSet: { student_ids: mysqlOrm.Types.ObjectId(req.body.student_id) } }
              );
            }
          }
        } catch (err) {
          console.error('Failed to sync group tag membership during update', err);
        }
      }
      req.flash("success", "Student is updated successfully!");
      res.status(200).json({
        success: true,
        message: "Student is updated successfully!",
        redirectUrl: redirectUrl,
      });
    }
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update status of a student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid != "") {
      let status = req.body.status;

      const validStatuses = [0, 1, 2, 3];
      if (!validStatuses.includes(parseInt(status))) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Must be 0, 1, 2, or 3."
        });
      }

      let tutor = await User.findByIdAndUpdate(req.body.uid, {
        status: status,
      });
      res.status(200).json({
        success: true,
        message: "Student status is updated successfully!",
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
 * delete student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const id = req.params.id;

    const isAssessmentExist = await Assessment.find({ student_ids: mysqlOrm.Types.ObjectId(id), isDeleted: false }).limit(1).count();
    if (isAssessmentExist) {
      return res.status(400).json({
        success: false,
        redirectUrl: "/students",
        message:
          "This Student is currently enrolled in a assessment and cannot be deleted at this time.",
      });
    }
    let studentUpdates = { isDeleted: true, deleted_at: new Date() };
    let studentDeleted = await User.findOneAndUpdate(
      { _id: id },
      studentUpdates,
      {
        new: true,
      }
    );
    if (studentDeleted) {
      // remove the student from any group tags they belonged to
      try {
        await GroupTag.updateMany(
          { student_ids: mysqlOrm.Types.ObjectId(id) },
          { $pull: { student_ids: mysqlOrm.Types.ObjectId(id) } }
        );
      } catch (err) {
        console.error('Failed to remove student from group tags during delete', err);
      }

      //   const studentImageFilePath = studentDeleted.profile_image;
      //   if (studentImageFilePath != "") {
      //     const filePath = "./assets/ProfileImage/" + studentImageFilePath;
      //     fs.exists(filePath, function (exists) {
      //       if (exists) {
      //         fs.unlinkSync(filePath);
      //       } else {
      //         console.log("File not found, so not deleted.");
      //       }
      //     });
      //   }
      req.flash("success", "Student is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/students",
        message: "Student is deleted successfully.",
      });
    } else {
      return res.status(400).json({
        success: false,
        redirectUrl: "/students",
        message: "Something went wrong, please try again later.",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/students",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * render-students of a grade.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function renderStudents(req, res) {
  try {
    let students = await User.find({
      role: 3,
      grade_id: req.params.gradeId,
      status: 1,
      isDeleted: false,
    })
      .select("_id first_name last_name")
      .sort({ first_name: 1 });
    return res.send(students);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update status of a student.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateAutoInvoiceStatus(req, res) {
  try {
    const selectedStudentIds = req.body.student_ids;
    if (selectedStudentIds && selectedStudentIds.length > 0) {
      let status = req.body.status == "enable" ? true : false;
      await User.updateMany(
        { _id: { $in: selectedStudentIds } },
        { $set: { auto_invoice: status } }
      );

      res.status(200).json({
        success: true,
        message: "Selected students auto-invoice status is updated successfully!",
      });
    } else {

      return res.status(400).json({
        success: false,
        message: "No student IDs provided.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

async function viewSession(req, res) {
  try {
    const studentId = req.params.studentId;
    const student = await User.findOne({ _id: studentId, isDeleted: false }).select("first_name last_name");
    if (!student) {
      req.flash("error", "Student not found.");
      return res.redirect("/students");
    } else {
      return res.render("admin/students/viewSession/ViewSessionDetails", { student });
    }
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong, please try again later.");
    return res.redirect("/students");
  }
}

/**
 * Get student events with lessons
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function getStudentEvents(req, res) {
  try {

    const { studentId, start = 0, length = 5, draw = 1 } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required",
      });
    }

    const eventQuery = {
      student_ids: new mysqlOrm.Types.ObjectId(studentId),
      isDeleted: false,
      $or: [
        { parent_event_id: null },
        { parent_event_id: { $exists: false } }
      ]
    };

    const totalRecords = await Event.countDocuments(eventQuery);

    const events = await Event.find(eventQuery)

      .populate({
        path: "tutor_id",
        select: "first_name last_name",
      })

      .populate({
        path: "event_course_id",
      })

      .select(`
        tutor_id
        start_date
        start_time
        end_time
        event_course_id
        parent_event_id
      `)

      .sort({
        start_date: -1,
        start_time: -1
      })

      .skip(Number(start))
      .limit(Number(length))
      .lean();

    const lessonIds = [];

    events.forEach((event) => {
      if (
        event.event_course_id &&
        Array.isArray(event.event_course_id.content)
      ) {
        event.event_course_id.content.forEach((item) => {
          if (item.lesson_id) {
            lessonIds.push(item.lesson_id.toString());
          }
        });
      }
    });

    // remove duplicate lesson ids
    const uniqueLessonIds = [...new Set(lessonIds)];

    // fetch lesson versions
    const lessonVersions = await LessonVersion.find({
      _id: { $in: uniqueLessonIds }
    })
      .select("title")
      .lean();

    // create lesson title map
    const lessonTitleMap = {};

    lessonVersions.forEach((lesson) => {
      lessonTitleMap[lesson._id.toString()] = lesson.title;
    });

    // FORMAT EVENTS
    const formattedEvents = events
      .map((event) => {

        let lessons = [];

        if (
          event.event_course_id &&
          Array.isArray(event.event_course_id.content)
        ) {

          lessons = event.event_course_id.content
            .filter((item) => item.lesson_id)
            .map((item, index) => {

              return {

                lesson_id: item.lesson_id,

                lesson_name:
                  lessonTitleMap[item.lesson_id.toString()] ||
                  `Lesson ${index + 1}`,

                status: item.status || "N/A",

                slides_count: item.slides?.length || 0,
              };
            });
        }

        return {

          event_id: event._id,

          tutor: event.tutor_id
            ? {
                tutor_id: event.tutor_id._id,

                tutor_name:
                  `${event.tutor_id.first_name || ""} ${event.tutor_id.last_name || ""}`.trim(),
              }
            : null,

          start_date: event.start_date,

          start_time: event.start_time,

          end_time: event.end_time,

          lessons,
        };
      })

    return res.status(200).json({

      draw: Number(draw),

      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,

      data: formattedEvents,
    });

  } catch (error) {

    console.error("getStudentEvents Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}