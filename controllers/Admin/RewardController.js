const mysqlOrm = require('mysql-orm');
const template = require("../../config/template");
const User = require("../../models/User");
const Voucher = require("../../models/Voucher");
const VoucherHistory = require("../../models/VoucherHistory");
const PointSystem = require("../../models/PointSystem");
const PointBalance = require("../../models/PointBalance");
const PointHistory = require("../../models/PointHistory");
const PointTransaction = require("../../models/PointTransaction");
const Event = require("../../models/Event");
const EventAttendance = require("../../models/EventAttendance");
const global = require("../../_helper/GlobalHelper");
const appCurrency = process.env.APP_CURRENCY;
const appSymbol = process.env.APP_SYMBOL;
const appPointAssignmentModificationPeriod = process.env.Point_Assignment_Modification_Period;
const appPointRedemptionGapDuration = process.env.Point_Redemption_Gap_Weeks;

module.exports = {
  //------ Vouchers CRUD
  vouchers,
  voucherDataTable,
  storeVoucher,
  editVoucher,
  updateVoucher,
  destroyVoucher,

  //------ PointSystem Configuration
  pointSystem,
  updatePointSystemValues,

  //------ Assign/Manipulation Points
  assignPoints,
  storeAssignedPoints,
  updatePointBalance,

  //------ Points History 
  fetchAssignedPoints,
  pointsHistory,
  pointHistoryTable,

  //------ Voucher Request
  requestVoucherForm,
  storeRedemptionRequest,
  redemptionRequests,
  voucherHistoryTable,
  fetchVoucherRejectionDetail,
  updateVoucherRequestStatus
}

