const mysqlOrm = require('mysql-orm');
const moment = require("moment");
const template = require("../../config/template");
const Topic = require("../../models/Topic");
const User = require('../../models/User');
const Grade = require("../../models/Grade");
const path = require("path");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const TutorTrainingLesson = require("../../models/TutorTrainingLesson");
const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");
const TutorTrainingPractice = require("../../models/TutorTrainingPractice");
const TutorTrainingSlide = require("../../models/TutorTrainingSlide");
const TutorAssessments = require("../../models/TutorAssessments");
const TutorAttemptedAssessments = require("../../models/TutorAttemptedAssessments");
const globalHelper = require("../../_helper/GlobalHelper");

const TutorTrainingVersionContent = require("../../models/TutorTrainingVersionContent");
const TutorTrainingVersionPractice = require("../../models/TutorTrainingVersionPractice");
const TutorTrainingVersionSlide = require("../../models/TutorTrainingVersionSlide");

module.exports = {
  assessmentDetailedReport,
  detailedReportDataTable,
  lessonForAdminComment,
  viewTextTypeAttemptedAssessment,
  addCommentForTextAssessment,
  assessmentResultOfTutor,
  attemptedAssessmentSummary,
  attemptedAssessmentContentSlider
};

/**
 * assessment detailed report.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function assessmentDetailedReport(req, res) {
    try {
      const assessment = await TutorTrainingAssessment.findOne({ slug: req.params.assessmentSlug });
      const tutorAssessments = await TutorAssessments.find({assessment_id: assessment._id},{status:1,final_score:1});

      const completedObjects = tutorAssessments.filter(item => item.status === 'Completed');
      const processingObjects = tutorAssessments.filter(item => item.status === 'Processing');
      const sumFinalScore = completedObjects.reduce((total, item) => total + item.final_score, 0);
      const totalAssessment = tutorAssessments.length;
      const completedAssessment = completedObjects.length;
      const processingAssessment = processingObjects.length;
      const notCompleted = totalAssessment - completedAssessment - processingAssessment;

      let overallScore = (sumFinalScore/completedAssessment);
      if (Number.isInteger(overallScore) == false) {
        overallScore = overallScore.toFixed(2);
      }
      if(isNaN(overallScore)){
        overallScore = 0;
      }

      const countStatistics = {
        totalAssessment:totalAssessment ?? 0,
        completedAssessment:completedAssessment ?? 0,
        notCompleted:notCompleted ?? 0,
        overallScore:overallScore ?? 0,
      }

      const tutorIds = assessment.tutor_ids.map(tutor_ids => tutor_ids._id.toString());
      const tutors = await User.find({"role": 2, "status": 1, "isDeleted": false, "_id": { $in: tutorIds }}).sort({ 'role': 1, '_id': -1 });
      return res.render("../views/admin/tutorTrainingAssessment/report/view-detailed-report",{ 
      assessmentDetail:assessment,
      countStatistics:countStatistics,
      moment: res.locals.moment,
      tutors:tutors
    });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
}

/**
 * assessment detailed report dataTable.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function detailedReportDataTable(req, res) {
    try {
        const { assessment_id, tutor_id, status, percentage } = req.body;
        const searchStr = {}; 
        const obj = { assessment_id: mysqlOrm.Types.ObjectId(assessment_id) }; // Build filter object
        if (percentage) {
          const percentageData = percentage.split('-');
          obj["final_score"] = { $gte: percentageData[0], $lte: percentageData[1] };
        }
      
        if (tutor_id) {
          obj["tutor_id"] = mysqlOrm.Types.ObjectId(tutor_id);
        }
      
        if (status) {
          obj["status"] = status;
        }

        // ... data retrieval and response logic ...
        const recordsTotal = await TutorAssessments.count(obj);
        const recordsFiltered = await TutorAssessments.count({ $and: [obj, searchStr] });
        const results = await TutorAssessments.find({ $and: [obj, searchStr] },"_id name tutor_ids content final_score status updated_at",{ skip: Number(req.body.start), limit: Number(req.body.length) })
        .populate("tutor_id")
        .populate("assessment_id");

        const data = {
            draw: req.body.draw,
            recordsFiltered,
            recordsTotal,
            data: results,
        };

        res.send(JSON.stringify(data));
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
      }
}

/**
 * lesson for admin comment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function lessonForAdminComment(req, res) {
  try {
    let assessmentId = mysqlOrm.Types.ObjectId(req.body.assessment_id);
    let tutorId = mysqlOrm.Types.ObjectId(req.body.tutor_id);

    let results = await TutorAttemptedAssessments.find({ assessment_id: assessmentId, tutor_id: tutorId,}).populate({
      path: 'lesson_id',
      model: 'tutor_training_version_lessons',
      select:'_id slug title'
    });
    const Object = [];
    for (result of results) {
      for (answer of result.answers) {
        if ((answer.type == "text")) {
          Object.push({
            lesson_id: result.lesson_id.id,
            title: result.lesson_id.title,
            assessment_id: req.body.assessment_id,
            tutor_id: req.body.tutor_id,
          });
        }
      }
    }
    return res.send(Object);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * view tutor's submitted answer for text type practice assessment.
 * @param {*} req
 * @param {*} res
 */
