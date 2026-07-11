const mysqlOrm = require('mysql-orm');

const fs = require("fs");
const path = require("path");
const globalHelper = require("../../_helper/GlobalHelper");
var slugify = require("slugify");
const { join } = require("path");
const { v4: uuidv4 } = require("uuid");
const template = require("../../config/template");

const LearningContent = require("../../models/LearningContent");
const Lesson = require("../../models/Lesson");
const Slide = require("../../models/Slide");
const Practice = require("../../models/Practice");
const Challenge = require("../../models/Challenge");
const Program = require("../../models/Program");
const Assessment = require("../../models/Assessment");
const AttemptedAssessment = require("../../models/AttemptedAssessment");
const SavedAssessment = require("../../models/SavedAssessment");
const EventCourse = require("../../models/EventCourse");

const LearningContentVersions = require("../../models/LearningContentVersions");
const LessonVersions = require("../../models/LessonVersions");
const SlideVersions = require("../../models/SlideVersions");
const PracticeVersions = require("../../models/PracticeVersions");
const ChallengeVersions = require("../../models/ChallengeVersions");

module.exports = {
  index,
  dataTable,
  store,
  update,
  destroy,
  updateLessonPosition,
  duplicateLesson,
  viewSingle,
  contentSlider,
};

const slugify_options = {
  replacement: "-", // replace spaces with replacement character, defaults to `-`
  remove: undefined, // remove characters that match regex, defaults to `undefined`
  lower: true, // convert to lower case, defaults to `false`
  strict: false, // strip special characters except replacement, defaults to `false`
  locale: "en", // language code of the locale to use
  trim: true, // trim leading and trailing replacement chars, defaults to `true`
};

/**---------------------Lessons crud functions starts ----------------------- */

