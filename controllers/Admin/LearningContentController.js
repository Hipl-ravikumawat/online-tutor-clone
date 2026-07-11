const mysqlOrm = require('mysql-orm');
const fs = require("fs");
var slugify = require("slugify");
const randomStr = require("randomstring");
const globalHelper = require("../../_helper/GlobalHelper");
const template = require("../../config/template");
const { join } = require("path");

const Topic = require("../../models/Topic");
const SubTopic = require("../../models/SubTopic");
const Grade = require("../../models/Grade");
const Program = require("../../models/Program");
const Assessment = require("../../models/Assessment");
const LearningContent = require("../../models/LearningContent");
const Lesson = require("../../models/Lesson");
const Slide = require("../../models/Slide");
const Practice = require("../../models/Practice");

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`
  remove: undefined, // remove characters that match regex, defaults to `undefined`
  lower: true, // convert to lower case, defaults to `false`
  strict: false, // strip special characters except replacement, defaults to `false`
  locale: "en", // language code of the locale to use
  trim: true, // trim leading and trailing replacement chars, defaults to `true`
};

module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,
  updateStatus,
  renderContents,
  getContentDetail,
  getLessonDetail,
};

/**
 * list learningContents.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    const user_detail = res.locals.loggedUserInfo;
    const [topics, grades] = await Promise.all([
      Topic.find({ isDeleted: false }).sort({ name: 1 }),
      Grade.find({ isDeleted: false }).sort({ name: 1 }),
    ]);

    const learningContents = await LearningContent.find({ status: 1 }).sort({
      _id: -1,
    });

    const totalLearningContent = await LearningContent.countDocuments({});
    const activeLearningContentCount = await LearningContent.countDocuments({
      status: 1,
    });

    const deactivatedLearningContentCount = await LearningContent.countDocuments({ status: 0 });

    const learningContentObject = {
      total: totalLearningContent,
      active: activeLearningContentCount,
      deactive: deactivatedLearningContentCount,
    };

    return res.render("../views/admin/learningContent/index", {
      topics: topics,
      grades: grades,
      learningContentObject: learningContentObject,
      learningContents: learningContents,
      loggedUserRole: user_detail.role,
    });
  } catch (error) {
    console.error('index error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * list learningContents.
 * @param {*} req
 * @param {*} res
 */
async function dataTable(req, res) {
  try {
    let results;
    let obj = (assignedLessons = {});
    let showEntries = req.body.showEntries;
    let offset = parseInt(req.body.offset);
    let currentPage = req.body.currentPage;
    let searchStr = req.body.search;
    let recordsTotal = (recordsFiltered = totalNoOfPages = 0);
    let assignedLearningContent =assignedLessonIds = assignedPracticeIds = assignedSlideIds = [];
    const user_detail = res.locals.loggedUserInfo;

    if (req.body.grade) {
      obj["grade_id"] = req.body.grade;
    }
    if (req.body.topic) {
      obj["topic_id"] = req.body.topic;
    }
    if (req.body.subTopic !== null && req.body.subTopic !== undefined && req.body.subTopic !== '') {
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

    if (user_detail.role > 2 && user_detail.role !== 4) {
      let fetchUserId = "";
      fetchUserId = { student_ids: { $in: [user_detail._id] } };

      let assignedPrograms = await Program.find({}).sort({
        created_at: -1,
      });

      if (assignedPrograms.length > 0) {
        for (program of assignedPrograms) {
          for (assignedContent of program.ex_content) {
            assignedLearningContent.push(assignedContent.learning_content_id);
            assignedLessonIds.push(assignedContent.lesson_id);
            if (assignedContent.learning_type == "practice") {
              assignedPracticeIds.push(
                mysqlOrm.Types.ObjectId(assignedContent.learning_id)
              );
            } else if (assignedContent.learning_type == "slide") {
              assignedSlideIds.push(
                mysqlOrm.Types.ObjectId(assignedContent.learning_id)
              );
            }
          }
        }
      }

      if (assignedLearningContent.length > 0) {
        obj["_id"] = assignedLearningContent;
      } else {
        obj["_id"] = "642142d0f3159f613ce66dcc";
      }

      if (assignedLessonIds.length > 0) {
        assignedLessons = { $and: [{ _id: { $in: assignedLessonIds } }] };
      }
      recordsTotal = await LearningContent.count({ $and: [obj, searchStr] });
      recordsFiltered = await LearningContent.count({ $and: [obj, searchStr] });
      totalNoOfPages = Math.ceil(recordsFiltered / showEntries);
      results = await LearningContent.find({ $and: [obj, searchStr] },"_id grade_id topic_id sub_topic_id title slug short_description content_directory thumbnail lesson_ids status created_at",{ skip: Number(offset), limit: Number(showEntries) })
        .populate({ 
          path: "grade_id",
          model: "grades",
          select: "_id name"
        })
        .populate({ 
          path: "topic_id",
          model: "topics",
          select: "_id name"
        })
        .populate({ 
          path: "sub_topic_id",
          model: "subTopics",
          select: "_id name topic_id", 
        })
        .populate([
          {
            path: "lesson_ids",
            model: "lessons",
            match: assignedLessons,
            populate: [
              {
                path: "slide_ids",
                model: "slides",
                select: "_id duration",
              },
              {
                path: "practice_ids",
                model: "practices",
                select: "_id duration",
              },
            ],
          },
        ])
        .collation({ locale: "en" })
        .sort({ title: 1 });
    } else {
      recordsTotal = await LearningContent.count({ $and: [obj, searchStr] });
      recordsFiltered = await LearningContent.count({ $and: [obj, searchStr] });
      totalNoOfPages = Math.ceil(recordsFiltered / showEntries);
      results = await LearningContent.find(
        { $and: [obj, searchStr] },
        "_id grade_id topic_id sub_topic_id title slug short_description content_directory thumbnail lesson_ids status created_at",
        { skip: Number(offset), limit: Number(showEntries) }
      ).populate({ 
          path: "grade_id",
          model: "grades",
          select: "_id name"
        })
        .populate({ 
          path: "topic_id",
          model: "topics",
          select: "_id name"
        })
        .populate({ 
          path: "sub_topic_id",
          model: "subTopics",
          select: "_id name topic_id", 
        })
        .populate(
        {
          path: "lesson_ids",
          model: "lessons",
          populate: [
            {
              path: "slide_ids",
              model: "slides",
              select: "_id duration",
            },
            {
              path: "practice_ids",
              model: "practices",
              select: "_id question_duration",
            },
            {
              path: "challenge_ids",
              model: "challenges",
              select: "_id duration",
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
      let i = (totalSlides = totalPractices = totalChallenges = 0);
      let durations = [];
      let courseImage = "";

      for (lesson of lessons_ids) {
        totalSlides += lesson.slide_ids.length;
        totalPractices += lesson.practice_ids.length;
        totalChallenges += lesson.challenge_ids.length;

        for (slide of lesson.slide_ids) {
          durations[i] = slide.duration;
          i++;
        }
        for (practice of lesson.practice_ids) {
          durations[i] = practice.question_duration;
          i++;
        }
        for (challenge of lesson.challenge_ids) {
          durations[i] = challenge.duration;
          i++;
        }
      }

      var totalDuration = globalHelper.calculateDuration(durations);
      if (
        content.content_directory === null ||
        content.thumbnail === null ||
        content.thumbnail === undefined ||
        content.thumbnail === "undefined"
      ) {
        courseImage = "";
      } else {
        courseImage = `/LearningContent/${content.content_directory}/${content.thumbnail}`;
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
        totalChallenges,
        totalDuration,
        user_role: user_detail.role,
      };


      contentRowHtml += template.render(
        { rowData },
        "/learningContent/learningContentRow.ejs"
      );
      totalSlides = totalPractices = totalChallenges = totalDuration = 0;
    }

    var data = JSON.stringify({
      currentPage: currentPage,
      result: results.length,
      recordsTotal: recordsTotal,
      recordsFiltered: recordsFiltered,
      totalNoOfPages: totalNoOfPages,
      courses: contentRowHtml,
    });

    return res.send(data);
  } catch (error) {
    console.error('dataTable error: ', error);
    res.status(500).json({ message: "Something went wrong, please try again later." });
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
      Topic.find({ isDeleted: false, status: 1 }).sort({ name: 1 }),
      SubTopic.find({ isDeleted: false, status: 1 }).sort({ name: 1 }),
      Grade.find({ isDeleted: false, status: 1 }).sort({ name: 1 }),
    ]);

    return res.render("../views/admin/learningContent/create", {
      topics: activeTopics,
      grades: activeGrades,
      subTopics: activeSubTopics,
    });
  } catch (error) {
    console.error('create error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store learningContent.
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
      const dir = "./assets/LearningContent/" + req.body.content_directory;
      await fs.mkdir(dir, (error) => {
        console.log(error);
      });
    }

    var myContent = {
      grade_id: req.body.grade_id,
      topic_id: req.body.topic_id,
      sub_topic_id: req.body.sub_topic_id ? req.body.sub_topic_id : null,
      title: req.body.title,
      short_description: req.body.short_description,
      content_directory: req.body.content_directory
        ? req.body.content_directory
        : "",
      thumbnail: req.file != undefined ? req.file.filename : null,
    };

    let learningContentDetail = await LearningContent.create(myContent);
    if (learningContentDetail) {
      req.flash("success", "The learning content is created successfully!");
      res.status(200).json({
        success: true,
        message: "learningContent is created successfully!",
        redirectUrl: "/learning-content",
      });
    }
  } catch (error) {
    console.error('store error: ', error);
    res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * edit learningContent.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req, res) {
  try {
    const [activeTopics, activeSubTopics, activeGrades] = await Promise.all([
      Topic.find({ isDeleted: false, status: 1 }).sort({ name: 1 }),
      SubTopic.find({ isDeleted: false, status: 1 }).sort({ name: 1 }),
      Grade.find({ isDeleted: false, status: 1 }).sort({ name: 1 }),
    ]);

    let results = await LearningContent.find({ slug: req.params.slug })
      .populate("grade_id")
      .populate("topic_id")
      .populate("sub_topic_id")
      .populate("lesson_ids");

    let subTopics = await SubTopic.find({
      isDeleted: false,
      topic_id: results[0].topic_id._id,
    }).sort({ name: 1 });

    if (results) {
      return res.render("../views/admin/learningContent/edit", {
        LearningContent: results[0],
        topics: activeTopics,
        grades: activeGrades,
        subTopics: activeSubTopics,
        subTopics: subTopics,
        fs: fs,
      });
    }
  } catch (error) {
    console.error('edit error: ', error);
    res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update learningContent.
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
      const dir = "./assets/LearningContent/" + req.body.content_directory;
      fs.mkdir(dir, (error) => {});

      updatedLearningContent = await LearningContent.findByIdAndUpdate(
        req.body.content_id,
        { content_directory: req.body.content_directory }
      );

      let learningContentDetails = await LearningContent.findById(
        req.body.content_id
      ).populate([
        {
          path: "lesson_ids",
          model: "lessons",
          populate: [
            {
              path: "slide_ids",
              model: "slides",
            },
            {
              path: "practice_ids",
              model: "practices",
            },
          ],
        },
      ]);

      for (lesson of learningContentDetails.lesson_ids) {
        if (lesson.slide_ids.length > 0) {
          for (slides of lesson.slide_ids) {
            updatedSlide = await Slide.findByIdAndUpdate(slides.id, {
              content_directory: req.body.content_directory,
            });
          }
        }
        if (lesson.practice_ids.length > 0) {
          for (practices of lesson.practice_ids) {
            updatedPractices = await Practice.findByIdAndUpdate(practices.id, {
              content_directory: req.body.content_directory,
            });
          }
        }
      }
    }

    if (req.body.content_id && req.body.content_id != "") {
      let learningContentDetails = await LearningContent.find({
        _id: req.body.content_id,
      });
      if (learningContentDetails) {
        learningContentData = learningContentDetails[0];
        let thumbnail = learningContentData.thumbnail;

        if (req.file != undefined) {
          if (learningContentData.content_directory != "" || thumbnail != "") {
            const filePath =
              "./assets/LearningContent/" +
              learningContentData.content_directory +
              "/" +
              thumbnail;

            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });
          }
          req.body.thumbnail = req.file.filename;
          let myCourseContent = {
            grade_id: req.body.grade_id,
            topic_id: req.body.topic_id,
            sub_topic_id: req.body.sub_topic_id ? req.body.sub_topic_id : null,
            title: req.body.title,
            short_description: req.body.short_description,
            content_directory: req.body.content_directory
              ? req.body.content_directory
              : null,
            thumbnail: req.body.thumbnail,
          };

          let updatedLearningContent = await LearningContent.findByIdAndUpdate(
            req.body.content_id,
            myCourseContent
          );
          if (updatedLearningContent) {
            req.flash(
              "success",
              "The learning content is updated successfully!"
            );
            res.status(200).json({
              success: true,
              message: "learningContent is created successfully!",
              redirectUrl: "/learning-content",
            });
          }
        } else {
          let updatedLearningContent = "";
          if (req.body.is_remove == 1) {
            const filePath =
              "./assets/LearningContent/" +
              learningContentData.content_directory +
              "/" +
              thumbnail;
            fs.exists(filePath, function (exists) {
              if (exists) {
                fs.unlinkSync(filePath);
              } else {
                // console.log('File not found, so not deleting.');
              }
            });
            let myCourseContent = {
              grade_id: req.body.grade_id,
              topic_id: req.body.topic_id,
              sub_topic_id: req.body.sub_topic_id
                ? req.body.sub_topic_id
                : null,
              title: req.body.title,
              short_description: req.body.short_description,
              thumbnail: null,
            };
            updatedLearningContent = await LearningContent.findByIdAndUpdate(
              req.body.content_id,
              myCourseContent
            );
          } else {
            let myCourseContent = {
              grade_id: req.body.grade_id,
              topic_id: req.body.topic_id,
              sub_topic_id: req.body.sub_topic_id
                ? req.body.sub_topic_id
                : null,
              title: req.body.title,
              short_description: req.body.short_description,
            };

            updatedLearningContent = await LearningContent.findByIdAndUpdate(
              req.body.content_id,
              myCourseContent
            );
          }

          if (updatedLearningContent) {
            req.flash(
              "success",
              "The learning content is updated successfully!"
            );
            res.status(200).json({
              success: true,
              message: "learningContent is created successfully!",
              redirectUrl: "/learning-content",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('update error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete learningContent
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const learningContentId = req.params.id;

    const isAssessmentExists = await Assessment.find({
      content: {
        $elemMatch: {
          learning_content_id: learningContentId,
        },
      },
    })
      .limit(1)
      .count();
     
    if (isAssessmentExists) {
      return res.status(400).json({
        success: false,
        redirectUrl: "page-reload",
        message:
          "This learning content  is currently enrolled in a assessment and cannot be deleted at this time.",
      });
    }

    const learningContent = await LearningContent.findOne({
      _id: learningContentId,
    }).populate("lesson_ids");
    if(learningContent.lesson_ids.length == 0){
      await LearningContent.findByIdAndDelete(
        learningContent
      );
      req.flash("success", "The learning content is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/learning-content",
        message: "The learning content is deleted successfully.",
      });
    }else{
      return res.status(200).json({
        success: false,
        redirectUrl: "/learning-content",
        message: "The learning content have lesson.",
      });
    }
    
  } catch (error) {
    console.error('destroy error: ', error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/learning-content",
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
      let learningContentDetail = await LearningContent.findByIdAndUpdate(
        req.body.uid,
        { status: status }
      );
      res.status(200).json({
        success: true,
        message: "The learning content status is updated successfully!",
      });
    }
  } catch (error) {
    console.error('updateStatus error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * render learning contents.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function renderContents(req, res) {
  try {
    var reqObj = {};
    reqObj["deleted_at"] = null;
    if (req.body.grade_id) {
      reqObj["grade_id"] = req.body.grade_id;
    }
    if (req.body.topic_id) {
      reqObj["topic_id"] = req.body.topic_id;
    }
    if (req.body.sub_topic_id !== null && req.body.sub_topic_id !== undefined && req.body.sub_topic_id !== '') {
      reqObj["sub_topic_id"] = req.body.sub_topic_id;
    }

    let recordsFiltered = await LearningContent.find({ $and: [reqObj] }).sort({ title: 1 });
    return res.send(recordsFiltered);
  } catch (error) {
    console.error('renderContents error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * get learning-content wise lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function getContentDetail(req, res) {
  try {
    if(req.body.content_id !== null && req.body.content_id !== undefined && req.body.content_id !== ''){     
      let learningContentId = mysqlOrm.Types.ObjectId(req.body.content_id);
      let learningContentDetail = await LearningContent.find({
        _id: learningContentId,
        deleted_at: null
      }, "_id title lesson_ids").populate({
        path: "lesson_ids",
        match: { $and: [{ slide_ids: { $gt: [] } }, { practice_ids: { $gt: [] } }] },
        options: { sort: { title: 1 } }
      });

      return res.send(learningContentDetail[0]);
    }
  } catch (error) {
    console.error('getContentDetail error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * get lesson's detail.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function getLessonDetail(req, res) {
  try {
    let req_lesson_ids = "";
    let filteredLessonIds = "";
    if (req.body.lesson_ids) {
      req_lesson_ids = req.body.lesson_ids.map(function (element) {
        return mysqlOrm.Types.ObjectId(element);
      }, this);
    }

    let learningContentDetail = await LearningContent.findOne({
      _id: req.body.content_id,
      deleted_at: null
    });

    let all_lesson_ids = learningContentDetail.lesson_ids;
    if (req.body.lesson_ids) {
      filteredLessonIds = req_lesson_ids.filter(function (e1) {
        return !all_lesson_ids.some(function (e2) {
          return e1 === e2;
        });
      });
    }

    let programType = req.body.program_type;
    let lessons = null;

    if (typeof programType !== "undefined" || programType.length > 0) {
      if (programType[0] == 1 && programType[1] == 2) {
        let lessons = await Lesson.find(
          { _id: { $in: filteredLessonIds } },
          { title: 1, slide_ids: 1, practice_ids: 1, challenge_ids: 1 }
        )
          .populate("slide_ids")
          .populate("practice_ids")
          .populate("challenge_ids");
        return res.send(lessons);
      } else if (programType[0] == 1) {
        let lessons = await Lesson.find(
          { _id: { $in: filteredLessonIds } },
          { title: 1, slide_ids: 1, challenge_ids: 1 }
        )
          .populate("slide_ids")
          .populate("practice_ids")
          .populate("challenge_ids");
        return res.send(lessons);
      } else if (programType[0] == 2) {
        let lessons = await Lesson.find(
          { _id: { $in: filteredLessonIds } },
          { title: 1, practice_ids: 1, challenge_ids: 1 }
        )
          .populate("practice_ids")
          .populate("challenge_ids");
        return res.send(lessons);
      }
    }

    if (programType == "") {
      let lessons = await Lesson.find(
        { _id: { $in: filteredLessonIds } },
        { title: 1, slide_ids: 1, practice_ids: 1 }
      )
        .populate("slide_ids")
        .populate("practice_ids");
      return res.send(lessons);
    }
  } catch (error) {
    console.error('getLessonDetail error: ', error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}