/**
 * vouchers
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function vouchers(req, res) {
  try {
    const user_detail = res.locals.loggedUserInfo;
    const voucherCount = await Voucher.countDocuments({ isDeleted: false });
    return res.render("../views/admin/rewards/vouchers", { voucherCount: voucherCount, user_detail: user_detail });
  } catch (error) {
    console.error("vouchers: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * voucherDataTable
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function voucherDataTable(req, res) {
  try {
    let html = "";
    const vouchers = await Voucher.find({ isDeleted: false }).sort({
      created_at: -1,
    });

    if (vouchers.length > 0) {
      vouchers.forEach((voucher, i) => {
        html += template.render({
          voucher,
          i,
          appCurrency,
          appSymbol
        }, "/rewards/voucherRow.ejs");
      });
    } else {
      html += `<div class="no_lesson"><h3 class="title-text ">No Vouchers Found.</h3></div>`;
    }

    return res.send(html);
  } catch (error) {
    console.error("voucherDataTable: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later."
    });
  }
}

/**
 * storeVoucher
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function storeVoucher(req, res) {
  try {
    await Voucher.create(req.body);
    req.flash("success", "Voucher is created successfully.");
    return res.status(201).json({
      success: true,
      message: "Voucher is created successfully.",
    });
  } catch (error) {
    console.error("storeVoucher: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later."
    });
  }
}

/**
 * editVoucher
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function editVoucher(req, res) {
  try {
    const slug = req.params.slug;
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Voucher slug is required.",
      });
    }

    const voucher = await Voucher.findOne({ slug: slug, isDeleted: false });
    if (voucher) {
      req.flash("success", "Voucher data fetched successfully.");
      return res.status(200).json({
        success: true,
        voucher: voucher,
        message: "Voucher data fetched successfully.",
      });
    } else {
      req.flash("error", "Voucher not found.");
      return res.status(404).json({
        success: false,
        message: "Voucher not found.",
        redirectUrl: "page-reload"
      });
    }
  } catch (error) {
    console.error("editVoucher: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updateVoucher
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function updateVoucher(req, res) {
  try {
    const { slug } = req.body;
    if (!slug || typeof slug !== 'string' || slug.trim() !== '') {
      const voucher = await Voucher.findOne({ slug: slug }).lean();

      if (voucher) {
        const isAttachedInVoucherHistory = await VoucherHistory.countDocuments({
          voucherId: mysqlOrm.Types.ObjectId(voucher.id),
          status: 'Pending'
        });

        if (isAttachedInVoucherHistory > 0) {
          req.flash("error", "This voucher is already requested by a student, so it can't be updated.");
          return res.status(403).json({
            success: false,
            redirectUrl: "page-reload",
            message: "This voucher is already requested by a student, so it can't be updated.",
          });
        }

        const updatedVoucher = await Voucher.updateOne({ slug: slug }, req.body);
        if (updatedVoucher.modifiedCount === 1) {
          req.flash("success", "Voucher updated successfully.");
          return res.status(200).json({
            success: true,
            message: "Voucher updated successfully.",
            redirectUrl: "page-reload"
          });
        } else {
          req.flash("error", "Voucher not found or already updated.");
          return res.status(404).json({
            success: false,
            message: "Voucher not found or already updated.",
            redirectUrl: "page-reload"
          });
        }
      } else {
        req.flash("error", "Voucher not found.");
        return res.status(404).json({
          success: false,
          message: "Voucher not found.",
          redirectUrl: "page-reload"
        });
      }
    } else {
      req.flash("error", "Voucher slug must be a non-empty string.");
      return res.status(400).json({
        success: false,
        message: "Voucher slug must be a non-empty string.",
        redirectUrl: "page-reload"
      });
    }
  } catch (error) {
    console.error("updateVoucher: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later."
    });
  }
}


/**
 * destroyVoucher
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function destroyVoucher(req, res) {
  try {
    const voucherId = req.params.voucherId.toString();

    if (!voucherId || !mysqlOrm.Types.ObjectId.isValid(voucherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing voucherId.",
        redirectUrl: "page-reload",
      });
    }

    if (req.params.voucherId !== '') {
      const isAttachedInVoucherHistory = await VoucherHistory.countDocuments({
        voucherId: mysqlOrm.Types.ObjectId(voucherId),
      });

      if (isAttachedInVoucherHistory) {
        req.flash("error", "This voucher is already requested by a student, So it can't be updated.");
        return res.status(403).json({
          success: false,
          redirectUrl: "page-reload",
          message: "This voucher is already requested by a student, So it can't be updated.",
        });
      }

      const voucherUpdates = { isDeleted: true, deleted_at: new Date() };
      const voucherDeleted = await Voucher.findByIdAndUpdate(
        voucherId,
        voucherUpdates,
        { new: true }
      );

      if (voucherDeleted) {
        req.flash("success", "Voucher is deleted successfully.");
        return res.status(200).json({
          success: true,
          redirectUrl: "page-reload",
          message: "Voucher is deleted successfully.",
        });
      } else {
        req.flash("error", "Voucher not found or already deleted.");
        return res.status(400).json({
          success: false,
          redirectUrl: "page-reload",
          message: "Voucher not found or already deleted.",
        });
      }
    } else {
      req.flash("error", "voucherId not found.");
      return res.status(400).json({
        success: false,
        message: "voucherId not found.",
        redirectUrl: "page-reload"
      });
    }
  } catch (error) {
    console.error("destroyVoucher: ", error);
    return res.status(500).json({
      success: false,
      redirectUrl: "page-reload",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * pointSystem
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function pointSystem(req, res) {
  try {
    const pointSystem = await PointSystem.findOne().lean();
    if (!pointSystem) {
      return res.status(404).json({
        success: false,
        message: "Point system data not found.",
      });
    }
    return res.render("../views/admin/rewards/point_system", { pointSystem });
  } catch (error) {
    console.error("pointSystem: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updatePointSystemValues
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function updatePointSystemValues(req, res) {
  try {
    const existingPointSystem = await PointSystem.findOne();
    if (existingPointSystem) {
      await PointSystem.deleteMany();
    }

    const newPointSystem = await PointSystem.create(req.body);
    req.flash("success", "Point system values updated successfully.");
    return res.status(200).json({
      success: true,
      message: "Point system values updated successfully.",
      data: newPointSystem,
    });
  } catch (error) {
    console.error("updatePointSystemValues: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}


/**
 * assignPoints
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function assignPoints(req, res) {
  try {
    const eventId = req.params.eventId;
    const eventData = await Event.findById(eventId).select('_id  event_attendance_id student_ids start_time').lean();

    if (!eventData) {
      req.flash('error', 'Event not found.');
      return res.redirect('back');
    }

    if (!eventData.student_ids || eventData.student_ids.length === 0) {
      req.flash('error', 'No students associated with this event.');
      return res.redirect('back');
    }

    if (eventData.event_attendance_id === null) {
      req.flash('error', 'Event attendance not marked. Please mark the attendance for all students first.');
      return res.redirect('back');
    }

    const attendance = await EventAttendance.findOne({ event_id: eventId })
      .select('attendees tutor_id').populate({
        path: 'attendees.student_id',
        select: '_id first_name last_name ',
      }).lean();

    if (!attendance || !attendance.attendees || attendance.attendees.length === 0) {
      req.flash('error', 'Attendance data for the event is not available.');
      return res.redirect('back');
    }

    const loggedUser = res.locals.loggedUserInfo;

    if (attendance.tutor_id.toString() !== loggedUser._id.toString()) {
      req.flash('error', `You do not have permission to mark attendance. Only the event's designated tutor is authorized to do so.`);
      return res.redirect('back');
    }

    const unrecordedStudents = attendance.attendees.filter(attendanceRecord => {
      return attendanceRecord.status === 'unrecorded';
    });

    if (unrecordedStudents.length > 0) {
      req.flash('error', 'Attendance has not been marked for all students.');
      return res.redirect('back');
    }

    const studentAttendances = attendance.attendees
      .filter(attendanceRecord => attendanceRecord.status === 'present') // Filter for students who are present
      .map(attendanceRecord => {
        return {
          attendance_id: attendanceRecord._id,
          student_id: attendanceRecord.student_id._id,
          first_name: attendanceRecord.student_id.first_name,
          last_name: attendanceRecord.student_id.last_name,
          status: attendanceRecord.status,
          std_was_late: attendanceRecord.std_was_late,
          marked_at: attendanceRecord.marked_attendance_at,
        };
      });

    const pointSystem = await PointSystem.findOne().lean();
    const performanceMetricsSum = await global.maxPointsAssignmentToStd() ?? 0;
    const moment = res.locals.moment;
    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;
    const eventStartDate = moment.utc(eventData.start_time).tz(loggedUserSpecificTimezone);
    const weekStart = eventStartDate.clone().startOf('isoWeek');
    const weekEnd = eventStartDate.clone().endOf('isoWeek');
    let currentDate = moment.utc().tz(loggedUserSpecificTimezone);
    let pointAssignmentModificationPeriod = pointSystem?.pointAssignmentModificationPeriod || appPointAssignmentModificationPeriod;
    let daysAfterWeekEnd = weekEnd.clone().add(pointAssignmentModificationPeriod, 'days');
    let showAddFormButton = currentDate.isBetween(weekStart, daysAfterWeekEnd, null, '[]');

    const pointsHistory = await PointHistory.find({
      tutorId: loggedUser._id.toString(),
      weekStart: weekStart.format('YYYY-MM-DD'),
      weekEnd: weekEnd.format('YYYY-MM-DD'),
    }, "_id studentId totalPoints").populate({
      path: 'studentId',
      select: '_id first_name last_name ',
    }).lean();

    if (!showAddFormButton && pointsHistory.length !== 0) {
      return res.redirect('/rewards/points-history'); // Changed redirection.
    } else {
      return res.render("../views/admin/rewards/assign_points", {
        performanceMetricsSum: performanceMetricsSum,
        eventAttendees: studentAttendances,
        pointSystem: pointSystem,
        eventId: eventId,
        pointsHistory: pointsHistory,
        showAddFormButton: showAddFormButton,
      });
    }
  } catch (error) {
    console.error("assignPoints: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * storeAssignedPoints
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function storeAssignedPoints(req, res) {
  try {
    const { eventId, attendees, attendingClassOnTime, askingQuestions, homeworkSubmission, participatingClassActivities, bonusPoints } = req.body;

    const pointConfig = await PointSystem.findOne().lean();

    if (!pointConfig) {
      return res.status(500).json({
        success: false,
        message: "Point system configuration not found.",
      });
    }

    const eventData = await Event.findById(eventId).select('_id start_time event_attendance_id').populate({
      path: "event_attendance_id",
      model: "event_attendances",
      select: { _id: 1, tutor_id: 1 },
    }).lean();

    if (!eventData) {
      return res.status(500).json({
        success: false,
        message: "Event not found.",
      });
    }

    const loggedUser = res.locals.loggedUserInfo;

    if (eventData.event_attendance_id?.tutor_id.toString() !== loggedUser._id.toString()) {
      req.flash('error', `You do not have permission to mark attendance. Only the event's designated tutor is authorized to do so.`);
      return res.status(500).json({
        success: false,
        message: "You do not have permission to mark attendance. Only the event's designated tutor is authorized to do so.",
      });
    }

    const moment = res.locals.moment;
    const loggedUserSpecificTimezone = res.locals.loggedUserInfo.time_zone;
    const eventStartDate = moment.utc(eventData.start_time).tz(loggedUserSpecificTimezone);
    const weekStart = eventStartDate.clone().startOf('isoWeek').format('YYYY-MM-DD'); // (Monday)
    const weekEnd = eventStartDate.clone().endOf('isoWeek').format('YYYY-MM-DD'); // (Saturday)
    const marksTimestamp = new Date();

    const records = await Promise.all(attendees.map(async (studentId) => {
      const pointsAssigned = {
        attendingClassOnTime: {
          marks: attendingClassOnTime === 'on' ? pointConfig.attendingClassOnTime : 0,
          received_at: attendingClassOnTime === 'on' ? marksTimestamp : null,
        },
        askingQuestions: {
          marks: askingQuestions === 'on' ? pointConfig.askingQuestions : 0,
          received_at: askingQuestions === 'on' ? marksTimestamp : null,
        },
        homeworkSubmission: {
          marks: homeworkSubmission === 'on' ? pointConfig.homeworkSubmission : 0,
          received_at: homeworkSubmission === 'on' ? marksTimestamp : null,
        },
        participatingClassActivities: {
          marks: participatingClassActivities === 'on' ? pointConfig.participatingClassActivities : 0,
          received_at: participatingClassActivities === 'on' ? marksTimestamp : null,
        },
        bonusPoints: {
          marks: bonusPoints === 'on' ? pointConfig.bonusPoints : 0,
          received_at: bonusPoints === 'on' ? marksTimestamp : null,
        },
      };

      const totalPoints = Object.values(pointsAssigned).reduce((sum, item) => sum + item.marks, 0);

      const existingRecord = await PointHistory.findOne({
        tutorId: loggedUser._id.toString(),
        studentId,
        weekStart,
        weekEnd,
      }).lean();

      if (existingRecord) {
        const updatedRecord = await PointHistory.findByIdAndUpdate(existingRecord._id,
          {
            pointsAssigned,
            totalPoints,
            comment: "",
            updated_at: marksTimestamp,
          },
          {
            new: true, // Return the updated document
            upsert: true, // Create a new document if none is found
          }
        );
        await updatePointBalance(studentId, updatedRecord);
        return updatedRecord;
      } else {
        const newRecord = new PointHistory({
          tutorId: loggedUser._id.toString(),
          studentId,
          weekStart,
          weekEnd,
          pointsAssigned,
          totalPoints,
          comment: "",
        });
        await newRecord.save();
        await updatePointBalance(studentId, newRecord);
        return newRecord;
      }
    }));

    req.flash("success", "Points recorded successfully.");
    return res.status(201).json({
      success: true,
      message: "Points recorded successfully.",
    });
  } catch (error) {
    console.error("storeAssignedPoints: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * fetchAssignedPoints
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function fetchAssignedPoints(req, res) {
  try {
    const pointHistoryId = req.params.pointHistoryId;
    const record = await PointHistory.findById(pointHistoryId).select('_id tutorId studentId pointsAssigned totalPoints weekStart weekEnd').populate({
      path: 'studentId',
      select: '_id first_name last_name ',
    }).populate({
      path: 'tutorId',
      select: '_id first_name last_name ',
    }).lean();

    if (record) {
      const moment = res.locals.moment;
      const weekStart = moment(record.weekStart);
      const weekEnd = moment(record.weekEnd);
      const weekStartFormatted = weekStart.toDate();
      const weekEndFormatted = weekEnd.toDate();
      let tutorId = record?.tutorId?._id.toString();
      let studentId = record?.studentId?._id.toString();

      const eventData = await Event.findOne({
        $or: [
          { tutor_id: mysqlOrm.Types.ObjectId(tutorId) },
          { student_ids: { $in: [mysqlOrm.Types.ObjectId(studentId)] } }
        ],
        event_attendance_id: { $ne: null },
        start_time: {
          $gte: weekStartFormatted,
          $lt: weekEndFormatted
        }, isDeleted: false
      }).select('_id').limit(1).lean();

      if (!eventData) {
        return res.status(404).json({
          success: false,
          message: "Something went wrong, please try again later.",
        });
      }

      const performanceMetricsSum = await global.maxPointsAssignmentToStd() ?? 0;
      return res.status(200).json({
        success: true,
        record: record,
        eventId: eventData._id,
        performanceMetricsSum: performanceMetricsSum,
        message: "Point history data fetched successfully.",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }
  } catch (error) {
    console.error("fetchAssignedPoints: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updatePointBalance
 * @param {*} studentId 
 * @param {*} pointHistoryRecord 
 * @returns 
 */
