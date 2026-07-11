const mysqlOrm = require('mysql-orm');
const User = require("../../models/User");
const globalHelper = require("../../_helper/GlobalHelper");
const globalConstant = require("../../_helper/GlobalConstants");
const moment = require("moment");
const StudentAutoInvoicingSettings = require("../../models/StudentAutoInvoicingSettings");

module.exports = {
  index,
  dataTable,
  studentDetails,
};

async function index(req, res) {
  try {
    const businessSettingValue = await globalHelper.getBusinessSettingValue('accounts');

    const groupTags = await globalHelper.getGroupTagsList();
    const currency = globalConstant.currency;
    const invoiceTypes = globalConstant.invoice_types;
    const userData = await User.findOne({role:1}).lean();
    const sentFrom = [{ value: userData._id, label: `${userData.first_name} ${userData.last_name} <${userData.email}>` }];
    if(req.user.role != 1){
      sentFrom.push({ value: req.user._id, label: `${req.user.first_name} ${req.user.last_name} <${req.user.email}>` });
    }
    return res.render("../views/admin/invoicing/familyAndInvoices/index", { businessSettingValue, groupTags,currency,invoiceTypes,sentFrom });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

// async function dataTable(req, res) {
//   try {
//     const start = Number(req.body.start) || 0;
//     const length = Number(req.body.length) || 10;
//     const studentId = req.params.studentId;
//     const filterDate = req.body.filterDate || null;
//     const user_detail = res.locals.loggedUserInfo;
//     let userRole = user_detail.role;
//     // Custom search params
//     const searchFamily = req.body.searchFamily?.trim() || "";
//     const showInactive = req.body.showInactive == 1;
//     const groupTag = req.body.groupTag?.trim() || "";

//     const order = req.body.order?.[0] || {};
//     const orderColumnIndex = parseInt(order.column);
//     const orderDirection = order.dir === "asc" ? 1 : -1;
//     const columnMap = {
//       1: "family",
//       2: "studentName",
//       5: "balance",
//       6: "auto_pay",
//       7: "auto_invoice",
//       9: "last_invoice_date",
//       10: "last_payment_date"
//     };

//     function calculateDerivedBalance(transactions = []) {
//       const typePriority = { Payment: 1, Refund: 2, Discount: 3, Charge: 4 };
//       const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest â†’ newest

//       let balance = 0;
//       sorted.forEach(t => {
//         const amt = t.amount || 0;
//         if (["Payment", "Refund"].includes(t.type)) balance += amt;
//         else if (t.type === "Discount") balance = Math.abs(balance) - amt;
//         else if (t.type === "Charge") balance -= amt;
//       });

//       return balance;
//     }
  
//     const basePipeline = [
//       // --- Match students ---
//       {
//         $match: {
//           isDeleted: false,
//           role: 3,
//           ...(studentId && { _id: new mysqlOrm.Types.ObjectId(studentId) }),
//           ...(userRole === 2 && attachedStudentIds?.length
//             ? { _id: { $in: attachedStudentIds.map(id => new mysqlOrm.Types.ObjectId(id)) } }
//             : {})
//         }
//       },

//       // --- Lookup group tags ---
//       {
//         $lookup: {
//           from: "group_tags",
//           localField: "_id",
//           foreignField: "student_ids",
//           as: "groupTags"
//         }
//       },
//       {
//         $lookup: {
//           from: "auto_invoicings",
//           let: { studentId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$studentId", "$$studentId"] }
//               }
//             },
//             {
//               $project: {
//                 _id: 0,
//                 invoiceDetails: 1,
//                 preferences: 1,
//                 isActive: 1
//               }
//             },
//             { $limit: 1 }  // ensures only one doc is returned
//           ],
//           as: "auto_invoice_settings"
//         }
//       },
//       {
//         $unwind: {
//           path: "$auto_invoice_settings",
//           preserveNullAndEmptyArrays: true // keeps it null if no record
//         }
//       },
//       // --- Lookup family contacts ---
//       {
//         $lookup: {
//           from: "family_contacts",
//           localField: "_id",
//           foreignField: "student_id",
//           as: "contacts"
//         }
//       },

//       // --- Lookup users for family contacts ---
//       {
//         $lookup: {
//           from: "users",
//           localField: "contacts.user_id",
//           foreignField: "_id",
//           as: "familyUsers"
//         }
//       },
      
//       // --- Lookup transactions ---
//       {
//         $lookup: {
//           from: "transactions",
//           let: { studentId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$student_id", "$$studentId"] },
//                     { $eq: ["$deleted_at", null] },
//                     ...(filterDate ? [{ $lte: ["$date", moment.utc(filterDate, "DD-MM-YYYY").endOf("day").toDate()] }] : [])
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "transactions"
//         }
//       },

//       // --- Lookup invoices (last invoice date) ---
//       {
//         $lookup: {
//           from: "invoices",
//           let: { studentId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$student_id", "$$studentId"] },
//                     ...(userRole === 2 && attachedStudentIds?.length
//                       ? [{ $in: ["$student_id", attachedStudentIds.map(id => new mysqlOrm.Types.ObjectId(id))] }]
//                       : [])
//                   ]
//                 }
//               }
//             },
//             { $sort: { date: -1 } },
//             { $limit: 1 },
//             { $project: { date: 1 } }
//           ],
//           as: "lastInvoice"
//         }
//       },

//       // --- Lookup last payment transaction ---
//       {
//         $lookup: {
//           from: "transactions",
//           let: { studentId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$student_id", "$$studentId"] },
//                     { $eq: ["$type", "Payment"] },
//                     { $eq: ["$deleted_at", null] }
//                   ]
//                 }
//               }
//             },
//             { $sort: { date: -1 } },
//             { $limit: 1 },
//             { $project: { date: 1 } }
//           ],
//           as: "lastPayment"
//         }
//       },

//       // --- Optional Filters ---
//       ...(groupTag
//         ? [
//             {
//               $match: { "groupTags._id": new mysqlOrm.Types.ObjectId(groupTag) }
//             }
//           ]
//         : []),

//       ...(!showInactive ? [{ $match: { status: 1 } }] : []),

//       ...(searchFamily
//         ? [
//             {
//               $match: {
//                 $or: [
//                   { familyUsers: { $elemMatch: { company_name: new RegExp(searchFamily, "i") } } },
//                   { familyUsers: { $elemMatch: { first_name: new RegExp(searchFamily, "i") } } },
//                   { familyUsers: { $elemMatch: { last_name: new RegExp(searchFamily, "i") } } },
//                   { familyUsers: { $elemMatch: { email: new RegExp(searchFamily, "i") } } },
//                   { first_name: new RegExp(searchFamily, "i") },
//                   { last_name: new RegExp(searchFamily, "i") },
//                   { email: new RegExp(searchFamily, "i") }
//                 ]
//               }
//             }
//           ]
//         : []),
//       // --- Final projection ---
//       {
//         $project: {
//           _id: 1,
//           studentName: {
//             $concat: [
//               { $ifNull: ["$first_name", ""] },
//               " ",
//               { $ifNull: ["$last_name", ""] }
//             ]
//           },
//           auto_pay: 1,
//           auto_invoice: 1,
//           // family (company_name > name > fallback to student)
//           family: {
//             $cond: [
//               {
//                 $gt: [
//                   {
//                     $strLenCP: {
//                       $reduce: {
//                         input: {
//                           $map: {
//                             input: "$familyUsers",
//                             as: "fu",
//                             in: {
//                               $cond: [
//                                 { $ne: ["$$fu.company_name", ""] },
//                                 "$$fu.company_name",
//                                 {
//                                   $concat: [
//                                     { $ifNull: ["$$fu.first_name", ""] },
//                                     " ",
//                                     { $ifNull: ["$$fu.last_name", ""] }
//                                   ]
//                                 }
//                               ]
//                             }
//                           }
//                         },
//                         initialValue: "",
//                         in: {
//                           $cond: [
//                             { $eq: ["$$value", ""] },
//                             "$$this",
//                             { $concat: ["$$value", "; ", "$$this"] }
//                           ]
//                         }
//                       }
//                     }
//                   },
//                   0
//                 ]
//               },
//               {
//                 $reduce: {
//                   input: {
//                     $map: {
//                       input: "$familyUsers",
//                       as: "fu",
//                       in: {
//                         $cond: [
//                           { $ne: ["$$fu.company_name", ""] },
//                           "$$fu.company_name",
//                           {
//                             $concat: [
//                               { $ifNull: ["$$fu.first_name", ""] },
//                               " ",
//                               { $ifNull: ["$$fu.last_name", ""] }
//                             ]
//                           }
//                         ]
//                       }
//                     }
//                   },
//                   initialValue: "",
//                   in: {
//                     $cond: [
//                       { $eq: ["$$value", ""] },
//                       "$$this",
//                       { $concat: ["$$value", "; ", "$$this"] }
//                     ]
//                   }
//                 }
//               },
//               {
//                 $concat: [
//                   { $ifNull: ["$first_name", ""] },
//                   " ",
//                   { $ifNull: ["$last_name", ""] }
//                 ]
//               }
//             ]
//           },

//           // contacts
//           contacts: {
//             $map: {
//               input: "$familyUsers",
//               as: "fu",
//               in: { email: "$$fu.email", phone: "$$fu.phone" }
//             }
//           },
//           auto_invoice_settings: 1,
//           // group tags
//           group_tags: {
//             $map: {
//               input: "$groupTags",
//               as: "tag",
//               in: { name: "$$tag.name", color: "$$tag.color" }
//             }
//           },
//           transactions: 1,
//           // balance: {
//           //   $sum: {
//           //     $map: {
//           //       input: "$transactions",
//           //       as: "t",
//           //       in: {
//           //         $switch: {
//           //           branches: [
//           //             {
//           //               case: { $eq: ["$$t.type", "Payment"] },
//           //               then: "$$t.amount"
//           //             },
//           //             {
//           //               case: { $in: ["$$t.type", ["Charge", "Refund", "Discount"]] },
//           //               then: { $multiply: [-1, "$$t.amount"] }
//           //             }
//           //           ],
//           //           default: 0
//           //         }
//           //       }
//           //     }
//           //   }
//           // },
//           last_invoice_date: { $arrayElemAt: ["$lastInvoice.date", 0] },
//           last_payment_date: { $arrayElemAt: ["$lastPayment.date", 0] }
//         }
//       }
//     ];
//     // --- Count total filtered ---
//     const countResult = await User.aggregate([...basePipeline, { $count: "total" }]);
//     const recordsFiltered = countResult[0]?.total || 0;

//     // --- Fetch paginated data ---
//     const paginatedResults = await User.aggregate([
//       ...basePipeline,
//       { $sort: columnMap[orderColumnIndex] ? { [columnMap[orderColumnIndex]]: orderDirection } : { studentName: 1 } },
//       { $skip: start },
//       { $limit: length }
//     ]);

//     // --- Calculate derived balance for each student ---
//     const dataWithBalance = paginatedResults.map(entry => {
//       const derivedBalance = calculateDerivedBalance(entry.transactions || []);
//       return { ...entry, balance: derivedBalance };
//     });

//     const currency = globalConstant.currency;
//     const tagColors = globalConstant.tag_colors;

//     // --- Format data for DataTables ---
//     const data = dataWithBalance.map(entry => {
//       const familyContactEmail = entry.contacts
//         .map(c => {
//           const emailHTML = c.email ? `<div class="family_con_in"><i class="fa fa-envelope"></i><span>${c.email}</span></div>` : "";
//           const phoneHTML = c.phone ? `<div class="family_con_in"><i class="fa fa-phone"></i><span>${c.phone}</span></div>` : "";
//           return `<div class="mb-2">${emailHTML}${phoneHTML}</div>`;
//         })
//         .join("");

//       const groupTagsHTML = `<div class="group-tags-container">${
//         entry.group_tags
//           .map(group => {
//             let colorData = tagColors.find(tc => tc.key === group.color) || { background_color: "#ccc", color: "#000" };
//             return `<span class="badge" style="background-color:${colorData.background_color};color:${colorData.color}">${group.name || ""}</span>`;
//           })
//           .join(" ")
//       }</div>`;

//       const autoInvoiceSettings = entry.auto_invoice_settings;
//       let invoiceSettingsHtml = formatAutoInvoice(autoInvoiceSettings, currency, entry.balance || 0, true);

//       return {
//         _id: entry._id,
//         family: entry.family || "-",
//         family_contact_email: familyContactEmail || "-",
//         group_tags: groupTagsHTML,
//         balance_txt: `${currency.symbol}${(entry.balance || 0).toFixed(2)}`,
//         balance: (entry.balance || 0).toFixed(2),
//         auto_invoice: entry.auto_invoice ? "Enabled" : "-",
//         auto_pay: entry.auto_pay || null,
//         auto_invoice_settings: entry.auto_invoice_settings || null,
//         auto_invoice_setting: invoiceSettingsHtml,
//         students: entry.studentName || "-",
//         last_invoice_date: entry.last_invoice_date || null, // hook real date later
//         last_payment_date: entry.last_payment_date || null,
//       };
//     });

//     // --- Totals ---
//     let prepaidTotal = 0,
//     owedTotal = 0;
//     dataWithBalance.forEach(entry => {
//       const bal = entry.balance || 0;
//       if (bal >= 0) prepaidTotal += bal;
//       else owedTotal += bal;
//     });
    
//     return res.json({
//       draw: req.body.draw,
//       recordsTotal: recordsFiltered,
//       recordsFiltered,
//       data,
//       totalPrepaid: prepaidTotal,
//       totalOwed: owedTotal,
//       currency: `${currency.symbol}`
//     });
//   } catch (err) {
//     console.error("Family Contacts DataTable Error:", err);
//     return res.status(500).json({ message: "Server Error" });
//   }
// }

async function dataTable(req, res) {
  try {
    const start = Number(req.body.start) || 0;
    const length = Number(req.body.length) || 10;
    const studentId = req.params.studentId;
    const filterDate = req.body.filterDate || null;
    const user_detail = res.locals.loggedUserInfo;
    let userRole = user_detail.role;

    // EARLY RETURN FOR TUTORS WITH NO STUDENTS
    if (userRole === 2 && (!attachedStudentIds || attachedStudentIds.length === 0)) {
      return res.json({
        draw: req.body.draw,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        totalPrepaid: 0,
        totalOwed: 0,
        currency: `${globalConstant.currency.symbol}`
      });
    }
    const searchFamily = req.body.searchFamily?.trim() || "";
    const showInactive = req.body.showInactive == 1;
    const groupTag = req.body.groupTag?.trim() || "";

    const order = req.body.order?.[0] || {};
    const orderColumnIndex = parseInt(order.column);
    const orderDirection = order.dir === "asc" ? 1 : -1;
    const columnMap = {
      1: "family",
      2: "studentName",
      5: "balance",
      6: "auto_pay",
      7: "auto_invoice",
      9: "last_invoice_date",
      10: "last_payment_date"
    };

    // --- Base student match ---
    const baseMatch = {
      isDeleted: false,
      role: 3,
      ...(studentId && { _id: new mysqlOrm.Types.ObjectId(studentId) }),
      ...(userRole === 2 && attachedStudentIds?.length
        ? { _id: { $in: attachedStudentIds.map(id => new mysqlOrm.Types.ObjectId(id)) } }
        : {})
    };

    // --- Pipeline ---
    const pipeline = [
      { $match: baseMatch },

      // --- Lookups ---
      {
        $lookup: {
          from: "group_tags",
          let: { studentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $in: ["$$studentId", "$student_ids"] } } },
            { $project: { name: 1, color: 1 } }
          ],
          as: "groupTags"
        }
      },
      {
        $lookup: {
          from: "auto_invoicings",
          let: { studentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$studentId", "$$studentId"] } } },
            { $project: { _id: 0, invoiceDetails: 1, preferences: 1, isActive: 1 } },
            { $limit: 1 }
          ],
          as: "auto_invoice_settings"
        }
      },
      { $unwind: { path: "$auto_invoice_settings", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "family_contacts",
          localField: "_id",
          foreignField: "student_id",
          as: "contacts"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "contacts.user_id",
          foreignField: "_id",
          as: "familyUsers",
          pipeline: [
            { $project: { first_name: 1, last_name: 1, company_name: 1, email: 1, phone: 1 } }
          ]
        }
      },

      // --- Transactions Lookup with typePriority and transactionDelta ---
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
                    { $eq: ["$deleted_at", null] },
                    ...(filterDate ? [{ $lte: ["$date", moment.utc(filterDate, "DD-MM-YYYY").endOf("day").toDate()] }] : [])
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                type: 1,
                amount: 1,
                date: 1,
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
                      { case: { $eq: ["$type", "Charge"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                      { case: { $eq: ["$type", "Refund"] }, then: { $multiply: [-1, { $ifNull: ["$amount", 0] }] } },
                      { case: { $eq: ["$type", "Discount"] }, then: { $ifNull: ["$amount", 0] } },
                      { case: { $eq: ["$type", "Payment"] }, then: { $ifNull: ["$amount", 0] } }
                    ],
                    default: 0
                  }
                }
              }
            },
            { $sort: { date: 1, typePriority: 1 } }
          ],
          as: "transactions"
        }
      },

       // --- Calculate balance in the pipeline BEFORE sorting ---
      {
        $addFields: {
          calculatedBalance: {
            $reduce: {
              input: "$transactions",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      { $isArray: "$$this.transactionDelta" },
                      0,
                      { $ifNull: ["$$this.transactionDelta", 0] }
                    ]
                  }
                ]
              }
            }
          }
        }
      },

      // --- Last invoice ---
      {
        $lookup: {
          from: "invoices",
          let: { studentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$student_id", "$$studentId"] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
            { $project: { date: 1 } }
          ],
          as: "lastInvoice"
        }
      },

      // --- Last payment ---
      {
        $lookup: {
          from: "transactions",
          let: { studentId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ["$student_id", "$$studentId"] }, { $eq: ["$type", "Payment"] }, { $eq: ["$deleted_at", null] } ] } } },
            { $sort: { date: -1 } },
            { $limit: 1 },
            { $project: { date: 1 } }
          ],
          as: "lastPayment"
        }
      },

      ...(groupTag ? [{ $match: { "groupTags._id": new mysqlOrm.Types.ObjectId(groupTag) } }] : []),
      ...(!showInactive ? [{ $match: { status: { $in: [1, 2, 3] } } }] : []),
      ...(searchFamily
      ? [
          
          {
            $addFields: {
              studentFullName: {
                $concat: [
                  { $ifNull: ["$first_name", ""] },
                  " ",
                  { $ifNull: ["$last_name", ""] }
                ]
              }
            }
          },
          
          {
            $addFields: {
              familySearchText: {
                $reduce: {
                  input: "$familyUsers",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      " ",
                      { $ifNull: ["$$this.company_name", ""] },
                      " ",
                      { $ifNull: ["$$this.first_name", ""] },
                      " ",
                      { $ifNull: ["$$this.last_name", ""] }
                    ]
                  }
                }
              }
            }
          },
          
          {
            $match: {
              $or: [
                { studentFullName: { $regex: searchFamily, $options: "i" } },
                { familySearchText: { $regex: searchFamily, $options: "i" } }  
              ]
            }
          }
        ]
      : []),
      {
        $project: {
          _id: 1,
          studentName: {
            $concat: [
              { $ifNull: ["$first_name", ""] },
              " ",
              { $ifNull: ["$last_name", ""] }
            ]
          },
          auto_pay: 1,
          auto_invoice: 1,
          calculatedBalance: 1,
          family: {
            $cond: [
              {
                $gt: [
                  {
                    $strLenCP: {
                      $reduce: {
                        input: {
                          $map: {
                            input: "$familyUsers",
                            as: "fu",
                            in: {
                              $cond: [
                                { $ne: ["$$fu.company_name", ""] },
                                "$$fu.company_name",
                                {
                                  $concat: [
                                    { $ifNull: ["$$fu.first_name", ""] },
                                    " ",
                                    { $ifNull: ["$$fu.last_name", ""] }
                                  ]
                                }
                              ]
                            }
                          }
                        },
                        initialValue: "",
                        in: {
                          $cond: [
                            { $eq: ["$$value", ""] },
                            "$$this",
                            { $concat: ["$$value", "; ", "$$this"] }
                          ]
                        }
                      }
                    }
                  },
                  0
                ]
              },
              {
                $reduce: {
                  input: {
                    $map: {
                      input: "$familyUsers",
                      as: "fu",
                      in: {
                        $cond: [
                          { $ne: ["$$fu.company_name", ""] },
                          "$$fu.company_name",
                          {
                            $concat: [
                              { $ifNull: ["$$fu.first_name", ""] },
                              " ",
                              { $ifNull: ["$$fu.last_name", ""] }
                            ]
                          }
                        ]
                      }
                    }
                  },
                  initialValue: "",
                  in: {
                    $cond: [
                      { $eq: ["$$value", ""] },
                      "$$this",
                      { $concat: ["$$value", "; ", "$$this"] }
                    ]
                  }
                }
              },
              { $concat: [{ $ifNull: ["$first_name", ""] }, " ", { $ifNull: ["$last_name", ""] }] }
            ]
          },
          contacts: {
            $map: {
              input: "$familyUsers",
              as: "fu",
              in: { email: "$$fu.email", phone: "$$fu.phone" }
            }
          },
          auto_invoice_settings: 1,
          group_tags: {
            $map: {
              input: "$groupTags",
              as: "tag",
              in: { name: "$$tag.name", color: "$$tag.color" }
            }
          },
          transactions: 1,  
          last_invoice_date: { $arrayElemAt: ["$lastInvoice.date", 0] },
          last_payment_date: { $arrayElemAt: ["$lastPayment.date", 0] }
        }
      }

    ];

    // --- Count ---
    const countResult = await User.aggregate([...pipeline, { $count: "total" }]);
    const recordsFiltered = countResult[0]?.total || 0;

    // --- Fetch paginated with case-insensitive sorting ---
      const sortStage = {};

      // Step 1: Add lowercase fields in the pipeline
      pipeline.push({
        $addFields: {
          family_sort: { $toLower: "$family" },
          studentName_sort: { $toLower: "$studentName" }
        }
      });

      // Step 2: Determine which field to sort
      if (columnMap[orderColumnIndex] === "family") {
        sortStage["family_sort"] = orderDirection;
      } else if (columnMap[orderColumnIndex] === "studentName") {
        sortStage["studentName_sort"] = orderDirection;
      } else if (columnMap[orderColumnIndex] === "balance") {
        // SPECIFIC FIX FOR BALANCE COLUMN: Sort by the calculatedBalance field
        sortStage["calculatedBalance"] = orderDirection;
      } else if (columnMap[orderColumnIndex]) {
        sortStage[columnMap[orderColumnIndex]] = orderDirection;
      } else {
        sortStage["studentName_sort"] = 1; // default
      }

      // Step 3: Aggregate with sort
      const paginatedResults = await User.aggregate([
        ...pipeline,
        { $sort: sortStage },
        { $skip: start },
        { $limit: length }
      ]);


    // --- Calculate derived balance per student ---
   const dataWithBalance = paginatedResults.map(entry => {
      return { 
        ...entry, 
        balance: entry.calculatedBalance || 0 
      };
    });

    const currency = globalConstant.currency;
    const tagColors = globalConstant.tag_colors;

    // --- Format for DataTables ---
    const data = dataWithBalance.map(entry => {
      const familyContactEmail = entry.contacts
        .map(c => {
          const emailHTML = c.email ? `<div class="family_con_in"><i class="fa fa-envelope"></i><span>${c.email}</span></div>` : "";
          const phoneHTML = c.phone ? `<div class="family_con_in"><i class="fa fa-phone"></i><span>${c.phone}</span></div>` : "";
          return `<div class="mb-2">${emailHTML}${phoneHTML}</div>`;
        })
        .join("");

      const groupTagsHTML = entry.group_tags ? `<div class="group-tags-container">${
        entry.group_tags.map(group => {
          const colorData = tagColors.find(tc => tc.key === group.color) || { background_color: "#ccc", color: "#000" };
          return `<span class="badge" style="background-color:${colorData.background_color};color:${colorData.color}">${group.name || ""}</span>`;
        }).join(" ")
      }</div>` : '';

      const autoInvoiceSettings = entry.auto_invoice_settings;
      let invoiceSettingsHtml = formatAutoInvoice(autoInvoiceSettings, currency, entry.balance || 0, true);

      return {
        _id: entry._id,
        family: entry.family || "-",
        family_contact_email: familyContactEmail || "-",
        group_tags: groupTagsHTML,
        balance_txt: `${currency.symbol}${(entry.balance || 0).toFixed(2)}`,
        balance: (entry.balance || 0).toFixed(2),
        auto_invoice: entry.auto_invoice ? "Enabled" : "-",
        auto_pay: entry.auto_pay || null,
        auto_invoice_settings: entry.auto_invoice_settings || null,
        auto_invoice_setting: invoiceSettingsHtml,
        students: entry.studentName || "-",
        last_invoice_date: entry.last_invoice_date || null,
        last_payment_date: entry.last_payment_date || null
      };
    });

    // --- Totals ---
    let prepaidTotal = 0, owedTotal = 0;
    dataWithBalance.forEach(entry => {
      const bal = entry.balance || 0;
      if (bal >= 0) prepaidTotal += bal;
      else owedTotal += bal;
    });

    return res.json({
      draw: req.body.draw,
      recordsTotal: recordsFiltered,
      recordsFiltered,
      data,
      totalPrepaid: prepaidTotal,
      totalOwed: Number(owedTotal.toFixed(2)),
      currency: `${currency.symbol}`
    });
  } catch (err) {
    console.error("Family Contacts DataTable Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
}



function formatAutoInvoice(autoInvoiceSettings, currency, balance = 0, asHtml = false) {
  if (!autoInvoiceSettings) return asHtml ? "-" : null;

  const { invoiceDetails, preferences } = autoInvoiceSettings;

  const billingStart = moment(invoiceDetails?.billingCycleStartDate);
  const billingEnd = billingStart.clone().add(1, "month").subtract(1, "day");

  let nextInvoiceDate;
  if (invoiceDetails.invoiceCreationDate.option === "first_day_of_billing_cycle") {
    nextInvoiceDate = billingStart.clone();
  } else if (invoiceDetails.invoiceCreationDate.option === "choose_date") {
    nextInvoiceDate = moment(invoiceDetails.invoiceCreationDate.customDate);
  } else {
    nextInvoiceDate = billingStart.clone();
  }

  let freqLabel = invoiceDetails.autoInvoicingSchedule.frequency;
  if (freqLabel === "monthly") freqLabel = "month";
  else if (freqLabel === "yearly") freqLabel = "year";

  const obj = {
    nextInvoiceDate: nextInvoiceDate.format("DD-MM-YYYY"),
    billingRange: `${billingStart.format("DD-MM-YYYY")} to ${billingEnd.format("DD-MM-YYYY")}`,
    balanceForward: preferences?.balanceForward ? "Enabled" : "Disabled",
    autoEmail: preferences?.autoEmail ? "Enabled" : "Disabled",
    invoiceFor: invoiceDetails?.invoiceFor?.[0] === "upcoming_lessons" ? "Prepaid Lessons" : "Postpaid Lessons",
    repeatRule: `${invoiceDetails.autoInvoicingSchedule.frequency} on day ${billingStart.date()} every ${invoiceDetails.autoInvoicingSchedule.repeatsEvery} ${freqLabel}`,
    nextInvoiceBalance: `${currency.symbol}${(balance < 0 ? Math.abs(balance) : 0).toFixed(2)}`
  };

  // return HTML for datatable OR object for rendering
  if (asHtml) {
    return `
      <div class="auto-invoice-settings">
        <p class="m-1"><strong>Next Invoice:</strong> ${obj.nextInvoiceDate}</p>
        <p class="d-block m-1"><strong>Billing Period:</strong> ${obj.billingRange}</p>
        <p class="m-1"><strong>Balance Forward:</strong> ${obj.balanceForward}</p>
        <p class="m-1"><strong>Auto email:</strong> ${obj.autoEmail}</p>
        <p class="d-block m-1"><strong>Interval:</strong> ${obj.repeatRule}</p>
        <p class="d-block m-1"><strong>Next Invoice Balance:</strong> ${obj.nextInvoiceBalance}</p>
      </div>
    `;
  }

  return obj;
}

async function studentDetails(req, res) {
  try {
    const studentId = req.params.id;
    if(!studentId) return;

    const businessSettingValue = await globalHelper.getBusinessSettingValue('accounts');
    const invoiceTypes = globalConstant.invoice_types;

    const familySets = await globalHelper.getFamiliesListForFamiliesInvoices();

    const student = familySets.find(item => item._id.toString() === studentId);
    const contacts = student ? student.contacts : [];
    
    // Optional filter date
    const filterDate = req.query.filterDate ? new Date(req.query.filterDate) : null;

    const finalBalance = await globalHelper.getBalanceDetailsOfStudent(studentId);
    const currency = globalConstant.currency;

    const userData = await User.findOne({role:1}).lean();
    const sentFrom = [{ value: userData._id, label: `${userData.first_name} ${userData.last_name} <${userData.email}>` }];
    if(req.user.role != 1){
      sentFrom.push({ value: req.user._id, label: `${req.user.first_name} ${req.user.last_name} <${req.user.email}>` });
    }

    // Fetch auto-invoicing data
    const autoInvoice = await StudentAutoInvoicingSettings.findOne({
      studentId,
      isActive: true,
    }).lean();

    const autoInvoiceDisplay = formatAutoInvoice(autoInvoice, currency, 0, false);

    
    let studentStatus = 0; 
    
    if (student && student.student_email) {
      const studentWithStatus = await User.findOne({
        email: student.student_email,
        role: 3 // Assuming students have role 3
      }).select('status').lean();
      
      if (studentWithStatus) {
        studentStatus = studentWithStatus.status || 0;
      } else {
        const studentById = await User.findById(studentId).select('status').lean();
        if (studentById) {
          studentStatus = studentById.status || 0;
        }
      }
    }
    
    if (student) {
      student.status = studentStatus;
    }

    return res.render("../views/admin/invoicing/familyAndInvoices/familyAccounts/family-details", {
      student,
      contacts,
      familySets,
      filterDate,
      finalBalance,
      studentId,
      ucwords: globalHelper.ucwords,
      businessSettingValue,
      currency,
      sentFrom,
      invoiceTypes,
      autoInvoiceDisplay,
    });

  } catch (error) {
    console.error("Family Details Error:", error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

