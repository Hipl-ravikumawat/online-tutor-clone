const mysqlOrm = require('mysql-orm');
const moment = require("moment");
const bcrypt = require("bcryptjs");
const Program = require("../models/Program");
const globalConstant = require("./GlobalConstants");
const User = require("../models/User");
const ChargeCategory = require("../models/ChargeCategory");
const EventCategory = require("../models/EventCategory");
const FamilyContacts = require("../models/FamilyContacts");
const PointSystem = require("../models/PointSystem");
const Assessment = require("../models/Assessment");
const AttemptedAssessment = require("../models/AttemptedAssessment");
const AssignedTutors = require("../models/AssignedTutors");
const Transaction = require("../models/Transaction");
const StaffTransaction = require("../models/StaffTransaction");
const GroupTag = require("../models/GroupTag");
const TutorTrainingAssessment = require("../models/TutorTrainingAssessment");
const Policy = require("../models/Policy");
const Event = require("../models/Event");
const BusinessSetting = require("../models/BusinessSetting");

module.exports = {
  baseUrl,
  securePassword,
  calculateDuration,
  convertMinToHrs,
  shuffle,
  convertToSlug,
  assessmentTaskCount,
  getMultipleRandom,
  fetchAllAssignTutorOfStudent,
  fetchAllAssignStudentOfTutor,
  removeAnyFile,
  timeZoneAustralia,
  removeIdenticalObjects,
  maxPointsAssignmentToStd,
  generateAccountNo,
  generateRegistrationNo,
  copyContentUploads,
  copyAnyFile,
  getFamiliesListForFamiliesInvoices,
  ucwords,
  getFamilyContactNames,
  getBalanceDetailsOfStudent,
  getStudentsList,
  getGroupTagsList,
  getBusinessSetting,
  getBusinessSettingValue,
  generateInvoiceNumber,
  getChargeCategories,
  getInvoiceRecipients,
  getBillingCycleRange,
  buildInvoiceRow,
  checkTimezoneDifferences,
  getStaffsListForStaffInvoices,
  getBalanceDetailsOfStaff
}; 

function baseUrl(req) {
  const url = req.protocol + "://" + req.headers.host;
  return url;
}

function getMultipleRandom(arr) {
  let newArray = arr.sort(() => Math.random() - 0.5);
  return newArray;
}

function securePassword(password) {
  let salt = bcrypt.genSaltSync(10);
  let hash = bcrypt.hashSync(password, salt);
  return hash;
}

function shuffle(array) {
  const newArray = [...array];
  const length = newArray.length;

  for (let start = 0; start < length; start++) {
    const randomPosition = Math.floor(
      (newArray.length - start) * Math.random()
    );
    const randomItem = newArray.splice(randomPosition, 1);

    newArray.push(...randomItem);
  }

  return newArray;
}

function calculateDuration(durationArray) {
  var totalDuration = "";
  var hour = 0;
  var minute = 0;
  var i = 0;
  var hh = [];
  var mm = [];

  for (duration of durationArray) {
    if (duration) {
      splitTime = duration.split(":");
      hh[i] = splitTime[0];
      mm[i] = splitTime[1];
    }
    i++;
  }

  hh.forEach((item) => {
    hour += Number(item);
  });

  mm.forEach((item) => {
    minute += Number(item);
  });

  hour = hour + minute / 60;
  minute = minute % 60;
  // console.log('sum of above time= ' + hour + ':' + minute);
  totalDuration = Math.floor(hour) + ":" + Math.floor(minute);
  return totalDuration;
}

function convertMinToHrs(duration) {
  var totalDuration = "";
  var hh = "00";
  var mm = "00";
  var sec = "00";
  splitTime = duration.split(":");
  hh = splitTime[0];
  mm = splitTime[1];
  hour = parseInt(hh / 60);
  min = hh % 60;
  sec = mm;
  if (hour < 10) {
    hour = "0" + hour;
  }
  if (min < 10) {
    min = "0" + min;
  }
  totalDuration = hour + ":" + min + ":" + sec + " Hrs";
  return totalDuration;
}

