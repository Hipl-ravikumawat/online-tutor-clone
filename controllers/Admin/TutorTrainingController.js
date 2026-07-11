const mysqlOrm = require('mysql-orm');
const fs = require("fs");
const randomStr = require("randomstring");
const globalHelper = require("../../_helper/GlobalHelper");
const template = require("../../config/template");
const Topic = require("../../models/Topic");
const Grade = require("../../models/Grade");
const SubTopic = require("../../models/SubTopic");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");

module.exports = {
  index,
  listing,
  create,
  store,
  edit,
  update,
  updateStatus,
  destroy,
};

/**
 * tutor training index page.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const topics = await Topic.find({ isDeleted: false }).sort({ name: 1 });
    const totalTutorTrainingContent = await TutorTrainingContent.countDocuments(
      {}
    );

    const activeTutorTrainingContentCount =
      await TutorTrainingContent.countDocuments({
        status: 1,
      });

    const deactivatedTutorTrainingContentCount =
      await TutorTrainingContent.countDocuments({ status: 0 });

    const tutorTrainingContentObject = {
      total: totalTutorTrainingContent,
      active: activeTutorTrainingContentCount,
      deactive: deactivatedTutorTrainingContentCount,
    };
    return res.render("../views/admin/tutorTraining/index", {
      topics: topics,
      tutorTrainingContentObject: tutorTrainingContentObject,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * tutor training listing.
 * @param {*} req
 * @param {*} res
 */
