const mysqlOrm = require('mysql-orm');
const User = require("../models/User");

// async function getStudentBalance(studentIds = [], dateRange = null) {
//   const matchStage = {
//     role: 3,
//     isDeleted: false,
//   };

//   if (studentIds.length > 0) {
//     matchStage._id = {
//       $in: studentIds.map((id) =>
//         mysqlOrm.Types.ObjectId.isValid(id) && !(id instanceof mysqlOrm.Types.ObjectId)
//           ? new mysqlOrm.Types.ObjectId(id)
//           : id
//       ),
//     };
//   }

//   const data = await User.aggregate([
//     { $match: matchStage },

//     // Lookup Transactions
//     {
//       $lookup: {
//         from: "transactions",
//         let: { studentId: "$_id" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$student_id", "$$studentId"] },
//                   { $eq: ["$deleted_at", null] },
//                   ...(dateRange
//                     ? [
//                         {
//                           $and: [
//                             { $gte: ["$date", new Date(dateRange.start)] },
//                             { $lte: ["$date", new Date(dateRange.end)] },
//                           ],
//                         },
//                       ]
//                     : []),
//                 ],
//               },
//             },
//           },
//         ],
//         as: "transactions",
//       },
//     },

//     // Lookup AutoInvoicings (ARRAY)
//     {
//       $lookup: {
//         from: "auto_invoicings",
//         localField: "_id",
//         foreignField: "studentId",
//         as: "auto_invoicings", // keep as array
//       },
//     },

//     // Add single object version
//     {
//       $addFields: {
//         auto_invoicings: { $arrayElemAt: ["$auto_invoicings", 0] }, // first element or null
//       },
//     },

//     // Calculate balance
//     {
//       $addFields: {
//         balance: {
//           $sum: {
//             $map: {
//               input: "$transactions",
//               as: "t",
//               in: {
//                 $switch: {
//                   branches: [
//                     {
//                       case: { $eq: ["$$t.type", "Payment"] },
//                       then: "$$t.amount",
//                     },
//                     {
//                       case: { $in: ["$$t.type", ["Charge", "Refund", "Discount"]] },
//                       then: { $multiply: [-1, "$$t.amount"] },
//                     },
//                   ],
//                   default: 0,
//                 },
//               },
//             },
//           },
//         },
//       },
//     },

//     // Final projection
//     {
//       $project: {
//         _id: 1,
//         name: { $concat: ["$first_name", " ", "$last_name"] },
//         auto_invoice: 1,      // single object
//         auto_invoicings: 1,   // full array
//         balance: 1,
//       },
//     },
//   ]);

//   return data;
// }

async function getStudentBalance(studentIds = [], dateRange = null) {
  const matchStage = {
    role: 3,
    isDeleted: false,
  };

  if (studentIds.length > 0) {
    matchStage._id = {
      $in: studentIds.map((id) =>
        mysqlOrm.Types.ObjectId.isValid(id) && !(id instanceof mysqlOrm.Types.ObjectId)
          ? new mysqlOrm.Types.ObjectId(id)
          : id
      ),
    };
  }

  const data = await User.aggregate([
    { $match: matchStage },

    // Lookup Transactions
    {
      $lookup: {
        from: "transactions",
        let: { studentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$student_id", "$$studentId"] },
                  { $eq: ["$isDeleted", false] },
                  ...(dateRange
                    ? [
                        {
                          $and: [
                            { $gte: ["$date", new Date(dateRange.start)] },
                            { $lte: ["$date", new Date(dateRange.end)] },
                          ],
                        },
                      ]
                    : []),
                ],
              },
            },
          },

          // Add transactionDelta field like in getBalanceDetailsOfStudent
          {
            $addFields: {
              transactionDelta: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$type", "Charge"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                    { case: { $eq: ["$type", "Refund"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                    { case: { $eq: ["$type", "Discount"] }, then: { $ifNull: ["$amount", 0] } },
                    { case: { $eq: ["$type", "Payment"] }, then: { $ifNull: ["$amount", 0] } },
                  ],
                  default: 0,
                },
              },
            },
          },
        ],
        as: "transactions",
      },
    },

    // Lookup AutoInvoicings (ARRAY)
    {
      $lookup: {
        from: "auto_invoicings",
        localField: "_id",
        foreignField: "studentId",
        as: "auto_invoicings",
      },
    },
    {
      $addFields: {
        auto_invoicings: { $arrayElemAt: ["$auto_invoicings", 0] },
      },
    },

    // Calculate balance (sum of transactionDelta)
    {
      $addFields: {
        balance: { $sum: "$transactions.transactionDelta" },
      },
    },

    // Final projection
    {
      $project: {
        _id: 1,
        name: { $concat: ["$first_name", " ", "$last_name"] },
        auto_invoice: 1,
        auto_invoicings: 1,
        balance: 1,
      },
    },
  ]);

  return data;
}

async function getStaffBalance(staffIds = [], dateRange = null) {
  const matchStage = {
    role: 2,
    isDeleted: false,
  };

  if (staffIds.length > 0) {
    matchStage._id = {
      $in: staffIds.map((id) =>
        mysqlOrm.Types.ObjectId.isValid(id) && !(id instanceof mysqlOrm.Types.ObjectId)
          ? new mysqlOrm.Types.ObjectId(id)
          : id
      ),
    };
  }

  const data = await User.aggregate([
    { $match: matchStage },

    // Lookup Transactions
    {
      $lookup: {
        from: "staff_transactions",
        let: { tutorId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$tutor_id", "$$tutorId"] },
                  { $eq: ["$isDeleted", false] },
                  ...(dateRange
                    ? [
                        {
                          $and: [
                            { $gte: ["$date", new Date(dateRange.start)] },
                            { $lte: ["$date", new Date(dateRange.end)] },
                          ],
                        },
                      ]
                    : []),
                ],
              },
            },
          },

          // Add transactionDelta field like in getBalanceDetailsOfStudent
          {
            $addFields: {
              transactionDelta: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$type", "Charge"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                    { case: { $eq: ["$type", "Refund"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                    { case: { $eq: ["$type", "Discount"] }, then: { $ifNull: ["$amount", 0] } },
                    { case: { $eq: ["$type", "Payment"] }, then: { $ifNull: ["$amount", 0] } },
                  ],
                  default: 0,
                },
              },
            },
          },
        ],
        as: "transactions",
      },
    },

    // Lookup AutoInvoicings (ARRAY)
    {
      $lookup: {
        from: "staff_auto_invoicings",
        localField: "_id",
        foreignField: "tutorId",
        as: "auto_invoicings",
      },
    },
    {
      $addFields: {
        auto_invoicings: { $arrayElemAt: ["$auto_invoicings", 0] },
      },
    },

    // Calculate balance (sum of transactionDelta)
    {
      $addFields: {
        balance: { $sum: "$staff_transactions.transactionDelta" },
      },
    },

    // Final projection
    {
      $project: {
        _id: 1,
        name: { $concat: ["$first_name", " ", "$last_name"] },
        auto_invoice: 1,
        auto_invoicings: 1,
        balance: 1,
      },
    },
  ]);

  return data;
}


module.exports = { getStudentBalance, getStaffBalance };