function convertToSlug(str) {
  str = str
    .replace(/[`~!@#$%^&*()_\-+=\[\]{};:'"\\|\/,.<>?\s]/g, " ")
    .toLowerCase();
  str = str.replace(/^\s+|\s+$/gm, "");

  str = str.replace(/\s+/g, "-");
  return str;
}

function assessmentTaskCount(assessment_id, student_id) {
  try {
    assessment_id = mysqlOrm.Types.ObjectId(assessment_id);
    if (student_id) {
      student_id = mysqlOrm.Types.ObjectId(student_id);
    }
    let AssessmentData = Assessment.find({ _id: assessment_id });
    // console.log(assessment_id, student_id);
    let AttemptedAssessmentData = AttemptedAssessment.find({
      assessment_id: assessment_id,
      student_id: student_id,
    });
    // console.log(AttemptedAssessmentData);
    let totalCount = 0;
    for (learningContent of AssessmentData[0].content) {
      for (lesson of learningContent.lessons) {
        let practiceCount = lesson.practice_ids.length;
        let challengeCount = lesson.challenges_ids.length;
        totalCount =
          parseInt(totalCount) +
          parseInt(practiceCount) +
          parseInt(challengeCount);
      }
    }
    return json({
      status: 200,
      totalcount: totalCount,
      attempted: AttemptedAssessmentData.length,
    });
  } catch (error) {
    console.log(`assessmentTaskCount: `, error);
    return json({ status: 500 });
  }
}

async function fetchAllAssignTutorOfStudent(studentIds) {
  try {
    // const programTutorQuery = await Program.find({ student_ids: { $in: studentIds } }, 'tutor_id');
    // const programTutors = programTutorQuery.map(program => mysqlOrm.Types.ObjectId(program.tutor_id));
    // const allTutors = [...new Set([...programTutors, ...assessmentTutors])];

    // const assessmentTutorQuery = await Assessment.find(
    //   { student_ids: { $in: studentIds } },
    //   "tutor_id"
    // );   
      const assessmentTutorQuery = await AssignedTutors.find({
      student_id: new mysqlOrm.Types.ObjectId(studentIds),
      deleted_at: null,
    }).populate('tutor_id','_id qualification first_name last_name register_number');   
    
    const assessmentTutors = assessmentTutorQuery.map((assessment) =>
      mysqlOrm.Types.ObjectId(assessment.tutor_id)
    );

    const uniqueTutorIds = [...new Set(assessmentTutors.map(String))]; // remove duplicates

    // Step 2: Fetch AssignedTutor records based on tutor_ids
    const assignedTutors = await AssignedTutors.find({
      tutor_id: { $in: uniqueTutorIds },
      student_id: { $in: studentIds },
      deleted_at: null,
    })
      .populate("student_id", "first_name last_name email") // populate student (optional fields)
      .populate("tutor_id", "first_name last_name email qualification register_number") // populate tutor
      .lean();
      
    const allTutors = [...new Set([...assignedTutors])];
      
    return allTutors;
  } catch (error) {
    return;
  }
}

function ucwords (str) {
  if (typeof str !== 'string') return '';

  return str
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());
}


// async function getBalanceDetailsOfStudent(studentId = null, filterDate = null, transactionType = null) {
//   const matchStage = { isDeleted: false };

//   if (studentId) {
//     matchStage.student_id = new mysqlOrm.Types.ObjectId(studentId);
//   }

//   if (filterDate) {
//     const tillDate = new Date(filterDate);
//     matchStage.date = { $lte: tillDate };
//   }

//   if (transactionType) {
//     matchStage.type = transactionType;
//   }

//   // Fetch transactions
//   const transactions = await Transaction.find(matchStage)
//     .sort({ date: 1 }) // oldest â†’ newest for balance calculation
//     .lean();

//   // Type priority (if you want to sort within same date)
//   const typePriority = { Payment: 1, Refund: 2, Discount: 3, Charge: 4 };

//   // Sort oldest â†’ newest with type priority tie-break
//   const sorted = transactions.sort((a, b) => {
//     const dateDiff = new Date(a.date) - new Date(b.date);
//     if (dateDiff !== 0) return dateDiff;

//     return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
//   });

//   // Calculate derived balance
//   let runningBalance = 0;
//   sorted.forEach((t) => {
//     const amount = t.amount || 0;
//     const transactionType = t.type;
//     if (["Charge"].includes(transactionType)) {
//       runningBalance -= amount;
//     } else if (["Refund"].includes(transactionType)) {
//       runningBalance -= amount;
//     } else if (["Discount"].includes(transactionType)){
//       runningBalance += amount;
//     }else if (["Payment"].includes(transactionType)) {
//       runningBalance += amount;
//     }
//   });

//   return runningBalance;
// }

async function getBalanceDetailsOfStudent(studentId = null, filterDate = null, transactionType = null) {
  const matchStage = { isDeleted: false };

  if (studentId) {
    matchStage.student_id = new mysqlOrm.Types.ObjectId(studentId);
  }


  if (filterDate) {
    const m = moment.utc(filterDate, ["DD-MM-YYYY", "YYYY-MM-DD"], true);
    if (m.isValid()) {
      matchStage.date = { $lte: m.endOf("day").toDate() };
    }
  }

  if (transactionType) {
    matchStage.type = transactionType;
  }
  
  const result = await Transaction.aggregate([
    { $match: matchStage },

    // Add typePriority and transactionDelta
    {
      $addFields: {
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
              { case: { $in: ["$type", ["Charge", "Refund"]] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
              { case: { $in: ["$type", ["Discount", "Payment"]] }, then: { $ifNull: ["$amount", 0] } }
            ],
            default: 0
          }
        }
      }
    },

    // Sort by date asc, then typePriority asc
    { $sort: { date: 1, typePriority: -1, _id: 1 } },

    // Calculate running balance (cumulative sum bottom â†’ top)
    {
      $setWindowFields: {
        // same sort used above
        sortBy: { date: 1, typePriority: -1, _id: 1 },
        output: {
          runningBalance: {
            $sum: "$transactionDelta",
            window: { documents: ["unbounded", "current"] }
          }
        }
      }
    },

    // Only need the last row â†’ final balance
    { $sort: { date: -1, typePriority: 1, _id: -1 } },
    { $limit: 1 },
    { $project: { _id: 0, finalBalance: "$runningBalance" } },
  ]);
  
  return result[0]?.finalBalance || 0;
}

async function getBalanceDetailsOfStaff(tutorId = null, filterDate = null, transactionType = null) {
  const matchStage = { isDeleted: false };

  if (tutorId) {
    matchStage.tutor_id = new mysqlOrm.Types.ObjectId(tutorId);
  }


  if (filterDate) {
    const m = moment.utc(filterDate, ["DD-MM-YYYY", "YYYY-MM-DD"], true);
    if (m.isValid()) {
      matchStage.date = { $lte: m.endOf("day").toDate() };
    }
  }

  if (transactionType) {
    matchStage.type = transactionType;
  }
  
  const result = await StaffTransaction.aggregate([
    { $match: matchStage },

    // Add typePriority and transactionDelta
    {
      $addFields: {
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
              { case: { $in: ["$type", ["Charge", "Refund"]] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
              { case: { $in: ["$type", ["Discount", "Payment"]] }, then: { $ifNull: ["$amount", 0] } }
            ],
            default: 0
          }
        }
      }
    },

    // Sort by date asc, then typePriority asc
    { $sort: { date: 1, typePriority: -1, _id: 1 } },

    // Calculate running balance (cumulative sum bottom â†’ top)
    {
      $setWindowFields: {
        // same sort used above
        sortBy: { date: 1, typePriority: -1, _id: 1 },
        output: {
          runningBalance: {
            $sum: "$transactionDelta",
            window: { documents: ["unbounded", "current"] }
          }
        }
      }
    },

    // Only need the last row â†’ final balance
    { $sort: { date: -1, typePriority: 1, _id: -1 } },
    { $limit: 1 },
    { $project: { _id: 0, finalBalance: "$runningBalance" } },
  ]);
  
  return result[0]?.finalBalance || 0;
}

async function getInvoiceRecipients(studentIds = []) {
  const students = await User.find({
    role: 3,
    isDeleted: false,
    ...(studentIds.length > 0 && { _id: { $in: studentIds } })
  })
    .select("_id first_name last_name email")
    .populate({
      path: "family_contacts",
      match: { isDeleted: false, preferred_invoice_recipient: true },
      select: "mobile_number.phone preferred_invoice_recipient user_id",
      populate: {
        path: "user_id",
        select: "_id first_name last_name company_name email"
      }
    })
    .lean();

  return students.map(student => {
    const contact = student.family_contacts?.[0]; // only first match (at most one)
    const recipient = contact
      ? {
          user_id: contact.user_id?._id,
          email: contact.user_id?.email,
          first_name: contact.user_id?.first_name,
          last_name: contact.user_id?.last_name,
          company_name: contact.user_id?.company_name,
          phone: contact.mobile_number?.phone,
          isInvoiceRecipient: contact.preferred_invoice_recipient
        }
      : {
          user_id: student._id,
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name
        };

    return {
      _id: student._id,
      recipient // single object, not array
    };
  });
}

async function getFamilyContactNames(studentIds){
  if (!studentIds || studentIds.length === 0) return {};

  const objectIds = studentIds.map(id => mysqlOrm.Types.ObjectId(id));

  const familyContacts = await FamilyContacts.find({
    student_id: { $in: objectIds },
    isDeleted: false
  })
    .populate("user_id", "company_name first_name last_name")
    .lean();

  const familyMap = {};

  for (const contact of familyContacts) {
    const sid = contact.student_id.toString();
    const user = contact.user_id;
    const name = user?.company_name?.trim()
      ? user.company_name
      : [user.first_name, user.last_name].filter(Boolean).join(" ");

    if (!familyMap[sid]) familyMap[sid] = [];
    if (name) familyMap[sid].push(ucwords(name));
  }

  return familyMap;
};

async function getStudentsList(role = null, tutor_id = null) {
  const baseFilter = {
    role: 3,
    status: 1,
    isDeleted: false,
  };

  let students = [];
  // Return only attached students if role is 2
  if (role === 2 && Array.isArray(attachedStudentIds) && attachedStudentIds.length > 0) {
    const studentRecords = await User.find(
      { ...baseFilter, _id: { $in: attachedStudentIds } },
      "_id role first_name last_name"
    ).sort({ first_name: 1 });

    students = studentRecords;
  }else{
    const studentRecords = await User.find(baseFilter).select("_id role first_name last_name").sort({ first_name: 1 });
    students = studentRecords;
  }

  // Otherwise return all active students
  return students;
}

async function getGroupTagsList(group_tag_id = null) {
  const baseFilter = {
    active_status: 1,
    isDeleted: false,
  };
  if (group_tag_id) {
    baseFilter._id = mysqlOrm.Types.ObjectId(group_tag_id);
  }

  const groupTags = await GroupTag.find(baseFilter).populate('student_ids','_id first_name last_name').select("_id name color student_ids").sort({ name: 1 });

  return groupTags;
}

async function getFamiliesListForFamiliesInvoices(studentIds = [], fields = []) {
  const matchStage = { role: 3, isDeleted: false };

  if (studentIds.length > 0) {
    matchStage._id = {
      $in: studentIds.map(id =>
        mysqlOrm.Types.ObjectId.isValid(id) && !(id instanceof mysqlOrm.Types.ObjectId)
          ? new mysqlOrm.Types.ObjectId(id)
          : id
      ),
    };
  }

  const families = await User.aggregate([
    { $match: matchStage },

    // family contacts
    {
      $lookup: {
        from: "family_contacts",
        localField: "_id",
        foreignField: "student_id",
        as: "contacts",
      },
    },
    { $unwind: { path: "$contacts", preserveNullAndEmptyArrays: true } },
    { $match: { $or: [{ contacts: { $eq: null } }, { "contacts.isDeleted": false }] } },

    // family user
    {
      $lookup: {
        from: "users",
        localField: "contacts.user_id",
        foreignField: "_id",
        as: "familyUser",
      },
    },
    { $unwind: { path: "$familyUser", preserveNullAndEmptyArrays: true } },
    { $match: { $or: [{ familyUser: { $eq: null } }, { "familyUser.isDeleted": false }] } },

    // add familyName + contactDetails
    {
      $addFields: {
        familyName: {
          $cond: [
            { $and: [{ $ne: ["$familyUser.company_name", null] }, { $ne: ["$familyUser.company_name", ""] }] },
            "$familyUser.company_name",
            { $concat: [{ $ifNull: ["$familyUser.first_name", ""] }, " ", { $ifNull: ["$familyUser.last_name", ""] }] },
          ],
        },
        contactDetails: {
          _id: "$familyUser._id", 
          first_name: "$familyUser.first_name",
          last_name: "$familyUser.last_name",
          company_name: "$familyUser.company_name",
          full_name: {
            $cond: [
              { $and: [{ $ne: ["$familyUser.company_name", null] }, { $ne: ["$familyUser.company_name", ""] }] },
              "$familyUser.company_name",
              { $concat: [{ $ifNull: ["$familyUser.first_name", ""] }, " ", { $ifNull: ["$familyUser.last_name", ""] }] },
            ]
          },
          email: "$familyUser.email",
          phone: "$contacts.mobile_number.phone",
          isInvoiceRecipient: "$contacts.preferred_invoice_recipient",
        },
      },
    },

    // group by student
    {
      $group: {
        _id: "$_id",
        studentName: {
          $first: { $concat: [{ $ifNull: ["$first_name", ""] }, " ", { $ifNull: ["$last_name", ""] }] },
        },
        student_email: { $first: "$email" },
        student_contact: { $first: "$phone" },
        auto_invoice: { $first: "$auto_invoice" },
        familyNames: {
          $addToSet: { $cond: [{ $ne: ["$familyName", null] }, "$familyName", "$$REMOVE"] },
        },
        contacts: {
          $push: { $cond: [{ $ne: ["$contactDetails", null] }, "$contactDetails", "$$REMOVE"] },
        },
      },
    },

    // flatten familyNames
    {
      $addFields: {
        familyNames: {
          $reduce: {
            input: "$familyNames",
            initialValue: "",
            in: {
              $cond: [
                { $eq: ["$$value", ""] },
                "$$this",
                { $concat: ["$$value", "; ", "$$this"] },
              ],
            },
          },
        },
      },
    },

    { $sort: { familyNames: 1 } },
  ]);

  // Apply dynamic field filter
  if (fields.length > 0) {
    return families.map(doc => {
      const filtered = {};
      fields.forEach(f => {
        if (doc[f] !== undefined) filtered[f] = doc[f];
      });
      return filtered;
    });
  }

  return families;
}

async function getStaffsListForStaffInvoices(tutorIds = [], fields = []) {
  const matchStage = { role: 2, isDeleted: false };

  if (tutorIds.length > 0) {
    matchStage._id = {
      $in: tutorIds.map(id =>
        mysqlOrm.Types.ObjectId.isValid(id) && !(id instanceof mysqlOrm.Types.ObjectId)
          ? new mysqlOrm.Types.ObjectId(id)
          : id
      ),
    };
  }

  const staffs = await User.aggregate([
    { $match: matchStage },    
  ]);

  // Apply dynamic field filter
  if (fields.length > 0) {
    return staffs.map(doc => {
      const filtered = {};
      fields.forEach(f => {
        if (doc[f] !== undefined) filtered[f] = doc[f];
      });
      return filtered;
    });
  }

  return staffs;
}

async function buildInvoiceRow(studentId, balance, invoiceDetails) {
  const currency = globalConstant.currency;
  
  const cycleRange = await this.getBillingCycleRange(
    invoiceDetails?.billingCycleStartDate,
    invoiceDetails?.autoInvoicingSchedule?.frequency,
    invoiceDetails?.autoInvoicingSchedule?.repeatsEvery
  );

  const studentDetails = await this.getFamiliesListForFamiliesInvoices(
    [studentId],
    ["_id", "studentName", "familyNames"]
  );

  return {
    studentId,
    studentName: studentDetails?.[0]?.familyNames || studentDetails?.[0]?.studentName,
    invoiceDate: moment().format("DD-MM-YYYY"),
    dateRange: Array.isArray(cycleRange) ? cycleRange.join(" to ") : cycleRange ?? "N/A",
    amount: `${currency.symbol} ${Math.abs(balance)} Owing`,
  };
}

async function getBillingCycleRange(startDate, frequency, repeatsEvery = 1) {
  if (!startDate) return [];

  const start = moment(startDate).startOf("day");
  let end = start.clone();

  switch (frequency) {
    case "daily":
      end = start.clone().add(repeatsEvery, "days").subtract(1, "day");
      break;
    case "weekly":
      end = start.clone().add(repeatsEvery, "weeks").subtract(1, "day");
      break;
    case "monthly":
      end = start.clone().add(repeatsEvery, "months").subtract(1, "day");
      break;
    case "yearly":
      end = start.clone().add(repeatsEvery, "years").subtract(1, "day");
      break;
    default:
      end = start.clone();
  }

  return [start.format("DD-MM-YYYY"), end.format("DD-MM-YYYY")];
}


async function fetchAllAssignStudentOfTutor(tutorIds) {
  try {
    // Find tutors from Assessment collection
    const assessmentTutorQuery = await Assessment.find(
      { tutor_id: { $in: mysqlOrm.Types.ObjectId(tutorIds) } },
      "student_ids"
    );
    const assessmentStudents = assessmentTutorQuery.flatMap((assessment) =>
      assessment.student_ids.map((id) => mysqlOrm.Types.ObjectId(id))
    );
    const allStudents = [...new Set([...assessmentStudents])];
    return allStudents;
  } catch (error) {
    console.log(`fetchAllAssignStudentOfTutor: `, error);
  }
}

async function copyContentUploads(type, originalDirectory, newDirectoryName) {
  try {
    if (!fs.existsSync(originalDirectory)) {
      throw new Error('Original content directory does not exist.');
    }

    fs.mkdirSync(newDirectoryName, { recursive: true });

    fs.cpSync(originalDirectory, newDirectoryName, { recursive: true });

    return newDirectoryName;
  } catch (error) {
    console.log(`copyContentUploads: `, error);
    return false;
  }
}

async function copyAnyFile(oldContentDirectory,newContentDirectory){
  try {
    fs.copyFile(
      oldContentDirectory,
      newContentDirectory,
      (err) => {
        // if (err) throw err;
        if (err) return false;
      }
    );
    return true;
  } catch (error) {
    console.log(`removeAnyFile: `, error);
    return false;
  }
}

async function removeAnyFile(filePath) {
  try {
    fs.exists(filePath, function (exists) {
      if (filePath) {
        fs.unlinkSync(filePath);
        return true;
      } else {
        return false;
      }
    });
  } catch (error) {
    console.log(`removeAnyFile: `, error);
    return false;
  }
}

async function timeZoneAustralia() {
  return [
    {
      tzid: "Australia/Adelaide",
      name: "Australia Central - Adelaide",
    },
    {
      tzid: "Australia/Darwin",
      name: "Australia Central - Darwin",
    },
    {
      tzid: "Australia/Brisbane",
      name: "Australia Eastern - Brisbane",
    },
    {
      tzid: "Asia/Calcutta",
      name: "Asia/Calcutta",
    },
    {
      tzid: "Australia/Hobart",
      name: "Australia Eastern - Hobart",
    },
    {
      tzid: "Australia/Sydney",
      name: "Australia Eastern - Sydney/Melbourne",
    },
    {
      tzid: "Australia/Perth",
      name: "Australia Western",
    },
    {
      tzid: "Pacific/Auckland",
      name: "New Zealand (Auckland)",
    },
    {
      tzid: "Pacific/Chatham",
      name: "New Zealand (Chatham)",
    },
  ];  
}

async function removeIdenticalObjects(myArr) {
  try {
    const seen = new Set();
    let uniqueResults = [];
    myArr.forEach(item => {
      const stringified = JSON.stringify(item);
      if (!seen.has(stringified)) {
        seen.add(stringified);
        uniqueResults.push(item);
      }
    });
    return uniqueResults;
  } catch (error) {
    console.log(`removeIdenticalObjects: `, error);
    return [];
  }
}

async function maxPointsAssignmentToStd() {
  try {
    const pointSystem = await PointSystem.findOne().lean();
    let performanceMetricsSum = 0;
    if (pointSystem) {
      performanceMetricsSum = [
        pointSystem.attendingClassOnTime,
        pointSystem.askingQuestions,
        pointSystem.homeworkSubmission,
        pointSystem.participatingClassActivities,
        pointSystem.bonusPoints
      ].reduce((sum, current) => sum + current, 0);
    }
    return performanceMetricsSum;
  } catch (error) {
    console.log(`maxPointsAssignmentToStd: `, error);
    return 0;
  }
}

// Generate a unique 10-digit Account No.
async function generateAccountNo() {
  const prefix = 'ACC-';
  const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000); // 10-digit random number
  return `${prefix}${randomNumber}`;
}

// Generate a unique Registration No. using Date and Random Numbers
async function generateRegistrationNo() {
  const prefix = 'REG-';
  const date = new Date().getFullYear().toString().slice(2); // Get last 2 digits of the year
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `${prefix}${date}${randomNumber}`;
}

async function getBusinessSetting(){
  const businessSettingData = await BusinessSetting.find({}).limit(1);
  return businessSettingData;
}

async function generateInvoiceNumber() {
  const businessSetting = await getBusinessSettingValue(); 
  
  const invoiceFormatting = businessSetting.invoice_formatting[0];
  if(invoiceFormatting?.invoice_number[0]?.generate_invoice_number){
    const invoiceNumberSettings = invoiceFormatting.invoice_number[0];

    const format = invoiceNumberSettings.invoice_number_format || '%YY%-%NNNN%';
    const nextNumber = invoiceNumberSettings.next_invoice_number || 1;
    
    // 3. Generate the invoice number
    const now = new Date();
    const fullYear = now.getFullYear();
    const shortYear = fullYear.toString().substring(2);
    
    // Determine sequence length based on format
    const sequenceLength = format.includes('%NNNN%') ? 4 : 
                          format.includes('%NNN%') ? 3 : 2;
    
    const sequence = nextNumber.toString().padStart(sequenceLength, '0');
    
    const invoiceNumber = format
        .replace(/%YYYY%/g, fullYear)
        .replace(/%YY%/g, shortYear)
        .replace(/%MM%/g, (now.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/%DD%/g, now.getDate().toString().padStart(2, '0'))
        .replace(/%NNNN%/g, sequence)
        .replace(/%NNN%/g, sequence)
        .replace(/%NN%/g, sequence.substring(0, 2));

         // 4. Update the next invoice number in database
        await BusinessSetting.updateOne(
            {},
            { 
                $inc: { 'invoice_formatting.0.invoice_number.0.next_invoice_number': 1 }
            }
        );
    return invoiceNumber;
  }
  return null;
}

async function getBusinessSettingValue(type=null){
  const businessSetting = await getBusinessSetting();  
  let result = null;
  let defaultStart = null;
  if(businessSetting){
    result = businessSetting[0];
    if(type == "accounts"){
      let accountSetting = businessSetting[0]?.family_contact_settings[0];
      const specificDay = parseInt(accountSetting?.specific_day, 10) || 1;
      if(accountSetting?.balance_date_type == 'end_of_month'){
        defaultStart = moment().endOf('month').format('DD-MM-YYYY');
      }else if(accountSetting?.balance_date_type == 'today'){
        defaultStart = moment().format('DD-MM-YYYY');
      }else if(accountSetting?.balance_date_type == 'day_of_month'){
        defaultStart = moment().date(specificDay).format('DD-MM-YYYY');
      }else if(accountSetting?.balance_date_type == 'specific_date'){
        defaultStart = moment(accountSetting.specific_date).format('DD-MM-YYYY');
      }
    }
  }
  result.defaultStart = defaultStart;
  return result;
}

async function getChargeCategories(){
  const [charges, events] = await Promise.all([
    ChargeCategory.find({ isDeleted: false }).lean(),
    EventCategory.find({ isDeleted: false }).lean(),
  ]);

  // Use a Map to handle uniqueness by name
  const categoryMap = new Map();

  // First add EventCategories
  for (const ev of events) {
    categoryMap.set(ev.name.toLowerCase(), { ...ev, type: "event" });
  }

  // Then add ChargeCategories (these override if same name exists)
  for (const ch of charges) {
    categoryMap.set(ch.name.toLowerCase(), { ...ch, type: "charge" });
  }

  // Convert Map back to array
  return Array.from(categoryMap.values());
}


/**
 * Check timezone differences between active tutor and students
 * @param {string} tutorId - Main tutor ID
 * @param {array} studentIds - Array of student IDs
 * @param {string|null} substituteTutorId - Substitute tutor ID (optional)
 * @returns {Promise<Object>} Timezone difference result
 */
async function checkTimezoneDifferences(tutorId, studentIds, substituteTutorId = null) {
  try {
    const User = require("../models/User");
    
    // Determine active tutor (substitute takes priority if provided)
    const activeTutorId = substituteTutorId || tutorId;
    
    // Get active tutor details
    const activeTutor = await User.findById(activeTutorId)
      .select('time_zone first_name last_name')
      .lean();
    
    if (!activeTutor) {
      return { hasDifference: false, tutor: null, students: [] };
    }
    
    const tutorTimezone = activeTutor.time_zone || 'Australia/Sydney';
    const tutorName = `${activeTutor.first_name} ${activeTutor.last_name}`;
    
    // Get all students
    const students = await User.find({ _id: { $in: studentIds } })
      .select('time_zone first_name last_name')
      .lean();
    
    const studentsInDifferentTimezone = [];
    
    for (const student of students) {
      const studentTimezone = student.time_zone || 'Australia/Sydney';
      if (tutorTimezone !== studentTimezone) {
        studentsInDifferentTimezone.push({
          id: student._id,
          name: `${student.first_name} ${student.last_name}`,
          timezone: studentTimezone
        });
      }
    }
    
    return {
      hasDifference: studentsInDifferentTimezone.length > 0,
      tutor: {
        id: activeTutor._id,
        name: tutorName,
        timezone: tutorTimezone
      },
      students: studentsInDifferentTimezone,
      isSubstitute: !!substituteTutorId
    };
    
  } catch (error) {
    console.error("Error in checkTimezoneDifferences:", error);
    return { hasDifference: false, tutor: null, students: [] };
  }
}