/**
 * list lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    let taskType = "";
    let totalLessons = 0;
    const programId = req.params.taskId || "";
    const contentSlug = req.originalUrl.split("/")[2];
    const user_detail = res.locals.loggedUserInfo;

    let learningContent = await LearningContent.findOne(
      { slug: contentSlug },
      "_id title slug lesson_ids"
    ).populate({
      path: "lesson_ids",
      model: "lessons",
      select: "_id",
      options: { sort: { position: 1, created_at: 1 } },
    });

    if (!learningContent) {
      const version = await LearningContentVersions.findOne({ slug: contentSlug });
      if (version) {
        // Find original by title
        learningContent = await LearningContent.findOne(
          { title: version.title },
          "_id title slug lesson_ids"
        ).populate({
          path: "lesson_ids",
          model: "lessons",
          select: "_id",
          options: { sort: { position: 1, created_at: 1 } },
        });
        
        if (learningContent) {
          return res.redirect(`/learning-content/${learningContent.slug}/lessons`);
        }
      }
      
      req.flash('error', 'Learning content not found.');
      return res.redirect('back');
    }

    if (user_detail.role > 2 && user_detail.role !== 4) {
      //-- get all assigned lesson from program

      //-- get all the lesson of current learning content
        let lessonIdsArray = learningContent.lesson_ids;
        let idArray = lessonIdsArray.map(function (obj) {
          return obj.id;
        });


      const assignedLessons = await assignedLessonsOfProgram(req, res, contentSlug);
        let newArray = assignedLessons.map(function (obj) {
          return obj.toString();
        });
        let intersect = newArray.filter(value => idArray.includes(value));
        let uniqueValues = [...new Set(intersect)];
      totalLessons = uniqueValues.length;


    } else {
      totalLessons = learningContent.lesson_ids.length;
    }

    let allLearningContents = await LearningContent.find({ status: 1 }, "_id title")
    .collation({ locale: "en", strength: 2 }) // Case-insensitive sorting
    .sort({ title: 1 });

    return res.render("../views/admin/learningContent/lessons/index", {
      learningContent: learningContent,
      totalLessons: totalLessons,
      loggedUserRole: user_detail.role,
      allLearningContents: allLearningContents,
      completedSlides: [],
      completedCheckbox: false,
      programId,
      taskType: taskType,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * datable lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dataTable(req, res) {
  try {
    const user_detail = res.locals.loggedUserInfo;
    let contentSlug = req.body.contentSlug;
    let loggedUserRole = user_detail.role;
    let programId = req.body.program_id;
    let programType = req.body.programType;
    let html = "";
    let lessonData = null;
    let matchLessonIds;
    let assignedLessons = [];

    if (loggedUserRole > 2 && loggedUserRole !== 4) {
      assignedLessons = await assignedLessonsOfProgram(req, res, req.params.contentSlug);
      matchLessonIds = { $and: [{ _id: { $in: assignedLessons } }] };
    }
    const searchStr = req.body.searchStr;
    if (searchStr) {
      matchLessonName =
        loggedUserRole > 1 || loggedUserRole !== 4
          ? {
            $and: [
              { _id: { $in: assignedLessons } },
              { title: new RegExp(searchStr, "i") },
            ],
          }
          : { title: new RegExp(searchStr, "i") };
      lessonData = await LearningContent.find(
        { slug: contentSlug },
        { lesson_ids: 1 }
      ).populate({
        path: "lesson_ids",
        model: "lessons",
        match: matchLessonName,
        options: { sort: { position: 1 } },
        populate: [
          {
            path: "slide_ids",
            model: "slides",
            select: "_id",
          },
          {
            path: "practice_ids",
            model: "practices",
            select: "_id",
          },
          {
            path: "challenge_ids",
            model: "challenges",
            select: "_id",
          },
        ],
      });
    } else {
      lessonData = await LearningContent.find(
        { slug: contentSlug },
        { lesson_ids: 1 }
      ).populate({
        path: "lesson_ids",
        model: "lessons",
        match: matchLessonIds,
        options: { sort: { position: 1 } },
        populate: [
          {
            path: "slide_ids",
            model: "slides",
            select: "_id",
          },
          {
            path: "practice_ids",
            model: "practices",
            select: "_id",
          },
          {
            path: "challenge_ids",
            model: "challenges",
            select: "_id",
          },
        ],
      });
    }

    const lessons = lessonData[0].lesson_ids;
    if (lessons.length > 0) {
      lessons.forEach((lesson, i) => {
        const totalSlides = lesson.slide_ids.length;
        const totalPractices = lesson.practice_ids.length;
        const totalChallenges = lesson.challenge_ids.length;
        html += template.render({
          lesson,
          totalSlides,
          totalPractices,
          totalChallenges,
          contentSlug,
          programId,
          programType,
          loggedUserRole,
          count: i + 1, // Use index directly for counting
        }, "/learningContent/lesson/lessonRow.ejs");
      });
    } else {
      html += `<div class="no_lesson"><span><img src="/images/folder-icon.svg"></span><h3 class="title-text">No Lesson Found.</h3></div>`;
    }

    return res.send(html);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    const contentSlug = req.body.contentSlug;
    let lesson = "";
    let learningContent = await LearningContent.findOne(
      { slug: contentSlug },
      "lesson_ids"
    ).populate("lesson_ids");

    if (learningContent != null) {
      let allLessons = learningContent.lesson_ids;

      if (learningContent.lesson_ids.length === 0) {
        req.body.position = 1;
        lesson = await Lesson.create(req.body);
      } else {
        let maxPosition = allLessons.reduce((a, b) =>
          a.position > b.position ? a : b
        ).position;
        req.body.position = maxPosition + 1;
        lesson = await Lesson.create(req.body);
      }

      let LearningContentUpdate = await LearningContent.findOneAndUpdate(
        { slug: contentSlug },
        { $push: { lesson_ids: lesson._id } }
      );

      let successMsg = "The lesson is created successfully!";
      req.flash("success", successMsg);
      res.status(200).json({ success: true, message: successMsg });
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong, please try again later.",
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
 * update lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  try {
    let contentSlug = req.params.id;
    await Lesson.findByIdAndUpdate(contentSlug, {
      title: req.body.title,
    });
    let successMsg = "The lesson is updated successfully!";
    req.flash("success", successMsg);
    res.status(200).json({ success: true, message: successMsg });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * delete a lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const contentSlug = req.originalUrl.split("/")[2];
    const lessonId = mysqlOrm.Types.ObjectId(req.params.id);

    const lesson = await Lesson.findById(lessonId).populate("slide_ids").populate("practice_ids").populate("challenge_ids");

    const isAssessmentExists = await Assessment.find({
      "content.lessons": {
        $elemMatch: {
          lesson_id: lessonId,
        },
      },
    })
      .limit(1)
      .count();

    if (isAssessmentExists > 0) {
      return res.status(400).json({
        success: false,
        redirectUrl: "page-reload",
        message:
          "This lesson  is currently enrolled in a assessment and cannot be deleted at this time.",
      });
    }

    if (lesson.slide_ids.length > 0) {
      for (slide of lesson.slide_ids) {
        if (slide.video !== "") {
          const filePath = `./assets/LearningContent/${slide.content_directory}/${slide.video}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The file not found, so not deleted.");
            }
          });
        }

        if (slide.attachments[0] !== "") {
          const filePath = `./assets/LearningContent/${slide.content_directory}/${slide.attachments[0]}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The file not found, so not deleted.");
            }
          });
        }

        let deletedSlide = await Slide.findByIdAndDelete(slide._id);
      }
    }

    if (lesson.practice_ids.length > 0) {
      for (practice of lesson.practice_ids) {
        if (practice.question_image !== "") {
          const filePath = `./assets/LearningContent/${practice.content_directory}/${practice.question_image}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The question image is not found, so not deleted.");
            }
          });
        }

        if (practice.question_audio !== "") {
          const filePath = `./assets/LearningContent/${practice.content_directory}/${practice.question_audio}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The question audio is not found, so not deleted.");
            }
          });
        }

        if (practice.options != null && practice.options.length > 0) {
          for (option of practice.options) {
            if (option.option_image !== "") {
              const filePath = `./assets/LearningContent/${practice.content_directory}/${option.option_image}`;
              fs.exists(filePath, function (exists) {
                if (exists) {
                  fs.unlinkSync(filePath);
                } else {
                  console.log("The option image is not found, so not deleted.");
                }
              });
            }
          }
        }

        let deletedPractice = await Practice.findByIdAndDelete(practice._id);
      }
    }

    if (lesson.challenge_ids.length > 0) {
      for (challenge of lesson.challenge_ids) {
        await Challenge.findByIdAndDelete(challenge._id);
      }
    }

    await Lesson.findByIdAndDelete(lessonId);
    await LearningContent.findOneAndUpdate(
      { slug: contentSlug },
      { $pull: { lesson_ids: lessonId } }
    );

    let successMsg = "The lesson is deleted successfully!";
    req.flash("success", successMsg);
    return res.status(200).json({
      success: true,
      redirectUrl: "page-reload",
      message: successMsg,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "page-reload",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updateLessonPosition
 */