async function listing(req, res) {
  try {
    let results;
    const user_detail = res.locals.loggedUserInfo;

    let obj = (assignedLessons = {});
    let showEntries = req.body.showEntries;
    let offset = parseInt(req.body.offset);
    let currentPage = req.body.currentPage;
    let searchStr = req.body.search;
    let recordsTotal = (recordsFiltered = totalNoOfPages = 0);
    let assignedTutorTrainingContent =
      (assignedLessonIds =
      assignedPracticeIds =
      assignedSlideIds =
        []);
    if (req.body.topic) {
      obj["topic_id"] = req.body.topic;
    }
    if (req.body.subTopic) {
      obj["sub_topic_id"] = req.body.subTopic;
    }
    if (req.body.status) {
      obj["status"] = req.body.status;
    }
    if (req.body.search) {
      var regex = new RegExp(req.body.search, "i");
      searchStr = { $or: [{ title: regex }] };
    } else {
      searchStr = {};
    }

    if (user_detail.role > 1) {
      let fetchUserId = "";
      if (user_detail.role === 2) {
        fetchUserId = { tutor_id: user_detail._id };
      }
      if (user_detail.role === 3) {
        fetchUserId = { student_ids: { $in: [user_detail._id] } };
      }

      if (assignedTutorTrainingContent.length > 0) {
        obj["_id"] = assignedTutorTrainingContent;
      } else {
        obj["_id"] = "642142d0f3159f613ce66dcc";
      }

      if (assignedLessonIds.length > 0) {
        assignedLessons = { $and: [{ _id: { $in: assignedLessonIds } }] };
      }
      recordsTotal = await TutorTrainingContent.count({
        $and: [obj, searchStr],
      });
      recordsFiltered = await TutorTrainingContent.count({
        $and: [obj, searchStr],
      });

      totalNoOfPages = Math.ceil(recordsFiltered / showEntries);
      results = await TutorTrainingContent.find(
        { $and: [obj, searchStr] },
        "_id topic_id sub_topic_id title slug short_description content_directory thumbnail lesson_ids status created_at",
        { skip: Number(offset), limit: Number(showEntries) }
      )
        .populate("topic_id")
        .populate("sub_topic_id")
        .populate([
          {
            path: "lesson_ids",
            model: "tutor_training_lessons",
            match: assignedLessons,
            populate: [
              {
                path: "slide_ids",
                model: "tutor_training_slides",
                select: "_id duration",
              },
              {
                path: "practice_ids",
                model: "tutor_training_practices",
                select: "_id duration",
              },
            ],
          },
        ])
        .collation({ locale: "en" })
        .sort({ title: 1 });
    } else {
      recordsTotal = await TutorTrainingContent.count({
        $and: [obj, searchStr],
      });
      recordsFiltered = await TutorTrainingContent.count({
        $and: [obj, searchStr],
      });
      totalNoOfPages = Math.ceil(recordsFiltered / showEntries);
      results = await TutorTrainingContent.find(
        { $and: [obj, searchStr] },
        "_id  topic_id sub_topic_id title slug short_description content_directory thumbnail lesson_ids status created_at",
        { skip: Number(offset), limit: Number(showEntries) }
      )
        .populate("topic_id")
        .populate("sub_topic_id")
        .populate({
          path: "lesson_ids",
          model: "tutor_training_lessons",
          populate: [
            {
              path: "slide_ids",
              model: "tutor_training_slides",
              select: "_id duration",
            },
            {
              path: "practice_ids",
              model: "tutor_training_practices",
              select: "_id question_duration",
            },
          ],
        })
        .collation({ locale: "en" })
        .sort({ title: 1 });
    }

    let contentRowHtml = "";
    for (content of results) {
      let contentStatus = content.status == 1 ? "Active" : "Deactive";
      let statusClass =
        content.status == 1 ? "status-active" : "status-deactive";

      let lessons_ids = content.lesson_ids;
      let i = (totalSlides = totalPractices = 0);
      let durations = [];
      let courseImage = "";

      for (lesson of lessons_ids) {
        totalSlides += lesson.slide_ids.length;
        totalPractices += lesson.practice_ids.length;

        for (slide of lesson.slide_ids) {
          durations[i] = slide.duration;
          i++;
        }
        for (practice of lesson.practice_ids) {
          durations[i] = practice.question_duration;
          i++;
        }
      }

      var totalDuration = globalHelper.calculateDuration(durations);
      if (content.content_directory === null || content.thumbnail === null || content.thumbnail === undefined ||
        content.thumbnail === "undefined") {
        courseImage = "";
      } else {
        courseImage = `/TutorTrainingContent/${content.content_directory}/${content.thumbnail}`;
      }

      if (content.sub_topic_id) {
        subTopicName = content.sub_topic_id.name;
      } else {
        subTopicName = "None";
      }

      const rowData = {
        content,
        courseImage,
        subTopicName,
        statusClass,
        contentStatus,
        totalSlides,
        totalPractices,
        totalDuration,
        user_role: user_detail.role,
      };

      contentRowHtml += template.render(
        { rowData },
        "/tutorTrainingContent/tutorTrainingContentRow.ejs"
      );
      totalSlides = totalPractices = totalDuration = 0;
    }

    let data = JSON.stringify({
      currentPage: currentPage,
      result: results.length,
      recordsTotal: recordsTotal,
      recordsFiltered: recordsFiltered,
      totalNoOfPages: totalNoOfPages,
      courses: contentRowHtml,
    });

    return res.send(data);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Something went wrong, please try again later." });
  }
}