async function updatePointBalance(studentId, pointHistoryRecord = null) {
  try {
    const totalPoints = await PointHistory.aggregate([
      {
        $match: {
          studentId: mysqlOrm.Types.ObjectId(studentId)
        }
      },
      {
        $group: {
          _id: "$studentId",
          totalPoints: { $sum: "$totalPoints" }
        }
      },
    ]);

    const studentBalance = await PointBalance.findOne({ userId: studentId });

    if (studentBalance) {
      studentBalance.balance = totalPoints[0].totalPoints;
      await studentBalance.save(); // Save the updated balance
      await User.findByIdAndUpdate(studentId, {
        points_wallet_id: studentBalance._id,
      });
    } else {
      const newBalance = new PointBalance({
        userId: studentId,
        balance: totalPoints[0]?.totalPoints ?? 0,
      });
      await newBalance.save();
      await User.findByIdAndUpdate(studentId, {
        points_wallet_id: newBalance._id,
      });
    }

    // if (futureBalance != oldBalance) {
    //   const transactionType = futureBalance > oldBalance ? 'credit' : 'debit';
    //   let amount = 0;
    //   if (transactionType === 'credit') {
    //     amount = futureBalance - oldBalance;
    //   }
    //   else {
    //     amount = oldBalance - futureBalance;
    //   }

    //   const newTransaction = new PointTransaction({
    //     pointHistoryId: pointHistoryRecord._id,
    //     receiverId: pointHistoryRecord.studentId,
    //     senderId: pointHistoryRecord.tutorId,
    //     transactionType: transactionType,
    //     amount: amount,
    //   });
    //   await newTransaction.save();
    // }

    return { success: true, message: "Point balance updated successfully." };
  } catch (error) {
    console.error("updatePointBalance: ", error);
    return { success: false, message: "An error occurred while updating the point balance." };
  }
}

