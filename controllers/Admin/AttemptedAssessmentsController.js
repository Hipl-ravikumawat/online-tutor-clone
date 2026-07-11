const mysqlOrm = require('mysql-orm');
const Assessment = require("../../models/Assessment");
const StudentAssessment = require("../../models/StudentAssessment");
const AttemptedAssessment = require("../../models/AttemptedAssessment");
const Practice = require("../../models/Practice");
const PracticeVersion = require("../../models/PracticeVersions");
const User = require('../../models/User');
const moment = require("moment");
const globalHelper = require("../../_helper/GlobalHelper");
const { join } = require("path");
const template = require("../../config/template");
const path = require("path");
const LearningContent = require("../../models/LearningContent");
const LearningContentVersions = require("../../models/LearningContentVersions");
const Challenge = require("../../models/Challenge");
const ChallengeVersion = require("../../models/ChallengeVersions");

module.exports = {
    assessmentDetailedReport,
    detailedReportDataTable,
    assessmentResultOfStudent,
    loadLessonsForTutorComment,
    studentAttemptedAssessmentSummary,
    attemptedAssessmentContentSlider,
    viewTextTypeAttemptedAssessment,
    addCommentForTextAssessment,
    allStudentsReport,
    filterAssessmentReport,
    calculateResult,
} 

/**
 * detailed report of attempted assessment.
 * @param {*} req
 * @param {*} res
 */