/**
 * create content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {
    const [activeTopics, activeSubTopics, activeGrades] = await Promise.all([
      Topic.find({ isDeleted: false, status: 1 }).sort({ _id: -1 }),
      SubTopic.find({ isDeleted: false, status: 1 }).sort({ _id: -1 }),
      Grade.find({ isDeleted: false, status: 1 }).sort({ _id: -1 }),
    ]);

    return res.render("../views/admin/tutorTraining/create", {
      topics: activeTopics,
      grades: activeGrades,
      subTopics: activeSubTopics,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store training content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    if (req.body.content_directory == undefined) {
      const randomString = randomStr.generate({
        length: 8,
        charset: "alphabetic",
      });
      req.body.content_directory = "lc_" + randomString + Date.now();
      const dir = "./assets/TutorTrainingContent/" + req.body.content_directory;
      await fs.mkdir(dir, (error) => {
        console.log(error);
      });
    }

    var myContent = {
      topic_id: req.body.topic_id,
      sub_topic_id: req.body.sub_topic_id ? req.body.sub_topic_id : null,
      title: req.body.title,
      short_description: req.body.short_description,
      content_directory: req.body.content_directory
        ? req.body.content_directory
        : "",
      thumbnail: req.file != undefined ? req.file.filename : null,
    };

    const tutorTrainingContentDetail = await TutorTrainingContent.create(myContent);

    if (tutorTrainingContentDetail) {
      req.flash("success", "The learning content is created successfully!");
      res.status(200).json({
        success: true,
        message: "tutorTrainingContent is created successfully!",
        redirectUrl: "/tutor-training",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    const [activeTopics, activeSubTopics, activeGrades] = await Promise.all([
      Topic.find({ isDeleted: false, status: 1 }).sort({ _id: -1 }),
      SubTopic.find({ isDeleted: false, status: 1 }).sort({ _id: -1 }),
      Grade.find({ isDeleted: false, status: 1 }).sort({ _id: -1 }),
    ]);

    const results = await TutorTrainingContent.find({ slug: req.params.slug })
      .populate("topic_id")
      .populate("sub_topic_id")
      .populate("lesson_ids");

    const subTopics = await SubTopic.find({
      isDeleted: false,
      topic_id: results[0].topic_id._id,
    }).sort({ name: 1 });

    if (results) {
      return res.render("../views/admin/tutorTraining/edit", {
        TutorTrainingContent: results[0],
        topics: activeTopics,
        grades: activeGrades,
        subTopics: activeSubTopics,
        subTopics: subTopics,
        fs: fs,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update tutor training content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    if (req.body.content_directory == "") {
      const randomString = randomStr.generate({
        length: 8,
        charset: "alphabetic",
      });

      req.body.content_directory = "lc_" + randomString + Date.now();
      
      const dir = "./assets/TutorTrainingContent/" + req.body.content_directory;
      fs.mkdir(dir, (error) => {});

      await TutorTrainingContent.findByIdAndUpdate(req.body.content_id, {content_directory: req.body.content_directory});

      const tutorTrainingContentDetails = await TutorTrainingContent.findById(
        req.body.content_id
      ).populate([
        {
          path: "lesson_ids",
          model: "tutor_training_lessons",
          populate: [
            {
              path: "slide_ids",
              model: "tutor_training_slides",
            },
            {
              path: "practice_ids",
              model: "tutor_training_practices",
            },
          ],
        },
      ]);

      for (lesson of tutorTrainingContentDetails.lesson_ids) {
        if (lesson.slide_ids.length > 0) {
          for (slides of lesson.slide_ids) {
            await Slide.findByIdAndUpdate(slides.id, {
              content_directory: req.body.content_directory,
            });
          }
        }

        if (lesson.practice_ids.length > 0) {
          for (practices of lesson.practice_ids) {
            await Practice.findByIdAndUpdate(practices.id, {
              content_directory: req.body.content_directory,
            });
          }
        }
      }
    }

    if (req.body.content_id && req.body.content_id != "") {
      const tutorTrainingContentDetails = await TutorTrainingContent.find({
        _id: req.body.content_id,
      });
      
      if (tutorTrainingContentDetails) {
        let tutorTrainingContentData = tutorTrainingContentDetails[0];
        let thumbnail = tutorTrainingContentData.thumbnail;

        if (req.file != undefined) {
          if (tutorTrainingContentData.content_directory != "" || thumbnail != "") {
            const filePath = "./assets/TutorTrainingContent/" + tutorTrainingContentData.content_directory +
              "/" + thumbnail;

            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });
          }

          req.body.thumbnail = req.file.filename;

          const myCourseContent = {
            topic_id: req.body.topic_id,
            sub_topic_id: req.body.sub_topic_id ? req.body.sub_topic_id : null,
            title: req.body.title,
            short_description: req.body.short_description,
            content_directory: req.body.content_directory
              ? req.body.content_directory
              : null,
            thumbnail: req.body.thumbnail,
          };
          
          let updatedTutorTrainingContent = await TutorTrainingContent.findByIdAndUpdate(
              req.body.content_id,
              myCourseContent
            );
          if (updatedTutorTrainingContent) {
            req.flash(
              "success",
              "The learning content is updated successfully!"
            );

            res.status(200).json({
              success: true,
              message: "TutorTrainingContent is created successfully!",
              redirectUrl: "/tutor-training",
            });
          }
        } else {
          let updatedTutorTrainingContent = "";
          if (req.body.is_remove == 1) {
            const filePath = "./assets/TutorTrainingContent/" + tutorTrainingContentData.content_directory +
              "/" + thumbnail;
            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });

            const myCourseContent = {
              topic_id: req.body.topic_id,
              sub_topic_id: req.body.sub_topic_id ? req.body.sub_topic_id : null,
              title: req.body.title,
              short_description: req.body.short_description,
              thumbnail: null,
            };
            updatedTutorTrainingContent =
              await TutorTrainingContent.findByIdAndUpdate(
                req.body.content_id,
                myCourseContent
              );
          } else {
            let myCourseContent = {
              topic_id: req.body.topic_id,
              sub_topic_id: req.body.sub_topic_id ? req.body.sub_topic_id : null,
              title: req.body.title,
              short_description: req.body.short_description,
            };
            updatedTutorTrainingContent =
              await TutorTrainingContent.findByIdAndUpdate(
                req.body.content_id,
                myCourseContent
              );
          }

          if (updatedTutorTrainingContent) {
            req.flash(
              "success",
              "The Staff Course is updated successfully!"
            );
            res.status(200).json({
              success: true,
              message: "Staff Course is created successfully!",
              redirectUrl: "/tutor-training",
            });
          }
        }
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
 * update status of the training content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function updateStatus(req, res) {
  try {
    if (req.body.uid && req.body.uid != "") {
      const status = req.body.status == "true" ? "1" : "0";
      await TutorTrainingContent.findByIdAndUpdate(req.body.uid, {
        status: status,
      });
      res.status(200).json({
        success: true,
        message: "The learning content status is updated successfully!",
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
 * delete a tutor training content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const tutorTrainingContentId = req.params.id;

    const isTutorTrainingAssessmentExists = await TutorTrainingAssessment.find({
      content: {
        $elemMatch: {
          training_content_id: tutorTrainingContentId,
        },
      },
    })
      .limit(1)
      .count();

    if (isTutorTrainingAssessmentExists) {
      return res.status(400).json({
        success: false,
        redirectUrl: "page-reload",
        message:
          "This training content is currently enrolled in a training assessment and cannot be deleted at this time.",
      });
    }


    const tutorTrainingContent = await TutorTrainingContent.findOne({
      _id: tutorTrainingContentId,
    }).populate("lesson_ids");

    
    if (!tutorTrainingContent) {
      return res.status(404).json({
        success: false,
        redirectUrl: "/tutor-training",
        message: "The requested training content does not exist."
      });
    }

    if (tutorTrainingContent.lesson_ids.length == 0) {
      const directoryPath =
        "./assets/TutorTrainingContent/" +
        tutorTrainingContent.content_directory;

      // delete folder and their attachments
      deleteFolderRecursive(directoryPath);
      let ContentDeleted = await TutorTrainingContent.findByIdAndDelete(
        tutorTrainingContent
      );
      req.flash(
        "success",
        "The staff course is deleted successfully."
      );
      return res.status(200).json({
        success: true,
        redirectUrl: "/tutor-training",
        message: "The staff course is deleted successfully.",
      });
    } else {
      return res.status(200).json({
        success: false,
        redirectUrl: "/tutor-training",
        message: "The staff course have lessons.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete folder recursively.
 * @param {*} req
 * @param {*} res
 * @returns
 */
function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      const curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}