/**
 * pointsHistory
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function pointsHistory(req, res) {
  try {
    const users = await User.find(
      {
        $or: [
          { role: 2, status: 1, isDeleted: false },
          { role: 3, status: 1, isDeleted: false },
        ],
      },
      "_id role first_name last_name"
    ).sort({ role: 1, first_name: 1 });

    const pointSystem = await PointSystem.findOne().lean();
    const tutors = users.filter((user) => user.role === 2);
    const students = users.filter((user) => user.role === 3);
    const userRole = res.locals.loggedUserInfo.role;

    return res.render("../views/admin/rewards/points_history", {
      tutors: tutors,
      students: students,
      moment: res.locals.moment,
      loggedUserRole: userRole,
      pointSystem, pointSystem,
    });
  } catch (error) {
    console.error("pointsHistory: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * pointHistoryTable
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function pointHistoryTable(req, res) {
  try {
    const { search, tutor, student, transaction_date, order, start, length, draw } = req.body;
    const searchStr = search.value.trim();
    const filterObj = {};
    const countProgram = {};
    const userRole = res.locals.loggedUserInfo.role;
    const loggedUserId = res.locals.loggedUserInfo._id.toString();
    const filterColumns = ["_id", "tutorId", "studentId", "weekStart", "totalPoints", "created_at"];

    // Build filter based on user role and provided parameters
    if (userRole === 2) {
      filterObj["tutorId"] = mysqlOrm.Types.ObjectId(loggedUserId);
    }

    if (userRole !== 2 && tutor) {
      filterObj["tutorId"] = mysqlOrm.Types.ObjectId(tutor);
    }

    if (userRole === 3) {
      filterObj["studentId"] = mysqlOrm.Types.ObjectId(loggedUserId);
    }

    if (userRole !== 3 && student) {
      filterObj["studentId"] = mysqlOrm.Types.ObjectId(student);
    }

    if (transaction_date) {
      const startOfDay = new Date(`${transaction_date}T00:00:00Z`);
      const endOfDay = new Date(`${transaction_date}T23:59:59Z`);
      filterObj["created_at"] = { $gte: startOfDay, $lte: endOfDay };
    }

    // Build search regex filter if there's a search term
    const searchRegex = searchStr ? {
      $or: [
        { "tutorId.first_name": { $regex: searchStr, $options: "i" } },
        { "tutorId.last_name": { $regex: searchStr, $options: "i" } },
        { "studentId.first_name": { $regex: searchStr, $options: "i" } },
        { "studentId.last_name": { $regex: searchStr, $options: "i" } },
      ]
    } : {};

    // Combine filters
    const finalFilter = { $and: [filterObj, searchRegex] };

    // Handle sorting
    const column_name = order ? filterColumns[order[0].column] : "created_at";
    const sort = { [column_name]: order ? order[0].dir : -1 };

    // Adjust count filter based on user role
    if (userRole === 2) {
      countProgram["tutorId"] = mysqlOrm.Types.ObjectId(loggedUserId);
    } else if (userRole === 3) {
      countProgram["studentId"] = mysqlOrm.Types.ObjectId(loggedUserId);
    }

    // Fetch total and filtered counts in parallel
    const [recordsTotal, recordsFiltered] = await Promise.all([
      PointHistory.countDocuments(countProgram),
      PointHistory.countDocuments(finalFilter)
    ]);

    // Fetch the records with pagination, sorting, and population
    const results = await PointHistory.find(finalFilter, "_id tutorId studentId weekStart weekEnd totalPoints created_at")
      .populate('tutorId', 'first_name last_name')
      .populate('studentId', 'first_name last_name')
      .skip(Number(start))
      .limit(Number(length))
      .sort(sort)
      .exec();

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: results,
    });

  } catch (error) {
    console.error("pointHistoryTable: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * requestVoucherForm
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function requestVoucherForm(req, res) {
  try {
    const loggedUserId = res.locals.loggedUserInfo._id.toString();
    let stdPointBalanceData = await PointBalance.findOne({ userId: mysqlOrm.Types.ObjectId(loggedUserId) }).lean();

    if (!stdPointBalanceData) {
      stdPointBalanceData = new PointBalance({
        userId: mysqlOrm.Types.ObjectId(loggedUserId),
        balance: 0,
      });

      await stdPointBalanceData.save();

      await User.findByIdAndUpdate(studentId, {
        points_wallet_id: stdPointBalanceData._id,
      });
    }

    const vouchersData = await Voucher.find({ isDeleted: false }).sort({ required_points: 1 }).lean();
    return res.render("../views/admin/rewards/request_voucher_form", {
      stdPointBalanceData: stdPointBalanceData,
      vouchers: vouchersData,
      appCurrency: appCurrency,
      appSymbol: appSymbol,
    });
  } catch (error) {
    console.error("requestVoucherForm: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * storeRedemptionRequest
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function storeRedemptionRequest(req, res) {
  try {
    const moment = res.locals.moment;
    const loggedUserId = res.locals.loggedUserInfo._id.toString();

    const pointSystem = await PointSystem.findOne().lean();

    let pointRedemptionGapDuration = pointSystem?.redemptionGapDuration || appPointRedemptionGapDuration;

    const gapDurationMs = parseInt(pointRedemptionGapDuration) * 7 * 24 * 60 * 60 * 1000;

    const recentRedemption = await VoucherHistory.findOne({
      studentId: loggedUserId,
    }).sort({ created_at: -1 }).lean();

    if (recentRedemption) {
      const timeDifference = Date.now() - new Date(recentRedemption.created_at).getTime();
      const timeRemaining = gapDurationMs - timeDifference;
      const remainingDays = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))); // Convert ms to days

      if (remainingDays > 0) {
        return res.status(400).json({
          success: false,
          message: `You can make another request after ${remainingDays} day(s). Please wait until then to submit a new request.`,
        });
      }

      if (recentRedemption.status === 'Pending') {
        return res.status(400).json({
          success: false,
          message: `You have already requested a voucher, which is still pending. Please wait until your previous request is processed.`,
        });
      }
    }

    const selectedVoucherIds = req.body.voucher || [];

    if (selectedVoucherIds.length === 0) {
      return res.status(400).json({ success: false, message: "No vouchers selected." });
    }

    const stdPointBalanceData = await PointBalance.findOne({ userId: mysqlOrm.Types.ObjectId(loggedUserId) }).lean();
    if (!stdPointBalanceData) {
      return res.status(400).json({ success: false, message: "No balance found." });
    }

    const totalPoints = stdPointBalanceData.balance;
    const vouchers = await Voucher.find({ '_id': { $in: selectedVoucherIds } });
    if (vouchers.length !== selectedVoucherIds.length) {
      return res.status(404).json({ success: false, message: "Vouchers not found." });
    }

    const totalRequiredPoints = vouchers.reduce((total, voucher) => total + voucher.required_points, 0);

    if (totalRequiredPoints > totalPoints) {
      return res.status(400).json({
        success: false,
        message: `You do not have enough points. You need ${totalRequiredPoints} points but you have ${totalPoints}.`
      });
    }

    for (let voucher of vouchers) {
      const voucherHistory = new VoucherHistory({
        studentId: loggedUserId,
        voucherId: voucher._id,
        status: "Pending",
      });
      await voucherHistory.save();
    }

    req.flash("success", `Successfully requested ${vouchers.length} voucher(s) for ${totalRequiredPoints} points.`);
    return res.status(200).json({
      success: true,
      message: `Successfully requested ${vouchers.length} voucher(s) for ${totalRequiredPoints} points.`,
      remainingPoints: stdPointBalanceData.balance,
      redirectUrl: "/rewards/redemption-requests"
    });
  } catch (error) {
    console.error("storeRedemptionRequest: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * redemptionRequests
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function redemptionRequests(req, res) {
  try {
    const moment = res.locals.moment;
    const userRole = res.locals.loggedUserInfo.role;
    const students = await User.find({ role: 3, status: 1, isDeleted: false }, "_id role first_name last_name").sort({ first_name: 1 });
    const vouchers = await Voucher.find({ isDeleted: false }).sort({ title: 1 });
    const redemptionStatus = ["Approved", "Pending", "Rejected"];

    return res.render("../views/admin/rewards/redemption_requests", {
      students: students,
      vouchers: vouchers,
      redemptionStatus: redemptionStatus,
      moment: moment,
      loggedUserRole: userRole,
      appSymbol: appSymbol,
      appCurrency: appCurrency,
    });
  } catch (error) {
    console.error("redemptionRequests: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * voucherHistoryTable
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function voucherHistoryTable(req, res) {
  try {
    const { search, student, voucher, status, requested_date, order, start, length, draw } = req.body;
    const searchStr = search.value.trim();
    const filterObj = {};
    const countProgram = {};
    const userRole = res.locals.loggedUserInfo.role;
    const loggedUserId = res.locals.loggedUserInfo._id.toString();
    const filterColumns = ["_id", "studentId", "voucherId", "balanceBeforeDeduction", "status", "created_at"];

    // Build filter based on user role and provided parameters
    if (userRole === 3) {
      filterObj["studentId"] = mysqlOrm.Types.ObjectId(loggedUserId);
    }

    if (userRole !== 3 && student) {
      filterObj["studentId"] = mysqlOrm.Types.ObjectId(student);
    }

    if (voucher !== null && voucher !== undefined && voucher !== '') {
      filterObj["voucherId"] = mysqlOrm.Types.ObjectId(voucher);
    }

    if (status) {
      filterObj["status"] = status;
    }

    if (requested_date) {
      const startOfDay = new Date(`${requested_date}T00:00:00Z`);
      const endOfDay = new Date(`${requested_date}T23:59:59Z`);
      filterObj["created_at"] = { $gte: startOfDay, $lte: endOfDay };
    }

    // Build search regex filter if there's a search term
    const searchRegex = searchStr ? {
      $or: [
        { "studentId.first_name": { $regex: searchStr, $options: "i" } },
        { "studentId.last_name": { $regex: searchStr, $options: "i" } },
      ]
    } : {};

    // Combine filters
    const finalFilter = { $and: [filterObj, searchRegex] };

    // Handle sorting
    const column_name = order ? filterColumns[order[0].column] : "created_at";
    const sort = { [column_name]: order ? order[0].dir : -1 };

    // Adjust count filter based on user role
    if (userRole === 3) {
      countProgram["studentId"] = mysqlOrm.Types.ObjectId(loggedUserId);
    }

    // Fetch total and filtered counts in parallel
    const [recordsTotal, recordsFiltered] = await Promise.all([
      VoucherHistory.countDocuments(countProgram),
      VoucherHistory.countDocuments(finalFilter)
    ]);

    // Fetch the records with pagination, sorting, and population
    const results = await VoucherHistory.find(finalFilter, "_id studentId voucherId voucherRequiredPoints voucherEquivalentAmount status balanceBeforeDeduction comment approvedBy created_at updated_at")
      .populate({
        path: 'studentId',
        select: '_id first_name last_name',  // Fields to select for studentId
        populate: {
          path: 'points_wallet_id',
          select: '_id balance'  // Select the balance field from points_wallet_id
        }
      })
      .populate({
        path: 'voucherId',
        select: '_id title',  // Fields to select for studentId
      })
      .skip(Number(start))
      .limit(Number(length))
      .sort(sort)
      .exec();

    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data: results,
    });

  } catch (error) {
    console.error("voucherHistoryTable: ", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * fetchVoucherRejectionDetail
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function fetchVoucherRejectionDetail(req, res) {
  try {
    const voucherHistoryId = req.params.voucherHistoryId;
    const record = await VoucherHistory.findById(voucherHistoryId).lean();
    if (record) {
      const moment = res.locals.moment;
      return res.status(200).json({
        success: true,
        record: record,
        moment: moment,
        message: "Voucher history data fetched successfully.",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }
  } catch (error) {
    console.error("fetchVoucherRejectionDetail: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updateVoucherRequestStatus
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function updateVoucherRequestStatus(req, res) {
  try {
    const loggedUserId = res.locals.loggedUserInfo._id.toString();
    const { voucherRequestId, status, reason } = req.body;

    const record = await VoucherHistory.findById(voucherRequestId);
    if (!record) {
      return res.status(404).json({ success: false, message: "Voucher request record not found." });
    }

    if (status === 'Approved') {
      const stdPointBalanceData = await PointBalance.findOne({ userId: mysqlOrm.Types.ObjectId(record.studentId) });
      if (!stdPointBalanceData) {
        return res.status(400).json({ success: false, message: "Student balance not found." });
      }

      if (stdPointBalanceData.balance < record.voucherRequiredPoints) {
        return res.status(400).json({
          success: false,
          message: `Student does not have enough points to redeem the voucher.`
        });
      }
      const balanceBeforeDeduction = stdPointBalanceData.balance

      stdPointBalanceData.balance -= record.voucherRequiredPoints;
      await PointBalance.updateOne(
        { userId: mysqlOrm.Types.ObjectId(record.studentId) },
        { balance: stdPointBalanceData.balance }
      );

      record.balanceBeforeDeduction = balanceBeforeDeduction; // store current balance just before the deduction.
      await record.save();
    }

    await VoucherHistory.findByIdAndUpdate(record._id, {
      status,
      approvedBy: loggedUserId,
      reason: status === "Rejected" ? reason : ''
    });

    req.flash("success", `Voucher request status updated successfully.`);
    return res.status(200).json({
      success: true,
      message: "Voucher request status updated successfully.",
      redirectUrl: "page-reload"
    });
  } catch (error) {
    console.error("updateVoucherRequestStatus error: ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong, please try again later."
    });
  }
}