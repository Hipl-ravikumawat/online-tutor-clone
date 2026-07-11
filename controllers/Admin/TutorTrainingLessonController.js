const mysqlOrm = require('mysql-orm');
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const template = require("../../config/template");
const globalHelper = require("../../_helper/GlobalHelper");
const path = require("path");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const TutorTrainingLesson = require("../../models/TutorTrainingLesson");
const TutorTrainingSlide = require("../../models/TutorTrainingSlide");
const TutorTrainingPractice = require("../../models/TutorTrainingPractice");
const TutorAttemptedAssessments = require("../../models/TutorAttemptedAssessments");
const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");

const TutorTrainingVersionContent = require("../../models/TutorTrainingVersionContent");
const TutorTrainingVersionLesson = require("../../models/TutorTrainingVersionLesson");
const TutorTrainingVersionPractice = require("../../models/TutorTrainingVersionPractice");
const TutorTrainingVersionSlide = require("../../models/TutorTrainingVersionSlide");

module.exports = {
    index,
    listing,
    store,
    update,
    destroy,
    updateLessonPosition,
    duplicateLesson,
    viewSingle,
    contentSlider,
};
  
/**
 * create lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
    try {
      let totalLessons = 0;
      const user_detail = res.locals.loggedUserInfo;
      const contentSlug = req.originalUrl.split("/")[2];
      let tutorTrainingContent = await TutorTrainingContent.findOne({ slug: contentSlug },"_id title slug lesson_ids").populate({
        path: "lesson_ids",
        model: "tutor_training_lessons",
        select: "_id",
        options: { sort: { position: 1, created_at: 1 } },
      });

      totalLessons = tutorTrainingContent.lesson_ids !== null ? tutorTrainingContent.lesson_ids.length : 0;
      
      const allTutorTrainingContents = await TutorTrainingContent.find({status: 1}, "_id title")
      .collation({ locale: "en", strength: 2 }) // Case-insensitive sorting
      .sort({ title: 1 });

      return res.render("../views/admin/tutorTraining/lessons/index", {
        tutorTrainingContent: tutorTrainingContent,
        totalLessons: totalLessons,
        loggedUserRole: user_detail.role,
        allLearningContents: allTutorTrainingContents,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
}

/**
 * list of lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function listing(req, res) {
    try {
      const user_detail = res.locals.loggedUserInfo;
      let contentSlug = req.body.contentSlug;
      let loggedUserRole = user_detail.role;
      let programId = req.body.program_id;
      let programType = req.body.programType;
      let html = "";
      let lessonData = null;

      const searchStr = req.body.searchStr;
      if (searchStr) {
        matchLessonName = { title: new RegExp(searchStr, "i") };
        lessonData = await TutorTrainingContent.find(
          { slug: contentSlug },
          { lesson_ids: 1 }
        ).populate({
          path: "lesson_ids",
          model: "tutor_training_lessons",
          match: matchLessonName,
          options: { sort: { position: 1 } },
          populate: [
            {
              path: "slide_ids",
              model: "tutor_training_slides",
              select: "_id",
            },
            {
              path: "practice_ids",
              model: "tutor_training_practices",
              select: "_id",
            },
          ],
        });
      } else {
        lessonData = await TutorTrainingContent.find(
          { slug: contentSlug },
          { lesson_ids: 1 }
        ).populate({
          path: "lesson_ids",
          model: "tutor_training_lessons",
          options: { sort: { position: 1 } },
          populate: [
            {
              path: "slide_ids",
              model: "tutor_training_slides",
              select: "_id",
            },
            {
              path: "practice_ids",
              model: "tutor_training_practices",
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
          html += template.render({
              lesson,
              totalSlides,
              totalPractices,
              contentSlug,
              programId,
              programType,
              loggedUserRole,
              count: i + 1, // Use index directly for counting
            },"/tutorTrainingContent/lesson/lessonRow.ejs");
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
    const tutorTrainingContent = await TutorTrainingContent.findOne(
      { slug: contentSlug },
      "lesson_ids"
    ).populate("lesson_ids");

    if (!tutorTrainingContent) {
      return res.status(500).json({
        success: false,
        message: "Training content not found.",
      });
    }

    const existingLessons = tutorTrainingContent.lesson_ids;
    let newLesson;
    if (existingLessons.length === 0) {
      req.body.position = 1;
      newLesson = await TutorTrainingLesson.create(req.body);
    } else {
      const maxPosition = existingLessons.reduce((a, b) =>
        a.position > b.position ? a : b
      ).position;
      req.body.position = maxPosition + 1;
      newLesson = await TutorTrainingLesson.create(req.body);
    }

    await TutorTrainingContent.findOneAndUpdate(
      { slug: contentSlug },
      { $push: { lesson_ids: newLesson._id } }
    );

    const successMsg = "The lesson is created successfully!";
    req.flash("success", successMsg);
    return res.status(200).json({ success: true, message: successMsg });
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
    await TutorTrainingLesson.findByIdAndUpdate(contentSlug, {
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

    const isTrainingAssessmentExists = await TutorTrainingAssessment.find({
      "content.lessons": {
        $elemMatch: {
              lesson_id: lessonId,
        },
      },
    })
      .limit(1)
      .count(); 
   
    if (isTrainingAssessmentExists) {
      return res.status(400).json({
        success: false,
        redirectUrl: "page-reload",
        message:
          "This lesson is currently enrolled in a training assessment and cannot be deleted at this time.",
      });
    }  

    const lesson = await TutorTrainingLesson.findById(lessonId)
    .populate("slide_ids")
    .populate("practice_ids");

    if (!lesson) {
      return res.status(404).json({
        success: false,
        redirectUrl: "page-reload",
        message: "The requested lesson does not exist."
      });
    }

    if (lesson.slide_ids.length > 0) {
      for (slide of lesson.slide_ids) {
        if (slide.video !== "") {
          const filePath = `./assets/TutorTrainingContent/${slide.content_directory}/${slide.video}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The file not found, so not deleted.");
            }
          });
        }

        if (slide.attachments[0] !== "") {
          const filePath = `./assets/TutorTrainingContent/${slide.content_directory}/${slide.attachments[0]}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The file not found, so not deleted.");
            }
          });
        }
        await TutorTrainingSlide.findByIdAndDelete(slide._id);
      }
    }

    if (lesson.practice_ids.length > 0) {
      for (practice of lesson.practice_ids) {
        if (practice.question_image !== "") {
          const filePath = `./assets/TutorTrainingContent/${practice.content_directory}/${practice.question_image}`;
          fs.exists(filePath, function (exists) {
            if (exists) {
              fs.unlinkSync(filePath);
            } else {
              console.log("The question image is not found, so not deleted.");
            }
          });
        }

        if (practice.question_audio !== "") {
          const filePath = `./assets/TutorTrainingContent/${practice.content_directory}/${practice.question_audio}`;
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
              const filePath = `./assets/TutorTrainingContent/${practice.content_directory}/${option.option_image}`;
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

        await TutorTrainingPractice.findByIdAndDelete(practice._id);
      }
    }

    await TutorTrainingLesson.findByIdAndDelete(lessonId);
    await TutorTrainingContent.findOneAndUpdate(
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
 * update lesson position.
 */