async function assessmentDetailedReport(req, res) {
    try {
      const assessment = await Assessment.find({ slug: req.params.assessment_slug });
      const studentAssessment = await StudentAssessment.find({assessment_id: assessment[0]._id},{status:1,final_score:1});
      const completedObjects = studentAssessment.filter(item => item.status === 'Completed');
      const sumFinalScore = completedObjects.reduce((total, item) => total + item.final_score, 0);

      const totalAssessment = studentAssessment.length;
      const completedAssessment = completedObjects.length;
      const notCompleted = totalAssessment - completedAssessment;
      let overallScore = (sumFinalScore/completedAssessment);
      if (Number.isInteger(overallScore) == false) {
        overallScore = overallScore.toFixed(2);
      }
      if(isNaN(overallScore)){
        overallScore = 0;
      }
      const topCount = {
        totalAssessment:totalAssessment,
        completedAssessment:completedAssessment,
        notCompleted:notCompleted,
        overallScore:overallScore,
      }

      if (!assessment.length) {
        return res.status(404).json({ message: "Assessment not found." });
      }
      
      let students = [];
      if(attachedStudentIds && attachedStudentIds.length > 0){
        students = await User.find({
          _id: { $in: attachedStudentIds },
          isDeleted: false,
          role: 3,
        }, '_id role first_name last_name').sort({ first_name: 1 });
      }else{  
        students = await User.find({"role": 3, "status": 1, "isDeleted": false},).sort({ 'role': 1, '_id': -1 });
      }

      return res.render("../views/admin/attemptedAssessments/reporting/view_detailed_report", {
        assessmentDetail:assessment[0],
        topCount:topCount,
        students:students,
        moment: res.locals.moment,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
}

/**
 * detailed report ajax dataTable.
 * @param {*} req
 * @param {*} res
 */
async function detailedReportDataTable(req, res) {
  try{
      const filter = [];
      if (req.body.order == undefined) {
        sort = { _id: -1 };
      } else {
        const column_name = filter[req.body.order[0].column];
        const order_by = req.body.order[0].dir;
        sort = { [column_name]: order_by };
      }

      var searchStr = {};
      var obj = {};
      let assessmentId = req.body.assessment_id;
      let studentId = req.body.student_id;
      let status = req.body.status;
      let percentage = req.body.percentage;
      if(percentage){
        let percentageData = percentage.split('-');
        obj["final_score"] = { $gte: percentageData[0], $lte: percentageData[1] };
      }
      obj["assessment_id"] = mysqlOrm.Types.ObjectId(assessmentId);
      if(studentId){
        obj["student_id"] = mysqlOrm.Types.ObjectId(studentId);
      }
      if(status){
        obj["status"] = status;
      }
      var recordsTotal = 0;
      var recordsFiltered = 0;
      recordsTotal = await StudentAssessment.count(obj);
      recordsFiltered = await StudentAssessment.count({ $and: [obj, searchStr] });
    
      let results = await StudentAssessment.find(
        { $and: [obj, searchStr] },
        "_id name content final_score student_assessment_ids status updated_at",
        { skip: Number(req.body.start), limit: Number(req.body.length) }
      )
        .populate("student_id")
        .populate("assessment_id");

      var data = JSON.stringify({
        draw: req.body.draw,
        recordsFiltered: recordsFiltered,
        recordsTotal: recordsTotal,
        data: results,
      });
      return res.send(data);
  } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
  }
}

/**
 * lessons for tutor's comment.
 * @param {*} req
 * @param {*} res
 */
async function loadLessonsForTutorComment(req, res) {
  try {
    let data = [];
    let assessmentId = mysqlOrm.Types.ObjectId(req.body.assessment_id);
    let studentId = mysqlOrm.Types.ObjectId(req.body.student_id);
    let results = await AttemptedAssessment.find({ assessment_id: assessmentId, student_id: studentId,}).populate("lesson_id");
    const Object = [];
    for (result of results) {
      for (answer of result.answers) {
        if ((answer.type == "text")) {
          Object.push({
            lesson_id: result.lesson_id.id,
            title: result.lesson_id.title,
            assessment_id: req.body.assessment_id,
            student_id: req.body.student_id,
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
 * assessment result of a student..
 * @param {*} req
 * @param {*} res
 */
async function assessmentResultOfStudent(req, res){
  try {
    const [studentId, assessmentId] = [req.params.studentId, req.params.assessmentId]; // Convert to numbers
    const studentAssessmentData = await StudentAssessment.find({student_id: studentId, assessment_id: assessmentId}, 'final_score student_id assessment_id practice_score challenge_score updated_at')
    .populate({
      path: 'assessment_id',
      model: 'assessments',
      select:'name'
    })
    .populate({
      path: 'student_id',
      model: 'users',
      select:'first_name last_name'
    }).sort({ updated_at: -1 });

    let studentName = studentAssessmentData[0].student_id.first_name+" "+studentAssessmentData[0].student_id.last_name;
    let assessmentName = studentAssessmentData[0].assessment_id.name;
    const originalDate = new Date(studentAssessmentData[0].updated_at);

    const finalResult ={ 
      percentage  : studentAssessmentData[0].final_score,
      totalPracticeQuestion : studentAssessmentData[0].practice_score[0].total ?? 0,
      correctPracticeQuestion : studentAssessmentData[0].practice_score[0].correct ?? 0,
      totalChallengeQuestion : studentAssessmentData[0].challenge_score[0].total ?? 0,
      correctChallengeQuestion : studentAssessmentData[0].challenge_score[0].correct ?? 0
    }

    return res.render("../views/admin/attemptedAssessments/reporting/assessment_result_of_student", {
      assessmentId:assessmentId, 
      studentId:studentId, 
      studentName:studentName,
      assessmentName:assessmentName,
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
 * assessment summary of a student..
 * @param {*} req
 * @param {*} res
 */
async function studentAttemptedAssessmentSummary(req, res){
  try{
    global.sidebarType = "assessmentReport";
    const assessmentId = mysqlOrm.Types.ObjectId(req.params.assessmentId);
    const studentId = mysqlOrm.Types.ObjectId(req.params.studentId);
    let practiceData = [];
    let challengeData = [];
  const attemptedAssessments = await AttemptedAssessment.find({student_id: studentId, assessment_id: assessmentId})
  .populate({
    path: 'challenge_id',
    model: 'challenges_versions',
    select:'_id title'
  })
  .populate({
    path: 'assessment_id',
    model: 'assessments',
    select:'_id name tutor_id',
    populate: { // Nested populate for tutor details within assessment
      path: 'tutor_id',
      model: 'users',
      select: '_id first_name last_name' // Select specific fields for tutor
    }
  })
    .populate({
    path: 'lesson_id',
    model: 'lesson_versions',
    select:'_id slug title'
  })
  .populate({
    path: 'student_id',
    model: 'users',
    select:'_id first_name last_name'
  });
  
  const assessmentTitle = attemptedAssessments[0].assessment_id.name;
  const studentName = attemptedAssessments[0].student_id.first_name+" "+attemptedAssessments[0].student_id.last_name;
  const tutorName = attemptedAssessments[0].assessment_id.tutor_id.first_name+" "+attemptedAssessments[0].assessment_id.tutor_id.last_name;

  for(let data of attemptedAssessments){
    if(data.challenge_id === null){
      let answers = data.answers;
      for(let answer of answers){
        let practice = await PracticeVersion.findById(answer.questionId);
        let lesson_id = data.lesson_id.id.toString();
        let learningContent = await LearningContentVersions.find({ lesson_ids: { $in: [lesson_id] } }, '_id title slug').sort({ created_at: -1 });

        practiceData.push({
          id:answer.questionId,
          title : practice.question_title,
          question_type :  answer.type,
          submittedAnswer: answer.submittedAnswer,
          isCorrect: answer.isCorrect,
          attachment: answer.attachment,
          tutorComment: answer.comment ?? '',
          learning_content_id : learningContent[0]._id.toString(),
          learning_content_slug : learningContent[0].slug,
          lesson_id : lesson_id,
          lesson_slug : data.lesson_id.slug
        });
      }
    }

    if(data.challenge_id !== null){
      let lesson_id = data.lesson_id.id.toString();
      let learningContent = await LearningContentVersions.find({ lesson_ids: { $in: [lesson_id] } }, '_id title slug').sort({ created_at: -1 });

      challengeData.push({
        id: data.challenge_id.id,
        title: data.challenge_id.title,
        totalAttempted:data.total_attempted_question,
        totalCorrect: data.total_correct_answer,
        learning_content_id : learningContent[0]._id.toString(),
        learning_content_slug : learningContent[0].slug,
        lesson_id : lesson_id,
        lesson_slug : data.lesson_id.slug
      });
    }
  }

   global.assessmentReportSideBarDetails= {
    assessmentId: attemptedAssessments[0].assessment_id._id.toString(),
    assessmentName: assessmentTitle,
    tutorId: attemptedAssessments[0].assessment_id.tutor_id._id.toString(),
    tutorName: tutorName,
    studentId: attemptedAssessments[0].student_id._id.toString(),
    studentName: studentName,
    practices: practiceData,
    challenges: challengeData,
  };

    return res.render("../views/admin/attemptedAssessments/reporting/attempted_assessment_summary",{studentName:studentName,tutorName:tutorName,assessmentName:assessmentTitle});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * content slider for an attempted assessment of a student.
 * @param {*} req
 * @param {*} res
 */
async function attemptedAssessmentContentSlider(req, res) {
  try {
    const lessonId = req.body.lesson_id;
    const lessonSlug = req.body.lesson_slug;
    const activeLessonContentType = req.body.type;
    const activeContentId = req.body.content_id;
    const user_detail = res.locals.loggedUserInfo;
    const userRole = user_detail.role;
    const reportFlag = true;
    let savedQuestion = []; 
    let contentHtml = "";
 
    if (activeLessonContentType == "practices") {
      let practice = await PracticeVersion.findById(activeContentId);
        let audioExtension = "";
        let attachmentName = "";
        let isCorrectAnswer = false;
        let teacherComment = "";
        const allAttemptedPractices =  assessmentReportSideBarDetails.practices;
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
          let keywords = await matchTextTypeKeyword(savedQuestion,practice.options);
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
              attachmentName:(attachmentName !='') ? '/Assessment/'+attachmentName :'',
            },"/learningContent/lesson/report_practices/typeText.ejs");
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
            },"learningContent/lesson/report_practices/dragDrop.ejs");
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
                },"/learningContent/lesson/report_practices/selectImage.ejs");
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
                },"/learningContent/lesson/report_practices/selectText.ejs");
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
            },"/learningContent/lesson/report_practices/selectWithImage.ejs");
          }
        }
    }

    if (activeLessonContentType == "challenges") {
      const allAttemptedChallenges =  assessmentReportSideBarDetails.challenges;
      const matchedChallenge = allAttemptedChallenges.find((challenge) => challenge.id === activeContentId);

      const challenge = await ChallengeVersion.findById(activeContentId).select('multiplication_no type duration created_at');
      const desiredObject = {
        ...matchedChallenge,
        ...challenge,
      };
      contentHtml = template.render({ challenge:desiredObject, lessonId: lessonId, reportFlag:reportFlag},"/learningContent/lesson/report_challenges/challenge-result.ejs");
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
 * view student's submitted answer for text type practice assessment.
 * @param {*} req
 * @param {*} res
 */
async function viewTextTypeAttemptedAssessment(req, res) {
  try {
    const assessmentId = mysqlOrm.Types.ObjectId(req.params.assessmentId);
    const studentId = mysqlOrm.Types.ObjectId(req.params.studentId);
    const lessonId = mysqlOrm.Types.ObjectId(req.params.lessonId);

    const attemptedAssessment = await AttemptedAssessment.findOne({
      assessment_id: assessmentId,
      lesson_id: lessonId,
      student_id: studentId,
      challenge_id:null
    }).populate("lesson_id");

    let filteredTextType = [];
    let count = 0;
    if(attemptedAssessment){
      for (data of attemptedAssessment.answers) {
        if (data.type == "text") {
          const practicesData = await PracticeVersion.findById(data.questionId);
          let keywords = await matchTextTypeKeyword(data.submittedAnswer,practicesData.options);
          data.question_title = practicesData.question_title;
          data.question = practicesData.question;
          data.question_explanation = practicesData.question_explanation;
          data.keyword = keywords;
        }
      }
      
      let objects = attemptedAssessment.answers;
      filteredTextType = objects.filter(item => item.type === 'text');
      return res.render("../views/admin/attemptedAssessments/reporting/view_text_type_attempted_assessment", {
        data: attemptedAssessment,
        count:filteredTextType.length,
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
 * add a comment for pass/fail status for a text type practice assessment.
 * @param {*} req
 * @param {*} res
 */
async function addCommentForTextAssessment(req, res) {
  try { 
    const assessmentId = mysqlOrm.Types.ObjectId(req.body.assessment_id);
    const studentId = mysqlOrm.Types.ObjectId(req.body.student_id);
    const lessonId = mysqlOrm.Types.ObjectId(req.body.lesson_id);
    const assessment = await Assessment.findById(req.body.assessment_id);
     
    const attemptedAssessment = await AttemptedAssessment.find({
      assessment_id: assessmentId,
      student_id: studentId,
      lesson_id: lessonId,
      challenge_id:null
    }).populate("lesson_id");

    if (assessment && attemptedAssessment.length > 0 ) {
      const attemptedAssessmentId = attemptedAssessment[0].id;
      const allPractices = attemptedAssessment[0].answers;
      // const textTypePractices = attemptedAssessment[0].answers.filter(obj => obj.type === "text");
     
      for (practice of allPractices) {
        const submittedTutorComments = req.body.answers;
        for (data of submittedTutorComments) {
          if (practice.questionId == data.questionId) {
            if (data.isChecked == "true") {
              practice.isCorrect = true;
            }else if(data.isChecked == "false"){
              practice.isCorrect = false;
            } else {
              practice.isCorrect = '';
            }
            if(practice.type === 'text'){
              practice.comment = data.comment;
            }else{
              practice.comment = '';
            }
          }
        }
      }
      
      const hasPending = allPractices.some(p => p.isCorrect === '');
      const allCorrect = allPractices.every(p => p.isCorrect === true);
      
      const assessmentStatus = hasPending
        ? 'Processing'
        : allCorrect
        ? 'Completed'
        : 'Almost,Try Again';
      
      await AttemptedAssessment.findByIdAndUpdate(
        attemptedAssessmentId,
        {
          answers: allPractices,
          status: assessmentStatus
        }
      );

      const overAllStatus = await manageAssessmentStatus(assessment, req.body.student_id);

      req.flash("success", "The comment is added successfully!");
      return res.send({
        success: true,
        message: "The comment is added successfully!",
        redirectUrl: `/attempted-assessments/detailed-report/${assessment.slug}`,
      });
    }

    req.flash("error", "The assessment data not found.");
    return res.send({
      success: false,
      message: "The assessment data not found.",
      redirectUrl: `attempted-assessments/detailed-report/${req.body.assessment_id}/student/${req.body.student_id}/lesson/${lessonId}`,
    });
  }catch(error){
      console.error(error);
      req.flash("error", "Something went wrong.");
      return res.send({
        success: false,
        message: "Something went wrong.",
        redirectUrl: `attempted-assessments/detailed-report/${assessmentId}/student/${studentId}/lesson/${req.body.lesson_id}`,
      });
  }
}

/**
 * manage assessment status.
 * @param {*} req
 * @param {*} res
 */
async function manageAssessmentStatus(assessment,studentId){
  try{
    const content = assessment.content;
    let havePractice = 0;
    let haveChallenge = 0;
    let requiredAssessmentCount = 0;
    let totalChallengeQuestions = 0 ;
    let totalCorrectChallengeAnswers = 0;
    let totalPracticeQuestions = 0 ;
    let totalCorrectPracticeAnswers = 0;

    for(let assignedLesson of content){
      for(let lesson of assignedLesson.lessons){
        if (lesson.practice_ids.length > 0) {
          totalPracticeQuestions = parseInt(totalPracticeQuestions) + parseInt(lesson.practice_ids.length);
          requiredAssessmentCount++;
          havePractice = 1;
        }
        if (lesson.challenges_ids.length > 0) {
          requiredAssessmentCount = parseInt(requiredAssessmentCount) + parseInt(lesson.challenges_ids.length);
          haveChallenge = 1;
        }
      }
    }
    
    let attemptedAssessments = await AttemptedAssessment.find({
      'assessment_id': mysqlOrm.Types.ObjectId(assessment.id),
      'student_id': mysqlOrm.Types.ObjectId(studentId),
    });
    
    let challengeScore = {total:0,correct:0,percentage:0}
    let practiceScore = {total:0,correct:0,percentage:0}
    for(let data of attemptedAssessments){
      let answers = data.answers;
      if(data.assessment_type === 'challenges'){
        const correctCount = answers.filter(item => item.isCorrect === 'true').length;
        totalCorrectChallengeAnswers = parseInt(totalCorrectChallengeAnswers) + parseInt(correctCount);
        totalChallengeQuestions = parseInt(totalChallengeQuestions) + parseInt(answers.length);
      }else if(data.assessment_type === 'practices'){
        const isCorrectCount = answers.filter(item => item.isCorrect === true).length;
        totalCorrectPracticeAnswers = parseInt(totalCorrectPracticeAnswers) + parseInt(isCorrectCount);
      }
    }

    challengeScore.total = totalChallengeQuestions;
    challengeScore.correct = totalCorrectChallengeAnswers;
    practiceScore.total = totalPracticeQuestions;
    practiceScore.correct = totalCorrectPracticeAnswers;
    
    let challengePercentage = (parseInt(challengeScore.correct)/parseInt(challengeScore.total))*100;
    let practicePercentage = (parseInt(practiceScore.correct)/parseInt(practiceScore.total))*100;
    if(Number.isInteger(challengePercentage) === false){
      challengePercentage = challengePercentage.toFixed(2);
    }
    if(Number.isInteger(practicePercentage) === false){
      practicePercentage = practicePercentage.toFixed(2);
    }
    if (isNaN(challengePercentage)) {
      challengePercentage  = 0;
    }
    if (isNaN(practicePercentage)) {
      practicePercentage  = 0;
    }
    
    challengeScore.percentage = challengePercentage;
    practiceScore.percentage = practicePercentage;
    
    let overallScore = (parseFloat(challengePercentage)+parseFloat(practicePercentage))/(parseInt(havePractice) + parseInt(haveChallenge));
    
    if(Number.isInteger(overallScore) === false){
      overallScore = overallScore.toFixed(2);
    }
    if(isNaN(overallScore)){
      overallScore = 0;
    }
    let completedAssessments = attemptedAssessments.filter(item => item.status === 'Completed').map(item => item.status);
    
    let status = 'Processing';
    if(requiredAssessmentCount == completedAssessments.length ){
      status = 'Completed';
    }
    let updateObject = {
      status:status,
      challenge_score:challengeScore,
      practice_score:practiceScore,
      final_score:overallScore,
    }
    let updatedData = await StudentAssessment.updateOne({
      'assessment_id': mysqlOrm.Types.ObjectId(assessment.id),
      'student_id': mysqlOrm.Types.ObjectId(studentId),
    },updateObject);
    
    if(updatedData){
      let studentAssessments = await StudentAssessment.find({'assessment_id': mysqlOrm.Types.ObjectId(assessment.id)});
      let studentStatusArray = studentAssessments.map(item => item.status);
      let isNotAttempted = studentStatusArray.every(value => value === "N/A");
      let isCompleted = studentStatusArray.every(value => value === "Completed");

      let status = 'Processing';
      if(isNotAttempted){
        status = 'N/A';
      }else if(isCompleted){
        status = 'Completed'; 
      }
      let updatedAssessmentStatus = await Assessment.findByIdAndUpdate(assessment.id,{status:status});
    
      return updatedAssessmentStatus; 
    }
  } catch(error){
    console.log(error);
   return error;
  }
}

/**
 * assessment report page
 * @param {*} req
 * @param {*} res
 */
async function allStudentsReport(req, res){
  try{
    let tutors = await User.find({ "role": 2,"status": 1,"isDeleted":false }).sort({ '_id': -1 });
    let students = await User.find({ "role": 3,"status": 1,"isDeleted":false }).sort({ '_id': -1 });
    return res.render("../views/admin/attemptedAssessments/reporting/overall_assessment_report",{tutors:tutors,students:students});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * filter assessment reports. 
 * @param {*} req
 * @param {*} res
 */
async function filterAssessmentReport(req, res){
  try{ 
    const query = { status: 'Completed' };
    
    // Add student_id if provided
    if (req.body.student_id) {
      query.student_id = mysqlOrm.Types.ObjectId(req.body.student_id);
    }
    
    // Add date range if provided
    if (req.body.date_range) {
      const [startDateStr, endDateStr] = req.body.date_range.split('-').map(s => s.trim());
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      query.created_at = { $gte: startDate, $lte: endDate };
    }

    // Execute query with all conditions
    let completedAssessment = await StudentAssessment.find(query)
    .populate({
      path: 'assessment_id',
      model: 'assessments',
      select:'name'
    });
    let combinedObject = {
      level_1: [],
      level_2: [],
      level_3: [],
  };
    for (let result of completedAssessment) {
      let startDate = res.locals.moment(result.created_at).format("ddd, D MMM YYYY");
      let practiceQuestion = (result.practice_score[0]?.total_attempted_question !== undefined ) ? result.practice_score[0].total_attempted_question : 0 ;
      let practiceCorrectQuestion = (result.practice_score[0]?.total_correct_answer !== undefined ) ? result.practice_score[0].total_correct_answer : 0 ;

      let challengeQuestion = (result.challenge_score[0]?.total_attempted_question !== undefined ) ? result.challenge_score[0].total_attempted_question : 0 ;
      let challengeCorrectQuestion = (result.challenge_score[0]?.total_correct_answer !== undefined ) ? result.challenge_score[0].total_correct_answer : 0 ;

      if(result.final_score >= 80){
        let object = {
          name:result.assessment_id.name,
          percentage:result.final_score,
          date:startDate,
          total_question: parseInt(practiceQuestion) + parseInt(challengeQuestion),
          correct_answer: parseInt(practiceCorrectQuestion) + parseInt(challengeCorrectQuestion),
        }
        combinedObject.level_1.push(object);
      }else if(result.final_score >= 50){

        let object = {
          name:result.assessment_id.name,
          percentage:result.final_score,
          date:startDate,
          total_question: parseInt(practiceQuestion) + parseInt(challengeQuestion),
          correct_answer: parseInt(practiceCorrectQuestion) + parseInt(challengeCorrectQuestion),
        }
        combinedObject.level_2.push(object);

      }else{
        let object = {
          name:result.assessment_id.name,
          percentage:result.final_score,
          date:startDate,
          total_question: parseInt(practiceQuestion) + parseInt(challengeQuestion),
          correct_answer: parseInt(practiceCorrectQuestion) + parseInt(challengeCorrectQuestion),
        }
        combinedObject.level_3.push(object);
      }
    }
    return res.status(200).json({
      result: true,
      data: combinedObject,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * calculate the result of attempted assessment. 
 * @param {*} req
 * @param {*} res
 */
async function calculateResult(req, res) {
    try {
      let lessonId = req.body.lesson_id;
      let assessmentId = req.body.assessment_id;
      let questionType = req.body.question_type;
      let studentId = user_detail._id.toString();
      let report = req.body.report; // check for report page
      let totalQuestionCount = 0;
      let CorrectAnswerCount = 0;
      let overAllPercentage = 0;
      const allQuestion = [];

      const obj = {};
      if (questionType == "practices") {
        obj["challenge_id"] = null;
      }
      if (questionType == "challenges") {
        obj["challenge_id"] = { $ne: null };
      }

      if (report == "true") {
        studentId = req.body.student_id;
      }
      if (questionType == "overall") {
        homework = await AttemptedAssessment.find({
          $and: [{ student_id: studentId, assessment_id: assessmentId }, obj],
        });
        let count = 0;
        for (let data of homework) {
          count++;
          overAllPercentage += parseFloat(data.percentage);
        }
        let score = overAllPercentage / count;
        if (Number.isInteger(score) == false) {
          overAllPercentage = score.toFixed(2);
        } else {
          overAllPercentage = score;
        }
      } else {
        homework = await AttemptedAssessment.find({
          $and: [
            {
              student_id: studentId,
              assessment_id: assessmentId,
              lesson_id: lessonId, 
            },
            obj,
          ],
        });
  
        let temp_percentage = 0;

        for (let data of homework) {
          temp_percentage = parseFloat(temp_percentage) + parseFloat(data.percentage);
          if(data.challenge_id != ''){
            totalQuestionCount = totalQuestionCount + data.total_attempted_question;
            CorrectAnswerCount = CorrectAnswerCount + data.total_correct_answer;
            for (answer of data.answers) {
              allQuestion.push(answer);
            }
          }else{
            totalQuestionCount = totalQuestionCount + data.total_attempted_question;
            CorrectAnswerCount = CorrectAnswerCount + data.total_correct_answer;
          }
        }

        let overAllCounts = homework.length*100;
        
        let score = (temp_percentage/overAllCounts)*100;
        if (Number.isInteger(score) == false) {
          overAllPercentage = score.toFixed(2);
        } else {
          overAllPercentage = score;
        }
      }
      if(isNaN(overAllPercentage)){
        overAllPercentage = 0;
      }
      let assessmentName = await Assessment.findById(assessmentId);
      let data = JSON.stringify({
        name: assessmentName.name,
        percentage: overAllPercentage,
        allQuestion: allQuestion,
        total_question: totalQuestionCount,
        correct_answer: CorrectAnswerCount,
      });
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
        if (option.option_text != null && textArray.includes(option.option_text.toLowerCase())) {
            option.option_correct = true;
        }
    }
  }

  return keywords;
}