async function viewTextTypeAttemptedAssessment(req, res) {
  try {
    let tutorId = mysqlOrm.Types.ObjectId(req.params.tutorId);
    let lessonId = mysqlOrm.Types.ObjectId(req.params.lessonId);
    let assessmentId = mysqlOrm.Types.ObjectId(req.params.assessmentId);
    tutorAttemptedAssessments = await TutorAttemptedAssessments.find({
      assessment_id: assessmentId,
      lesson_id: lessonId,
      tutor_id: tutorId,
    }).populate({
      path: 'lesson_id',
      model: 'tutor_training_version_lessons',
    });
    let answerData = [];
    let filterPracticeData = tutorAttemptedAssessments.filter(item => item.assessment_type === 'practices');
    let filteredTextType = []
    let count = 0;
    if(filterPracticeData.length > 0){
      for (data of filterPracticeData[0].answers) {
        if (data.type == "text") {
          let practicesData = await TutorTrainingVersionPractice.findById(data.questionId);
          let keywords = await matchTextTypeKeyword(data.submittedAnswer,practicesData.options);

          data.question_title = practicesData.question_title;
          data.question = practicesData.question;
          data.question_explanation = practicesData.question_explanation;
          data.keyword = keywords;
        }
      }
      let objects = filterPracticeData[0].answers;
      filteredTextType = objects.filter(item => item.type === 'text');
    }
    return res.render("../views/admin/tutorTrainingAssessment/report/view-text-type-attempted-assessment", {
      data: filterPracticeData[0],
      count:filteredTextType.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * add a comment for pass/fail status for a text type practice assessment.
 * @param {*} req
 * @param {*} res
 */
async function addCommentForTextAssessment(req, res) {
  try {
    let tutorId = mysqlOrm.Types.ObjectId(req.body.tutor_id);
    let lessonId = mysqlOrm.Types.ObjectId(req.body.lesson_id);
    let assessmentId = mysqlOrm.Types.ObjectId(req.body.assessment_id);
    const attemptedAssessment = await TutorAttemptedAssessments.find({
      assessment_id: assessmentId,
      lesson_id: lessonId,
      tutor_id: tutorId,
      assessment_type:'practices',
    }).populate({
      path: 'lesson_id',
      model: 'tutor_training_version_lessons',
    });
    if (attemptedAssessment.length > 0 ) {
      let attemptedAssessmentId = attemptedAssessment[0].id;
      const answers = attemptedAssessment[0].answers;

      for (answer of answers) {
        let submittedAnswer = req.body.answers;
        for (data of submittedAnswer) {
          if (answer.questionId == data.questionId) {
            if (data.isChecked == "true") {
              answer.isCorrect = true;
            }else if(data.isChecked == "false"){
              answer.isCorrect = false;
            } else {
              answer.isCorrect = '';
            }
            if(answer.type === 'text'){
              answer.comment = data.comment;
            }else{
              answer.comment = '';
            }
          }
        }
      }
      let attemptedAssessmentUpdated = await TutorAttemptedAssessments.findByIdAndUpdate(attemptedAssessmentId, { 
        answers: answers,
        status:'Completed'
      });
      await manageTutorAssessmentStatus(req.body.assessment_id,req.body.tutor_id );
    }
    let assessmentData = await TutorTrainingAssessment.findById(req.body.assessment_id);
    let assessmentSlug = assessmentData.slug;
    
    req.flash("success", "The comment is added successfully!");
    return res.send({
      success: true,
      message: "The comment is added successfully!",
      redirectUrl: `/tutor-training-assessments/detailed-report/${assessmentSlug}`,
    });

  }catch(error){
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/*
 * manage tutor assessment status.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function manageTutorAssessmentStatus(assessmentId,tutorId){
  try{
      let assessmentContent = await TutorTrainingAssessment.findById(assessmentId);
      let allAssignedLesson = assessmentContent.content;
      let counter = 0;
      let totalSlide = 0 ;
      let totalReadSlide = 0 ;
      let totalPractice = 0 ;
      let totalCorrectPractice = 0 ;
      for(let data of allAssignedLesson){
        let lessons = data.lessons;
        for(let lesson of lessons){
          if(lesson.slide_ids !== null && lesson.slide_ids.length > 0){
            totalSlide = parseInt(totalSlide) + parseInt(lesson.slide_ids.length);
            counter++;
          }
  
          if(lesson.practice_ids !== null && lesson.practice_ids.length > 0){
            totalPractice = parseInt(totalPractice) + parseInt(lesson.practice_ids.length);
            counter++;
          }
        }
      }
      let attemptedAssessments = await TutorAttemptedAssessments.find({
        'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),
        'tutor_id': mysqlOrm.Types.ObjectId(tutorId),
      });
      let slideScore = {total:0,read:0,percentage:0}
      let practiceScore = {total:0,correct:0,percentage:0}
      for(let data of attemptedAssessments){
        let answers = data.answers;

        if(data.assessment_type === 'slides'){
          const readCount = answers.filter(item => item.isread === true).length;
          totalReadSlide = parseInt(totalReadSlide) + parseInt(readCount);
        }else if(data.assessment_type === 'practices'){
          const isCorrectCount = answers.filter(item => item.isCorrect === true).length;
          totalCorrectPractice = parseInt(totalCorrectPractice) + parseInt(isCorrectCount);
        }
      }
      slideScore.total = totalSlide;
      slideScore.read = totalReadSlide;
  
      practiceScore.total = totalPractice;
      practiceScore.correct = totalCorrectPractice;

      let slidePercentage = (parseInt(slideScore.read)/parseInt(slideScore.total))*100;
      let practicePercentage = (parseInt(practiceScore.correct)/parseInt(practiceScore.total))*100;
      if(Number.isInteger(slidePercentage) === false){
        slidePercentage = slidePercentage.toFixed(2);
      }
      if(Number.isInteger(practicePercentage) === false){
        practicePercentage = practicePercentage.toFixed(2);
      }
      if (isNaN(slidePercentage)) {
        slidePercentage  = 0;
      }
      if (isNaN(practicePercentage)) {
        practicePercentage  = 0;
      }

      slideScore.percentage = slidePercentage;
      practiceScore.percentage = practicePercentage;
      let overallScore = (parseFloat(slidePercentage)+parseFloat(practicePercentage))/2;
      if(Number.isInteger(overallScore) === false){
        overallScore = overallScore.toFixed(2);
      }
      let completedArray = attemptedAssessments.filter(item => item.status === 'Completed').map(item => item.status);

      let status = 'Processing';
      if(counter == completedArray.length ){
        status = 'Completed';
      }
      let updateObject = {
        status:status,
        slide_score:slideScore,
        practice_score:practiceScore,
        final_score:overallScore,
      }
      let updatedData = await TutorAssessments.updateOne({
        'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),
        'tutor_id': mysqlOrm.Types.ObjectId(tutorId),
      },updateObject);
      if(updatedData){
        let assignAssessments = await TutorAssessments.find({'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),});
        let tutorStatusArray = assignAssessments.map(item => item.status);
        let isNotAttempted = tutorStatusArray.every(value => value === "N/A");
        let isCompleted = tutorStatusArray.every(value => value === "Completed");
        let status = 'Processing';
        if(isNotAttempted){
          status = 'N/A';
        }else if(isCompleted){
          status = 'Completed';
        }
        let updatedAssessmentStatus = await TutorTrainingAssessment.findByIdAndUpdate(assessmentId,{status:status});
        return updatedAssessmentStatus; 
      }
  }catch(error){
    return error
  }
}

// Function to build sort object from DataTables request
function buildSortObject(order) {
    const sortObj = {};
    sortObj[order[0].column] = order[0].dir === 'asc' ? 1 : -1;
    return sortObj;
}


/**
 * training assessment result of a tutor.
 * @param {*} req
 * @param {*} res
 */
async function assessmentResultOfTutor(req, res){
  try {
    const {tutorId, assessmentId} = req.params; // Convert to numbers
    const tutorAssessmentData = await TutorAssessments.find({assessment_id: assessmentId, tutor_id: tutorId}, 'final_score tutor_id assessment_id practice_score slide_score created_at updated_at')
    .populate({
      path: 'assessment_id',
      model: 'tutor_training_assessments',
      select:'_id name'
    })
    .populate({
      path: 'tutor_id',
      model: 'users',
      select:'first_name last_name'
    }).sort({ updated_at: -1 });

    let tutorName = tutorAssessmentData[0].tutor_id.first_name+" "+tutorAssessmentData[0].tutor_id.last_name;
    let assessmentName = tutorAssessmentData[0].assessment_id.name;
    const originalDate = tutorAssessmentData[0].updated_at;
    
    const finalResult ={
      percentage  : tutorAssessmentData[0].final_score,
      totalSlides: tutorAssessmentData[0].slide_score[0].total ?? 0,
      totalSlidesRead: tutorAssessmentData[0].slide_score[0].read ?? 0,
      totalPractices : tutorAssessmentData[0].practice_score[0].total ?? 0,
      correctPractices : tutorAssessmentData[0].practice_score[0].correct ?? 0,
    }

    return res.render("../views/admin/tutorTrainingAssessment/report/assessment-result-of-tutor", {
      assessmentId:assessmentId, 
      assessmentName:assessmentName,
      tutorId:tutorId, 
      tutorName:tutorName,
      assessmentCompletionDate:originalDate,
      moment: res.locals.moment,
      finalResult : finalResult
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * assessment summary of a tutor.
 * @param {*} req
 * @param {*} res
 */
async function attemptedAssessmentSummary(req, res){
  try{
    global.sidebarType = "trainingAssessmentReport";
    const trainingAssessmentId = mysqlOrm.Types.ObjectId(req.params.assessmentId);
    const tutorId = mysqlOrm.Types.ObjectId(req.params.tutorId);
    let slideData = [];
    let practiceData = [];
    const newData = await TutorAttemptedAssessments.find({})
    const attemptedAssessments = await TutorAttemptedAssessments.find({ assessment_id: trainingAssessmentId, tutor_id: tutorId })
    .populate({
      path: 'assessment_id',
      model: 'tutor_training_assessments',
      select:'_id name tutor_id',
    })
    .populate({
      path: 'lesson_id',
      model: 'tutor_training_version_lessons',
      select:'_id slug title'
    })
    .populate({
      path: 'tutor_id',
      model: 'users',
      select:'_id first_name last_name'
    });

    const assessmentTitle = attemptedAssessments[0].assessment_id.name;
    const tutorName = attemptedAssessments[0].tutor_id.first_name+" "+attemptedAssessments[0].tutor_id.last_name;

    for(let data of attemptedAssessments){
      if(data.assessment_type === "slides"){

        let answers = data.answers;
        for(let answer of answers){
          let slide = await TutorTrainingVersionSlide.findById(answer.id);
          let lesson_id = data.lesson_id.id.toString();
          let trainingContent = await TutorTrainingVersionContent.find({ lesson_ids: { $in: [lesson_id] } }, '_id title slug').sort({ created_at: -1 });

          slideData.push({
            id: slide.id,
            title: slide.title,
            isRead: answer.isread,
            learning_content_id: trainingContent[0]._id.toString(),
            learning_content_slug: trainingContent[0].slug,
            lesson_id: lesson_id,
            lesson_slug : data.lesson_id.slug
          });
        }
      }

      if(data.assessment_type === "practices"){
        let answers = data.answers;
        for(let answer of answers){
          let practice = await TutorTrainingVersionPractice.findById(answer.questionId);
          let lesson_id = data.lesson_id.id.toString();
          let trainingContent = await TutorTrainingVersionContent.find({ lesson_ids: { $in: [lesson_id] } }, '_id title slug').sort({ created_at: -1 });

          practiceData.push({
            id:answer.questionId,
            title :  practice.question_title,
            question_type :  answer.type,
            submittedAnswer: answer.submittedAnswer,
            isCorrect: answer.isCorrect,
            attachment: answer.attachment,
            tutorComment: answer.comment ?? '',
            learning_content_id : trainingContent[0]._id.toString(),
            learning_content_slug : trainingContent[0].slug,
            lesson_id : lesson_id,
            lesson_slug : data.lesson_id.slug
          });
        }
      }
    }

    global.assessmentReportSideBarDetails= {
      assessmentId: attemptedAssessments[0].assessment_id._id.toString(),
      assessmentName: assessmentTitle,
      tutorId: attemptedAssessments[0].tutor_id._id.toString(),
      tutorName: tutorName,
      slides: slideData,
      practices: practiceData,
    };

    return res.render("../views/admin/tutorTrainingAssessment/report/attempted-assessment-summary",{ tutorName:tutorName, assessmentName:assessmentTitle});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * attempted assessment content slider.
 * @param {*} req
 * @param {*} res
 */
async function attemptedAssessmentContentSlider(req, res) {
  try {
    const user_detail = res.locals.loggedUserInfo;
    const lessonId = req.body.lesson_id;
    const lessonSlug = req.body.lesson_slug;
    const activeLessonContentType = req.body.type;
    const activeContentId = req.body.content_id;
    const userRole = user_detail.role;
    const baseUrl = req.headers.host.startsWith("localhost")
    ? req.protocol + "://" + req.headers.host
    : "https://" + req.headers.host;
    const reportFlag = true;
    let savedQuestion = []; 
    let contentHtml = "";
    
 
    if (activeLessonContentType == "slides") {
      const slide = await TutorTrainingVersionSlide.findById(activeContentId);
      let videoExtension = (pdfExtension = "");
      if (slide.attachments.length > 0 && slide.attachments[0] != "") {
        pdfExtension = path.extname(slide.attachments[0]); // .pdf
      }
      if (slide.video != "") {
        videoExtension = path.extname(slide.video); // .pdf
      }

      contentHtml = template.render(
        {
          slide: slide,
          lessonId: lessonId,
          lessonSlug:lessonSlug,
          pdfExtension: pdfExtension,
          videoExtension: videoExtension,
          reportFlag: reportFlag,
          isAssessment:'',
          baseUrl,
        },
        "/tutorTrainingContent/lesson/slides/slides.ejs"
      );
    }

    if (activeLessonContentType == "practices") {
      let practice = await TutorTrainingVersionPractice.findById(activeContentId);
        let audioExtension = "";
        let attachmentName = "";
        let isCorrectAnswer = false;
        let teacherComment = "";
        const allAttemptedPractices = assessmentReportSideBarDetails.practices;
        const matchedPractice = allAttemptedPractices.find((practice) => practice.id === activeContentId);

        if(matchedPractice){
          let { isCorrect, submittedAnswer, attachment, tutorComment } = matchedPractice;
          isCorrectAnswer = isCorrect;
          savedQuestion = submittedAnswer;
          attachmentName = attachment;
          teacherComment = tutorComment;
        }

      
        if (practice.question_audio != "" && practice.question_audio != null) {
          audioExtension = path.extname(practice.question_audio);
        }

        if (practice.question_type == "text") {
          let keywords = await matchTextTypeKeyword(matchedPractice.submittedAnswer,practice.options);
          practice.options = keywords;
          contentHtml = template.render({
              practice: practice,
              audioExtension: audioExtension,
              lessonSlug:lessonSlug,
              lessonId: lessonId,
              userRole: userRole,
              reportFlag:reportFlag,
              isCorrectAnswer:isCorrectAnswer,
              savedQuestion:savedQuestion,
              tutorComment : teacherComment,
              attachmentName:(attachmentName !='') ? '/TutorTrainingAssessment/'+attachmentName :'',
            },"/tutorTrainingContent/lesson/report_practices/typeText.ejs");
        } else if (practice.question_type == "drag_and_drop") {
          let shuffle_options = globalHelper.shuffle(practice.options);
          contentHtml = template.render({
              practice: practice,
              shuffle_options: shuffle_options,
              lessonSlug:lessonSlug,
              lessonId: lessonId,
              userRole: userRole,
              reportFlag:reportFlag,
              isCorrectAnswer:isCorrectAnswer,
              savedQuestion:savedQuestion,
            },"tutorTrainingContent/lesson/report_practices/dragDrop.ejs");
        } else {
          if (practice.option_display_preference == "text") {
            if (practice.question_image != "") {
              contentHtml += template.render({
                  practice: practice,
                  audioExtension: audioExtension,
                  lessonId: lessonId,
                  lessonSlug:lessonSlug,
                  userRole: userRole,
                  reportFlag:reportFlag,
                  isCorrectAnswer:isCorrectAnswer,
                  savedQuestion:savedQuestion,
                },"/tutorTrainingContent/lesson/report_practices/selectImage.ejs");
            } else {
              contentHtml = template.render({
                  practice: practice,
                  audioExtension: audioExtension,
                  lessonId: lessonId,
                  lessonSlug:lessonSlug,
                  userRole: userRole,
                  reportFlag:reportFlag,
                  isCorrectAnswer:isCorrectAnswer,
                  savedQuestion:savedQuestion,
                },"/tutorTrainingContent/lesson/report_practices/selectText.ejs");
            }
          } else if (practice.option_display_preference == "image" || practice.option_display_preference == "both") {
            contentHtml = template.render({
              practice: practice,
              audioExtension: audioExtension,
              lessonId: lessonId,
              lessonSlug:lessonSlug,
              userRole: userRole,
              reportFlag:reportFlag,
              isCorrectAnswer:isCorrectAnswer,
              savedQuestion:savedQuestion,
            },"/tutorTrainingContent/lesson/report_practices/selectWithImage.ejs");
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
/**
 * 
 * @param {*} description 
 * @param {*} keywords 
 * @returns 
 */
async function matchTextTypeKeyword(description, keywords){
  let submittedText = '';
  if(description.length > 0){
    if(Array.isArray(description)){
      submittedText = description.join('').toLowerCase();
     }else{
      submittedText = description.toLowerCase();
     }  
  }
  
  let textArray = submittedText
  .replace(/<\/?p>|&nbsp;|<[^>]+>/g, ' ') // Remove <p>, </p>, &nbsp;, and other HTML tags
  .split(/\s+/) // Split text into array of words
  .map(item => item.replace(/^["'.,]+|["'.,?!]+$/g, '')); // Remove dots and commas from the start and end of each word

  if(keywords !==null){
    for(let option of keywords){
      option.option_correct = false;
      if (textArray.includes(option.option_text.toLowerCase())) {
          option.option_correct = true;
      }
    }
  }
  return keywords;
}