async function updateLessonPosition(req, res) {
  try {
    let positions = req.body.positions;

    if (positions.length > 0) {
      for (position of positions) {
        await TutorTrainingLesson.findByIdAndUpdate(position[0], {
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
      const lessonContent = await TutorTrainingLesson.findById(lessonId);
      if (lessonContent != "") {
        let slides = lessonContent.slide_ids;
        let practices = lessonContent.practice_ids;

        const oldLearningContent = await TutorTrainingContent.find({
          lesson_ids: { $in: mysqlOrm.Types.ObjectId(lessonId) },
        });

        const newLearningContent = await TutorTrainingContent.findById(
          learningContentId
        );

        let oldLearningContentId = learningContentId;
        let oldContentDirectory  = oldLearningContent[0].content_directory;
        let newLearningContentId = oldLearningContent[0].id;
        let newContentDirectory  = "";

        if (oldLearningContentId == newLearningContentId) {
          newContentDirectory = oldLearningContent[0].content_directory;
        } else {
          newContentDirectory = newLearningContent.content_directory;
        }

        slides.map((slides) => slides.toString());
        practices.map((practices) => practices.toString());
        
        let slidesData = await TutorTrainingSlide.find({ _id: { $in: slides } });
        let practicesData = await TutorTrainingPractice.find({ _id: { $in: practices } });

        const copyLesson = {
          title: lessonContent.title,
          position: lessonContent.position,
        };

        const clonedLesson = await TutorTrainingLesson.create(copyLesson);
        // copy slides
        for (slide of slidesData) {
          let newAttachment = (video = "");
          if (slide.attachments[0] != "" && slide.attachments[0] != null && slide.attachments[0] != undefined) {
            let attachment = slide.attachments[0].split("-");
            attachment[0] = Date.now();
            newAttachment = attachment.join("-");

            fs.copyFile(
              `./assets/TutorTrainingContent/${oldContentDirectory}/${slide.attachments[0]}`,
              `./assets/TutorTrainingContent/${newContentDirectory}/${newAttachment}`,
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
              `./assets/TutorTrainingContent/${oldContentDirectory}/${slide.video}`,
              `./assets/TutorTrainingContent/${newContentDirectory}/${video}`,
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
            content_directory: newContentDirectory,
            position: slide.position,
          };

          duplicateSlides = await TutorTrainingSlide.create(Obj);
          await TutorTrainingLesson.findByIdAndUpdate(clonedLesson.id, {
            $push: { slide_ids: duplicateSlides._id },
          });
        }

        // copy practice
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
                  `./assets/TutorTrainingContent/${oldContentDirectory}/${option.option_image}`,
                  `./assets/TutorTrainingContent/${newContentDirectory}/${option_image}`,
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
              `./assets/TutorTrainingContent/${oldContentDirectory}/${practice.question_image}`,
              `./assets/TutorTrainingContent/${newContentDirectory}/${question_image}`,
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
              `./assets/TutorTrainingContent/${oldContentDirectory}/${practice.question_audio}`,
              `./assets/TutorTrainingContent/${newContentDirectory}/${question_audio}`,
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
          Obj["content_directory"] = newContentDirectory;
          Obj["question_image"] = question_image;
          Obj["question_audio"] = question_audio;
          Obj["position"] = practice.position;
          Obj["option_display_preference"] = practice.option_display_preference;
          Obj["challenges_listing"] = practice.challenges_listing;

          if (practice.question_type != "text") {
            Obj["options"] = optionObject;
          }

          duplicatePractice = await TutorTrainingPractice.create(Obj);
          await TutorTrainingLesson.findByIdAndUpdate(clonedLesson.id, {
            $push: { practice_ids: duplicatePractice._id },
          });
        }

        let UpdatedLearningContent = await TutorTrainingContent.findOneAndUpdate(
          { _id: learningContentId },
          { $push: { lesson_ids: clonedLesson._id } }
        );

        res.status(200).json({
          success: true,
          message: "The " + lessonContent.title + " is copied successfully into the " + UpdatedLearningContent.title +
            "."
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

/**
 * view a single lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function viewSingle(req, res) {
  try {
    const taskType = req.params.type || "";
    global.sidebarType = "tutortraining";

    let contentSlug = req.originalUrl.split("/")[2];
    
    let tutorTrainingContentDetail = null;
    if (taskType === "assessment") {
      tutorTrainingContentDetail = await TutorTrainingVersionContent.find({slug: contentSlug})
        .populate({
          path: "lesson_ids",
          model: "tutor_training_version_lessons",
          match: { slug: `${req.params.lessonSlug}` },
          options: { sort: { position: 1, created_at: 1 } },
          populate: [{
              path: "slide_ids",
              model: "tutor_training_version_slides",
              options: { sort: { position: 1, created_at: 1 } },
              select: { _id: 1, title: 1,slug:1,duration: 1,content_directory:1 },
            },{
              path: "practice_ids",
              model: "tutor_training_version_practices",
              options: { sort: { position: 1, created_at: 1 } },
              select: { _id: 1, question_type: 1,question_title:1,question_slug: 1, question_duration: 1,content_directory:1 },
            },
          ],
        }).sort({ _id: -1 });
    } else {
      tutorTrainingContentDetail = await TutorTrainingContent.find({slug: contentSlug})
      .populate({
        path: "lesson_ids",
        model: "tutor_training_lessons",
        match: { slug: `${req.params.lessonSlug}` },
        options: { sort: { position: 1, created_at: 1 } },
        populate: [{
            path: "slide_ids",
            model: "tutor_training_slides",
            options: { sort: { position: 1, created_at: 1 } },
            select: { _id: 1, title: 1,slug:1,duration: 1,content_directory:1 },
          },{
            path: "practice_ids",
            model: "tutor_training_practices",
            options: { sort: { position: 1, created_at: 1 } },
            select: { _id: 1, question_type: 1,question_title:1,question_slug: 1, question_duration: 1,content_directory:1 },
          },
        ],
      }).sort({ _id: -1 });
    }
    
    if (tutorTrainingContentDetail[0]) {
      
      const isTrainingAssessmentExists = await TutorTrainingAssessment.find({
        content: {
          $elemMatch: {
            lessons: { 
              $elemMatch: {lesson_id: tutorTrainingContentDetail[0].lesson_ids[0]._id,} 
            },},
          },
      })
        .limit(1)
        .count(); 
        
      const singleLesson = tutorTrainingContentDetail[0].lesson_ids[0];
      const tutorTrainingContentInfo = {
        id: tutorTrainingContentDetail[0]._id,
        slug: tutorTrainingContentDetail[0].slug,
        title: tutorTrainingContentDetail[0].title,
        grade_id: tutorTrainingContentDetail[0].grade_id,
        topic_id: tutorTrainingContentDetail[0].topic_id,
        sub_topic_id: tutorTrainingContentDetail[0].sub_topic_id,
        thumbnail: tutorTrainingContentDetail[0].thumbnail,
        content_directory: tutorTrainingContentDetail[0].content_directory,
        short_description: tutorTrainingContentDetail[0].short_description,
        isLessonAssign: isTrainingAssessmentExists,
      };


      let durations = [];
      let slideDuration = [];
      let practiceDuration = [];
      let i = (totalSlides = totalPractices = totalChallenges = 0);
      totalSlides += singleLesson.slide_ids.length;
      totalPractices += singleLesson.practice_ids.length;

      for (slide of singleLesson.slide_ids) {
        if (slide && slide.duration != "" && slide.duration != null) {
          slideDuration.push(slide.duration);
        }
        i++;
      }

      for (practice of singleLesson.practice_ids) {
        if (
          practice &&
          practice.question_duration != "" &&
          practice.question_duration != null
        ) {
          practiceDuration.push(practice.question_duration);
        }
        i++;
      }

      let totalSlideDuration = globalHelper.calculateDuration(slideDuration);
      let totalPracticeDuration = globalHelper.calculateDuration(practiceDuration);
      durations.push(totalSlideDuration, totalPracticeDuration);
      let totalDuration = globalHelper.calculateDuration(durations);

      // store all type of duration & counts in object
      const contentStatics = {
        slide_duration: totalSlideDuration,
        practice_duration: totalPracticeDuration,
        total_duration: totalDuration,
        total_slides: totalSlides,
        total_practices: totalPractices,
        total_challenges: totalChallenges,
        assessment_type:'',
        is_read_slides: [],
        is_assessment : false,
        assessment_id:'',
      };

      global.lessonContentStatics = contentStatics;
      global.sidebarType = "trainingContent";
      return res.render("../views/admin/tutorTraining/lessons/view",{
        lesson: singleLesson,
        learningContent: tutorTrainingContentInfo,
        task_type: taskType
      });
    }else{
      return res.status(500).json({
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
    const userId = user_detail._id.toString();
    const isAssessment = req.body.is_assessment;
    const assessmentId = req.body.assessment_id;
    let savedPracticeQuestion = JSON.parse(req.body.saved_practice_questions);

    const typeUrl = req.body.type_url;
    const baseUrl = req.headers.host.startsWith("localhost")
      ? req.protocol + "://" + req.headers.host
      : "https://" + req.headers.host;

    let contentHtml = "";
    if (activeLessonContentType == "slides") {
      let slide = null;
      if(isAssessment === 'true'){
        slide = await TutorTrainingVersionSlide.findById(activeContentId);
      }else{
        slide = await TutorTrainingSlide.findById(activeContentId);
      }
      let videoExtension = (pdfExtension = "");

      if (slide.attachments[0] != "" && slide.attachments[0] !== undefined && slide.attachments[0] !== null) {
        pdfExtension = path.extname(slide.attachments[0]); // .pdf
      }
      if (slide.video != "" && slide.video !== undefined && slide.video !== null) {
        videoExtension = path.extname(slide.video); // .pdf
      }
      
      contentHtml = template.render(
        {
          slide: slide,
          lessonId: lessonId,
          lessonSlug:lessonSlug,
          pdfExtension: pdfExtension,
          videoExtension: videoExtension,
          isAssessment: isAssessment,
          baseUrl,
        },
        "/tutorTrainingContent/lesson/slides/slides.ejs"
      );
    }
    
    if (activeLessonContentType == "practices") {

      // check is assessment already submitted
      if(isAssessment === 'true'){
        const isSubmitted = await TutorAttemptedAssessments.find({
          assessment_id: mysqlOrm.Types.ObjectId(assessmentId),
          tutor_id: mysqlOrm.Types.ObjectId(userId),
          lesson_id: mysqlOrm.Types.ObjectId(lessonId),
          assessment_type:'practices',
        });
        
        if(typeUrl == 1){
          savedPracticeQuestion = isSubmitted[0].answers;
        } else if(isSubmitted.length > 0 && typeUrl != 1){
          const data = {
            isSubmitted: true,
          };
          return res.send(data);
        }
      }

      let practice = null;
      if(isAssessment === 'true'){
        practice = await TutorTrainingVersionPractice.findById(activeContentId);
      }else{
        practice = await TutorTrainingPractice.findById(activeContentId);
      }
      
        let audioExtension = "";
        let attachmentName = "";
        let studentId = user_detail._id.toString();

        let savedQuestion = [];
        if(savedPracticeQuestion.length>0){
          filterData = savedPracticeQuestion.filter(item => {
            return item.questionId === activeContentId;
          });
          savedQuestion = filterData[0]?.submittedAnswer;
          attachment = filterData[0]?.attachment;
          attachmentName = attachment ? attachment :'';
        }

        if (practice.question_audio != "" && practice.question_audio != null) {
          audioExtension = path.extname(practice.question_audio);
        }
        if (practice.question_type == "text") {
          contentHtml = template.render({
              practice: practice,
              audioExtension: audioExtension,
              lessonSlug:lessonSlug,
              lessonId: lessonId,
              userRole: userRole,
              savedQuestion:savedQuestion,
              attachmentName:(attachmentName !='') ? '/TutorTrainingAssessment/'+attachmentName :'',
            },"/tutorTrainingContent/lesson/practices/typeText.ejs");
        } else if (practice.question_type == "drag_and_drop") {
          let shuffle_options = globalHelper.shuffle(practice.options);
          contentHtml = template.render({
              practice: practice,
              shuffle_options: shuffle_options,
              lessonSlug:lessonSlug,
              lessonId: lessonId,
              userRole: userRole,
              savedQuestion:savedQuestion,
            },"tutorTrainingContent/lesson/practices/dragDrop.ejs");
        } else {
          if (practice.option_display_preference == "text") {
            if (practice.question_image != "") {
              contentHtml += template.render({
                  practice: practice,
                  audioExtension: audioExtension,
                  lessonId: lessonId,
                  lessonSlug:lessonSlug,
                  userRole: userRole,
                  savedQuestion:savedQuestion,
                  isAssessment:isAssessment,
                },"/tutorTrainingContent/lesson/practices/selectImage.ejs");
            } else {
              contentHtml = template.render({
                  practice: practice,
                  audioExtension: audioExtension,
                  lessonId: lessonId,
                  lessonSlug:lessonSlug,
                  userRole: userRole,
                  savedQuestion:savedQuestion,
                },"/tutorTrainingContent/lesson/practices/selectText.ejs");
            }
          } else if (practice.option_display_preference == "image" || practice.option_display_preference == "both") {
            contentHtml = template.render({
              practice: practice,
              audioExtension: audioExtension,
              lessonId: lessonId,
              lessonSlug:lessonSlug,
              userRole: userRole,
              savedQuestion:savedQuestion,
            },"/tutorTrainingContent/lesson/practices/selectWithImage.ejs");
          }
        }
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