async function updateLessonPosition(req, res) {
  try {
    let positions = req.body.positions;

    if (positions.length > 0) {
      for (position of positions) {
        await Lesson.findByIdAndUpdate(position[0], {
          position: position[1],
        });
      }
      res.status(200).json({
        success: true,
        message: "The lessons are reordered successfully.",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong, please try again later.",
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
 * duplicate a lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function duplicateLesson(req, res) {
  try {
    const learningContentId = req.body.learningContentId;
    const lessonId = req.body.lessonId;
    if (learningContentId != "" && lessonId != "") {
      let lessonContent = await Lesson.findById(lessonId);
      if (lessonContent != "") {
        const slides = lessonContent.slide_ids;
        const practices = lessonContent.practice_ids;
        const challenges = lessonContent.challenge_ids;

        const currentLearningContent = await LearningContent.find({
          lesson_ids: { $in: mysqlOrm.Types.ObjectId(lessonId) },
        });

        const newLearningContent = await LearningContent.findById(
          learningContentId
        );

        let oldLearningContentId = learningContentId;
        let newLearningContentId = currentLearningContent[0].id;
        let content_directory = "";

        let oldContentDirectory = currentLearningContent[0].content_directory;
        if (oldLearningContentId == newLearningContentId) {
          content_directory = currentLearningContent[0].content_directory;
        } else {
          content_directory = newLearningContent.content_directory;
        }

        slides.map((slides) => slides.toString());
        practices.map((practices) => practices.toString());
        challenges.map((challenges) => challenges.toString());

        let slidesData = await Slide.find({ _id: { $in: slides } });
        let practicesData = await Practice.find({ _id: { $in: practices } });
        let challengesData = await Challenge.find({ _id: { $in: challenges } });

        const copyLesson = {
          title: lessonContent.title,
          position: lessonContent.position,
        };

        let cloneLesson = await Lesson.create(copyLesson);

        // copy slides
        for (slide of slidesData) {
          let newAttachment = (video = "");
          if (slide.attachments[0] != "" && slide.attachments[0] != null && slide.attachments[0] != undefined) {
            let attachment = slide.attachments[0].split("-");
            attachment[0] = Date.now();
            newAttachment = attachment.join("-");

            fs.copyFile(
              `./assets/LearningContent/${oldContentDirectory}/${slide.attachments[0]}`,
              `./assets/LearningContent/${content_directory}/${newAttachment}`,
              (err) => {
                if (err) throw err;
              }
            );
          }

          if (slide.video != "" && slide.video != null && slide.video != undefined) {
            let videoName = slide.video.split("-");
            videoName[0] = Date.now();
            video = videoName.join("-");
            fs.copyFile(
              `./assets/LearningContent/${oldContentDirectory}/${slide.video}`,
              `./assets/LearningContent/${content_directory}/${video}`,
              (err) => {
                if (err) throw err;
              }
            );
          }

          const Obj = {
            title: slide.title,
            duration: slide.duration,
            description: slide.description,
            video_url: slide.video_url,
            video: video,
            attachments: newAttachment,
            content_directory: content_directory,
            position: slide.position,
          };

          duplicateSlide = await Slide.create(Obj);
          await Lesson.findByIdAndUpdate(cloneLesson.id, {
            $push: { slide_ids: duplicateSlide._id },
          });
        }

        // copy practices
        for (practice of practicesData) {
          let question_image = "";
          let question_audio = "";
          let optionObject = [];
          if (practice.options != "" && practice.options != null && practice.options != undefined) {
            for (option of practice.options) {
              let option_image = option.option_image;
              if (option.option_image != "" && option.option_image != null) {
                let image = option.option_image.split("-");
                image[0] = Date.now();
                option_image = image.join("-");
                fs.copyFile(
                  `./assets/LearningContent/${oldContentDirectory}/${option.option_image}`,
                  `./assets/LearningContent/${content_directory}/${option_image}`,
                  (err) => {
                    if (err) throw err;
                  }
                );
              }
              let obj = {
                option_image: option_image,
                option_text: option.option_text,
                option_correct: option.option_correct,
              };
              optionObject.push(obj);
            }
          }

          if (practice.question_image != "" && practice.question_image != null && practice.question_image != undefined) {
            let image = practice.question_image.split("-");
            image[0] = Date.now();
            question_image = image.join("-");
            fs.copyFile(
              `./assets/LearningContent/${oldContentDirectory}/${practice.question_image}`,
              `./assets/LearningContent/${content_directory}/${question_image}`,
              (err) => {
                if (err) throw err;
              }
            );
          }

          if (practice.question_audio != "" && practice.question_audio != null) {
            let audio = practice.question_audio.split("-");
            audio[0] = Date.now();
            question_audio = audio.join("-");

            fs.copyFile(
              `./assets/LearningContent/${oldContentDirectory}/${practice.question_audio}`,
              `./assets/LearningContent/${content_directory}/${question_audio}`,
              (err) => {
                if (err) throw err;
              }
            );
          }

          const Obj = {};
          Obj["question_type"] = practice.question_type;
          Obj["question_title"] = practice.question_title;
          Obj["question"] = practice.question;
          Obj["question_duration"] = practice.question_duration;
          Obj["question_explanation"] = practice.question_explanation;
          Obj["content_directory"] = content_directory;
          Obj["question_image"] = question_image;
          Obj["question_audio"] = question_audio;
          Obj["position"] = practice.position;
          Obj["option_display_preference"] = practice.option_display_preference;
          Obj["challenges_listing"] = practice.challenges_listing;

          if (practice.question_type != "text") {
            Obj["options"] = optionObject;
          }

          duplicatePractice = await Practice.create(Obj);
          await Lesson.findByIdAndUpdate(cloneLesson.id, {
            $push: { practice_ids: duplicatePractice._id },
          });
        }

        // copy challenges
        for (challenge of challengesData) {
          const Obj = {
            title: challenge.title,
            type: challenge.type,
            duration: challenge.duration,
            show_timer: challenge.show_timer,
            multiplication_no: challenge.multiplication_no,
            position: challenge.position,
          };

          duplicateChallenge = await Challenge.create(Obj);

          await Lesson.findByIdAndUpdate(cloneLesson.id, {
            $push: { challenge_ids: duplicateChallenge._id },
          });

          // await Practice.updateMany(
          //   { reference_id: practicesId },
          //   { $set: { reference_id: "" } }
          // );
        }

        let UpdatedLearningContent = await LearningContent.findOneAndUpdate(
          { _id: learningContentId },
          { $push: { lesson_ids: cloneLesson._id } }
        );

        res.status(200).json({
          success: true,
          message:
            "The " +
            lessonContent.title +
            " is copied successfully into the " +
            UpdatedLearningContent.title +
            ".",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Something went wrong, please try again later.",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: "Something went wrong, please try again later.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}
/**  ---------------------Lessons crud functions end ----------------------- */

/**
 * view a single lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function viewSingle(req, res) {
  try {
    const taskType = req.params.type || "";
    global.sidebarType = "learningContent";

    // Route to specific task handler
    if (taskType === "assessment") {
      return await handleAssessmentView(req, res);
    } else if (taskType === "event") {
      return await handleEventView(req, res);
    } else {
      return await handleDefaultView(req, res);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

// ==================== Assessment Handler ====================
async function handleAssessmentView(req, res) {
  const user_detail = res.locals.loggedUserInfo;
  const contentSlug = req.originalUrl.split("/")[2];
  const { taskId, lessonSlug, lessonType } = req.params;
  const studentId = user_detail._id.toString();

  // Get assigned content - properly destructure all return values
  const assignData = await assignedHomeworkContent(
    req, res, taskId, lessonType, lessonSlug
  );
  const practiceIds = assignData[0] || [];
  const challengeIds = assignData[1] || [];
  const applyDurationOnAssessment = assignData[2] || false; // Ensure default value

  // Fetch versioned content
  const learningContent = await fetchContent({
    contentSlug,
    lessonSlug,
    isAssessment: true,
    matchPracticeIds: prepareIdFilter(practiceIds?._id),
    matchChallengeIds: prepareIdFilter(challengeIds?._id)
  });

  if (!learningContent?.lesson_ids?.[0]) {
    throw new Error("Learning content not found");
  }

  const lesson = learningContent.lesson_ids[0];
  const stats = await calculateContentStatistics(lesson);
  const savedQuestions = await getSavedAssessmentQuestions(req, lesson, studentId);

  // Get attempted assessment
  const attemptedAssessment = await AttemptedAssessment.findOne({
    assessment_id: mysqlOrm.Types.ObjectId(taskId),
    student_id: mysqlOrm.Types.ObjectId(studentId),
    lesson_id: mysqlOrm.Types.ObjectId(lesson._id),
    challenge_id: null,
  });

  if (
    attemptedAssessment &&
    attemptedAssessment.status === 'Almost,Try Again'
  ) {

    // get only incorrect question ids
    const incorrectQuestionIds = attemptedAssessment.answers
      .filter(answer => answer.isCorrect === false)
      .map(answer => answer.questionId.toString());

    // show only incorrect practices
    lesson.practice_ids = lesson.practice_ids.filter(practice =>
      incorrectQuestionIds.includes(practice._id.toString())
    );
  }

  // Prepare response - pass all required variables
  setAssessmentGlobals(lessonType, applyDurationOnAssessment, stats, savedQuestions);

  return renderResponse(res, {
    content: learningContent,
    lesson,
    taskId,
    taskType: "assessment",
    savedQuestions,
    assessmentDetails: global.assessmentDetails
  });
}

// ==================== Event Handler ====================
async function handleEventView(req, res) {
  const contentSlug = req.originalUrl.split("/")[2];
  const { taskId: eventId, lessonType: lessonId } = req.params;

  // Get event data
  const eventData = await EventCourse.findOne(
    { event_ids: mysqlOrm.Types.ObjectId(eventId) },
    { content: { $elemMatch: { lesson_id: mysqlOrm.Types.ObjectId(lessonId) } } }
  ).lean();

  const { slides, is_skipped: isSkipped } = eventData.content[0];
  const { slideIds, completedSlides } = processEventSlides(slides);

  // Fetch original content
  const learningContent = await fetchContent({
    contentSlug,
    lessonSlug: req.params.lessonSlug,
    matchSlideIds: { _id: { $in: slideIds } },
    isAssessment: true,
  });

  if (!learningContent?.lesson_ids?.[0]) {
    throw new Error("Learning content not found");
  }

  const lesson = learningContent.lesson_ids[0];
  const stats = await calculateContentStatistics(lesson);

  // Prepare response
  setEventGlobals(completedSlides, isSkipped);
  global.lessonContentStatics = stats; // Add this line

  return renderResponse(res, {
    content: learningContent,
    lesson,
    taskId: eventId,
    taskType: "event",
    savedQuestions: []
  });
}

// ==================== Default Handler ====================
async function handleDefaultView(req, res) {
  const contentSlug = req.originalUrl.split("/")[2];
  
  // Fetch original content
  const learningContent = await fetchContent({
    contentSlug,
    lessonSlug: req.params.lessonSlug,
  });
  // console.log(learningContent,'learningContent');
  if (!learningContent?.lesson_ids?.[0]) {
    throw new Error("Learning content not found");
  }

  const lesson = learningContent.lesson_ids[0];
  const stats = await calculateContentStatistics(lesson);
  setEventGlobals();
  global.lessonContentStatics = stats; // Add this line

  // Prepare response
  return renderResponse(res, {
    content: learningContent,
    lesson,
    taskId: "",
    taskType: "",
    savedQuestions: [],
    applyDurationOnAssessment:false,
  });
}

// ==================== Core Helper Functions ====================

async function fetchContent({
  contentSlug,
  lessonSlug,
  isAssessment = false,
  matchSlideIds = {},
  matchPracticeIds = {},
  matchChallengeIds = {}
}) {
  const models = getContentModels(isAssessment);
  
  return await models.content.findOne({ slug: contentSlug })
    .populate({
      path: "lesson_ids",
      model: models.lesson,
      match: { slug: lessonSlug },
      options: { sort: { position: 1, created_at: 1 } },
      populate: [
        {
          path: "slide_ids",
          model: models.slide,
          match: matchSlideIds,
          options: { sort: { position: 1, created_at: 1 } },
          select: { _id: 1, title: 1, slug: 1, duration: 1, content_directory: 1 }
        },
        {
          path: "practice_ids",
          model: models.practice,
          match: matchPracticeIds,
          options: { sort: { position: 1, created_at: 1 } },
          select: { _id: 1, question_type: 1, question_title: 1, question_slug: 1, 
                   question_duration: 1, content_directory: 1 }
        },
        {
          path: "challenge_ids",
          model: models.challenge,
          match: matchChallengeIds,
          options: { sort: { position: 1, created_at: 1 } },
          select: { _id: 1, title: 1, slug: 1, duration: 1, content_directory: 1 }
        }
      ]
    })
    .sort({ _id: -1 })
    .lean();
}

async function calculateContentStatistics(lesson) {
  const calculateTotal = (items, durationField = 'duration') => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
      const duration = parseInt(item[durationField]) || 0;
      return sum + duration;
    }, 0); // Added initial value of 0
  };

  return {
    slide_duration: calculateTotal(lesson.slide_ids),
    practice_duration: calculateTotal(lesson.practice_ids, 'question_duration'),
    challenge_duration: calculateTotal(lesson.challenge_ids),
    total_slides: lesson.slide_ids?.length || 0,
    total_practices: lesson.practice_ids?.length || 0,
    total_challenges: lesson.challenge_ids?.length || 0,
    total_duration: function() {
      return this.slide_duration + this.practice_duration + this.challenge_duration;
    }
  };
}

function processEventSlides(slides) {
  const slideIds = [];
  const completedSlides = [];

  slides.forEach(slide => {
    const slideId = slide.slide_id.toString();
    slideIds.push(mysqlOrm.Types.ObjectId(slideId));
    if (slide.mark_as_read) completedSlides.push(slideId);
  });

  return { slideIds, completedSlides };
}

async function getSavedAssessmentQuestions(req, lesson, studentId) {
  const saved = await SavedAssessment.findOne({
    assessment_id: req.params.taskId,
    lesson_id: lesson._id,
    student_id: studentId
  });

  return saved?.answers?.length > 0 
    ? saved.answers 
    : lesson.practice_ids.map(p => ({
        questionId: p._id,
        attachment: "",
        type: p.question_type,
        submittedAnswer: "",
        isCorrect: ""
      }));
}

function prepareIdFilter(ids) {
  return Array.isArray(ids) && ids.length > 0
    ? { _id: { $in: ids.map(id => mysqlOrm.Types.ObjectId(id)) } }
    : {};
}

// ==================== Global Setters ====================
function setAssessmentGlobals(lessonType, applyDuration, stats, savedQuestions) {
  global.assessmentDetails = {
    type: lessonType,
    applyDuration, // Now properly received
    practiceDuration: stats.practice_duration,
    savedQuestions
  };
  global.lessonContentStatics = stats;
}

function setEventGlobals(completedSlides = [], isSkipped = false) {
  global.eventContentDetails = {
    completedSlides,
    completedCheckbox: true,
    isSkippedProgram: isSkipped
  };
}

// ==================== Response Renderer ====================

async function renderResponse(res, { content, lesson, taskId, taskType, savedQuestions,applyDurationOnAssessment=false }) {
  const isAttached = await checkLessonAttachments(lesson._id);
  return res.render("../views/admin/learningContent/lessons/view", {
    fs: fs,
    learningContent: {
      id: content._id,
      slug: content.slug,
      title: content.title,
      grade_id: content.grade_id,
      topic_id: content.topic_id,
      sub_topic_id: content.sub_topic_id,
      thumbnail: content.thumbnail,
      content_directory: content.content_directory,
      short_description: content.short_description,
      isLessonAssign: isAttached
    },
    lesson,
    taskId,
    taskType,
    savedQuestion: savedQuestions,
    applyDurationOnAssessment,
  });
}
// ==================== Response getContentModels ====================

function getContentModels(taskType) {
  return taskType ? {
    content: LearningContentVersions,
    lesson: LessonVersions,
    slide: SlideVersions,
    practice: PracticeVersions,
    challenge: ChallengeVersions
  } : {
    content: LearningContent,
    lesson: Lesson,
    slide: Slide,
    practice: Practice,
    challenge: Challenge
  };
}
async function checkLessonAttachments(lessonId) {
  const [programCount, assessmentCount] = await Promise.all([
    Program.countDocuments({ ex_content: { $elemMatch: { lesson_id: lessonId } } }),
    Assessment.countDocuments({ content: { $elemMatch: { lessons: { $elemMatch: { lesson_id: lessonId } } } } })
  ]);
  return programCount + assessmentCount > 0;
}

/**
 * render slick slider content on single lesson view.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function contentSlider(req, res) {
  try {
    const user_detail = res.locals.loggedUserInfo;
    const lessonId = req.body.lesson_id;
    const lessonSlug = req.body.lesson_slug;
    const activeLessonContentType = req.body.type;
    const activeContentId = req.body.content_id;
    const userRole = user_detail.role;
    let savedQuestion = [];
    const baseUrl = req.headers.host.startsWith("localhost")
      ? req.protocol + "://" + req.headers.host
      : "https://" + req.headers.host;

    let contentHtml = "";

    // check is assessment already submitted
    if (req.body.task_id != '' && req.body.task_type === 'assessment') {
      if (activeLessonContentType == "practices") {
        const filter = {
        assessment_id: mysqlOrm.Types.ObjectId(req.body.task_id),
        student_id: mysqlOrm.Types.ObjectId(user_detail._id),
        lesson_id: mysqlOrm.Types.ObjectId(lessonId),
        challenge_id: null,
      };

      // count
      const isSubmitted = await AttemptedAssessment.countDocuments(filter);

      // get status
      const attemptedAssessment = await AttemptedAssessment.findOne(
        filter,
        { status: 1 }
      );

      const status = attemptedAssessment?.status || null;

      if (isSubmitted > 0 && status == 'Completed') {
        const data = {
          isSubmitted: true
        };

        return res.send(data);
      } 
      }
    }
    const models = getContentModels(req.body.task_type === 'event' || req.body.task_type === 'assessment');
    
    if (activeLessonContentType == "slides") {
      const slide = await models.slide.findById(activeContentId);
      let videoExtension = (pdfExtension = "");

      if (slide?.attachments[0] != "") {
        pdfExtension = path.extname(slide?.attachments[0]); // .pdf
      }
      if (slide.video != "") {
        videoExtension = path.extname(slide?.video); // .pdf
      }
      contentHtml = template.render(
        {
          slide: slide,
          lessonId: lessonId,
          lessonSlug: lessonSlug,
          pdfExtension: pdfExtension,
          videoExtension: videoExtension,
          baseUrl,
        },
        "/learningContent/lesson/slides/slides.ejs"
      );
    }
    
    if (activeLessonContentType == "practices") {
      const practice = await models.practice.findById(activeContentId);
    
      let audioExtension = "";
      let attachmentName = "";
      let studentId = user_detail._id.toString();
      if (req.body.task_id != '' && req.body.task_type === 'assessment') {
        const outerParsed = JSON.parse(req.body.saved_practice_question);
        // Then parse the actual array
        const savedPracticeQuestion = typeof outerParsed == 'string' ? JSON.parse(outerParsed) : outerParsed;
        savedQuestion = savedPracticeQuestion.map(question => {
          if (question.questionId === activeContentId) {
            return question.submittedAnswer;
          } else {
            return null; // Or any other value indicating no match
          }
        }).find(answer => answer !== null);
        if (savedQuestion === undefined) {
          savedQuestion = [];
        }
        attachmentName = savedPracticeQuestion.find(question => question.questionId === activeContentId);
        attachmentName = attachmentName !== undefined ? attachmentName.attachment : '';
      }
      if (practice?.question_audio != "" && practice?.question_audio != null) {
        audioExtension = path.extname(practice.question_audio);
      }
      if (practice.question_type == "text") {
        contentHtml = template.render({
          practice: practice,
          audioExtension: audioExtension,
          lessonSlug: lessonSlug,
          lessonId: lessonId,
          userRole: userRole,
          savedQuestion: savedQuestion,
          attachmentName: (attachmentName != '') ? '/Assessment/' + attachmentName : '',
        }, "/learningContent/lesson/practices/typeText.ejs");
      } else if (practice.question_type == "drag_and_drop") {
        let shuffle_options = globalHelper.shuffle(practice.options);
        contentHtml = template.render({
          practice: practice,
          shuffle_options: shuffle_options,
          lessonSlug: lessonSlug,
          lessonId: lessonId,
          userRole: userRole,
          savedQuestion: savedQuestion,
        }, "learningContent/lesson/practices/dragDrop.ejs");
      } else {
        if (practice.option_display_preference == "text") {
          if (practice.question_image != "") {
            contentHtml += template.render({
              practice: practice,
              audioExtension: audioExtension,
              lessonId: lessonId,
              lessonSlug: lessonSlug,
              userRole: userRole,
              savedQuestion: savedQuestion,
            }, "/learningContent/lesson/practices/selectImage.ejs");
          } else {
            contentHtml = template.render({
              practice: practice,
              audioExtension: audioExtension,
              lessonId: lessonId,
              lessonSlug: lessonSlug,
              userRole: userRole,
              savedQuestion: savedQuestion,
            }, "/learningContent/lesson/practices/selectText.ejs");
          }
        } else if (practice.option_display_preference == "image" || practice.option_display_preference == "both") {
          contentHtml = template.render({
            practice: practice,
            audioExtension: audioExtension,
            lessonId: lessonId,
            lessonSlug: lessonSlug,
            userRole: userRole,
            savedQuestion: savedQuestion,
          }, "/learningContent/lesson/practices/selectWithImage.ejs");
        }
      }
    }
    if (activeLessonContentType == "challenges") {
      const challenge = await models.challenge.findById(activeContentId);
      contentHtml = template.render(
        {
          challenge: challenge,
          lessonId: lessonId,
        },
        "/learningContent/lesson/challenges/challenge.ejs"
      );
    }
    const data = {
      activeContentHtml: contentHtml,
      activeLessonContentType: activeLessonContentType,
    };
    return res.send(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**  --------------------- Assessment functions starts ----------------------- */
/**
 * assignedHomeworkContent.
 */
async function assignedHomeworkContent(
  req,
  res,
  homeworkId,
  homeworkType,
  lessonSlug = ""
) {
  const user_detail = res.locals.loggedUserInfo;
  let matchPracticeIds = "";
  let matchChallengesIds = "";
  let matchLessonIds = "";
  let lessonId = "";
  let practice_id = "";
  let challenge_id = "";
  let obj = {};
  let applyDuration = "";
  if (homeworkType != "") {
    obj["_id"] = homeworkId;
    if (lessonSlug != "") {
      lessonData = await LessonVersions.find({ slug: lessonSlug });
      lessonId = lessonData[0].id;
    }

    let assessmentData = await Assessment.find({ _id: homeworkId });
    for (lessons of assessmentData[0].content) {
      for (lesson of lessons.lessons) {
        if (lessonId != "" && lesson.lesson_id.toString() == lessonId) {
          practice_id = lesson.practice_ids;
          challenge_id = lesson.challenges_ids;
          break;
        }
      }
    }
    if (homeworkType == "practices") {
      let practice_ids = [];
      for (pid of practice_id) {
        practice_ids.push(pid.toString());
      }
      matchPracticeIds = { _id: practice_ids };
    }
    if (homeworkType == "challenges") {
      let challenge_ids = [];
     
      for (cid of challenge_id) {
        AttemptedAssessmentData = await AttemptedAssessment.find({
          assessment_id: mysqlOrm.Types.ObjectId(homeworkId),
          student_id: mysqlOrm.Types.ObjectId(user_detail._id),
          challenge_id: cid,
        });
        if (AttemptedAssessmentData.length == 0) {
          challenge_ids.push(cid.toString());
        }
      }
      // console.log(challenge_id,"challenge_id");
      matchChallengesIds = { _id: challenge_ids };
    }

    applyDuration = assessmentData[0].apply_duration;
  }
  return [matchPracticeIds, matchChallengesIds, applyDuration, lessonId];
}

/**
 * assessment task count.
 * @param {*} assessment_id
 * @param {*} student_id
 * @returns
 */
async function assessmentTaskCount(assessment_id, student_id) {
  let objectAssessmentID = mysqlOrm.Types.ObjectId(assessment_id);
  let objectStudentID = mysqlOrm.Types.ObjectId(student_id);

  AssessmentData = await Assessment.findById(assessment_id);
  AttemptedAssessmentData = await AttemptedAssessment.find({
    assessment_id: objectAssessmentID,
    student_id: objectStudentID,
  });
  let totalCount = 0;
  for (learningContent of AssessmentData.content) {
    for (lesson of learningContent.lessons) {
      let practiceCount = 0;
      if (lesson.practice_ids.length > 0) {
        practiceCount = 1;
      }
      let challengeCount = lesson.challenges_ids.length;
      totalCount = parseInt(totalCount) + parseInt(practiceCount) + parseInt(challengeCount);
    }
  }
  let status = "Processing";

  if (AttemptedAssessmentData.length == totalCount) {
    status = "Completed";
  }
  return status;
}

/**
 * assigned lessons of program.
 * @param {*} assessment_id
 * @param {*} student_id
 * @returns
 */
async function assignedLessonsOfProgram(req, res, contentSlug) {
  let assignedPrograms = await Program.find({}).sort({ created_at: -1 });
  const assignedLessonIds = new Set();
  for (const program of assignedPrograms) {
    for (const myContent of program.ex_content) {
      assignedLessonIds.add(myContent.lesson_id);
    }
  }

  return Array.from(assignedLessonIds);
}
