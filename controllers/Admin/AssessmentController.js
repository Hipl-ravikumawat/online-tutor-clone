const mysqlOrm = require('mysql-orm');
const template = require("../../config/template");
const globalHelper = require("../../_helper/GlobalHelper");

const User = require("../../models/User");
const Topic = require("../../models/Topic");
const Grade = require("../../models/Grade");
const LearningContent = require("../../models/LearningContent");
const Lesson = require("../../models/Lesson");
const Practice = require("../../models/Practice");
const Challenge = require("../../models/Challenge");
const LearningContentVersions = require("../../models/LearningContentVersions");
const LessonVersions = require("../../models/LessonVersions");
const PracticeVersions = require("../../models/PracticeVersions");
const ChallengeVersions = require("../../models/ChallengeVersions");
const Assessment = require("../../models/Assessment");
const StudentAssessment = require("../../models/StudentAssessment");
const SavedAssessment = require("../../models/SavedAssessment");
const AttemptedAssessment = require("../../models/AttemptedAssessment");
const randomStr = require("randomstring");
const path = require("path");
const SlideVersion = require("../../models/SlideVersions");

module.exports = {
  // Crud Operations....
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,

  // Take an assessment Functions....
  loadAssessmentLessons,
  loadAssessmentLessonTasks,
  uploadAttachment,
  submitAnAssessment,
  saveAndQuitAssessmentQuestion,
  updateStatusOnAssessmentAttempt,

  // Filter Functions....
  filterLessonsByLearningContent,
  filterStudents,
};

/**
 * assessment index.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req, res) {
  try {
    let grades = await Grade.find({ status: 1, isDeleted: false }).sort({
      name: 1,
    });

    let topics = await Topic.find({ status: 1, isDeleted: false }).sort({
      name: 1,
    });

    let users = await User.find(
      { 
        $or: [
          { role: 2, status: 1, isDeleted: false },
          { role: 3, status: 1, isDeleted: false },
        ],
      },
      "_id role first_name last_name"
    ).sort({ role: 1, first_name: 1 });

    const user_detail = res.locals.loggedUserInfo;
    let assessmentObject = {};
    let tutors = [];
    let students = [];
    let obj = {};
    let totalAssessment = 0;
    let completedAssessment = 0;
    let processingAssessment = 0;
    let filterCompleted = 0;
    let filterProcessing = 0;
    let notCompleted = 0;
    let userRole = user_detail.role;
    let userId = mysqlOrm.Types.ObjectId(user_detail._id.toString());
    let assessments = [];

    if (user_detail.role == 2) {
      if (attachedStudentIds && attachedStudentIds.length > 0) {
        students = await User.find(
          {
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
          },
          "_id role first_name last_name"
        ).sort({ first_name: 1 });
      }

      // if (attachedAssessmentIds && attachedAssessmentIds.length > 0) {
      //   obj["_id"] = { $in: attachedAssessmentIds };
      // }

      assessments = await Assessment.find({tutor_id:userId}, "_id name").sort({ name: 1 });

      totalAssessments = await Assessment.countDocuments({tutor_id:userId});
      completedAssessments = await Assessment.countDocuments({tutor_id:userId,status:"Completed"});
      processingAssessments = await Assessment.countDocuments({tutor_id:userId, status:"Processing"})
      notCompleted = await Assessment.countDocuments({tutor_id:userId, status:"N/A"});

      assessmentObject = {
        total: totalAssessments,
        completed: completedAssessments,
        not_completed: notCompleted,
        pending: processingAssessments,
      };

    } else if (user_detail.role == 3) {
      obj["student_ids"] = userId;
      if (attachedTutorIds && attachedTutorIds.length > 0) {
        tutors = await User.find(
          {
            _id: { $in: attachedTutorIds },
            isDeleted: false,
            role: 2,
          },
          "_id role first_name last_name"
        ).sort({ first_name: 1 });
      }

      // if (attachedAssessmentIds && attachedAssessmentIds.length > 0) {
      //   obj["_id"] = { $in: attachedAssessmentIds };
      // }
      assessments = await Assessment.find(obj, "_id name").sort({  name: 1 });
      
      totalAssessment = await Assessment.find(obj).sort({  name: 1 }).count();
      completedAssessment = await Assessment.find(obj).populate({
        path: "student_assessment_ids",
        model: "student_assessments",
        match: { status: "Completed" },
      });
      processingAssessment = await Assessment.find(obj).populate({
        path: "student_assessment_ids",
        model: "student_assessments",
        match: { status: "Processing" },
      });
      // filter the completed assessment of current student
      filterCompleted = completedAssessment.filter(assessment => {
          return assessment.student_assessment_ids.some(item => item.student_id.toString() === userId.toString());
      });

      // filter the processing assessment of current student
      filterProcessing = processingAssessment.filter(assessment => {
          return assessment.student_assessment_ids.some(item => item.student_id.toString() === userId.toString());
      });

      countCompleted  = filterCompleted.length;
      countProcessing  = filterProcessing.length;
      notCompleted = totalAssessment - (parseInt(countCompleted) + parseInt(countProcessing));

      assessmentObject = {
        total: totalAssessment,
        completed: countCompleted,
        not_completed: notCompleted,
        pending: countProcessing,
      };
      
    } else {
      tutors = users.filter((user) => user.role === 2);
      students = users.filter((user) => user.role === 3);

      assessments = await Assessment.find(obj, "_id name").sort({  name: 1 });
      totalAssessments = await Assessment.countDocuments({});
      completedAssessments = await Assessment.countDocuments({status:"Completed"});
      processingAssessments = await Assessment.countDocuments({status:"Processing"})
      notCompleted = await Assessment.countDocuments({status:"N/A"});

      assessmentObject = {
        total: totalAssessments,
        completed: completedAssessments,
        not_completed: notCompleted,
        pending: processingAssessments,
      };
    }   
    
    return res.render("../views/admin/assessments/index", {
      moment: res.locals.moment,
      assessments: assessments,
      assessmentObject: assessmentObject,
      grades: grades,
      students: students,
      tutors: tutors,
      topics: topics,
      userRole: userRole,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * ajax dataTable.
 * @param {*} req
 * @param {*} res
 */
async function dataTable(req, res) {
  try {
    let searchStr = req.body.search.value;
    let obj = {};
    let matchTopicIds = {};
    const user_detail = res.locals.loggedUserInfo;

    if (req.body.assessment_id) {
      obj["_id"] = req.body.assessment_id;
    }

    if (req.body.tutor) {
      obj["tutor_id"] = mysqlOrm.Types.ObjectId(req.body.tutor);
    }

    let filterStatus = {};
    if (req.body.status) {
      let status = req.body.status;
      obj["status"] = status;
      // if (status == 1) {
      //   filterStatus = { status: "Completed" };
      // } else {
      //   filterStatus = { status: { $ne: "Completed" } };
      // }
    }

    if (req.body.search.value) {
      var regex = new RegExp(req.body.search.value, "i");
      searchStr = { $or: [{ name: regex }] };
    } else {
      searchStr = {};
    }

    let userRole = user_detail.role;
    let userId = user_detail._id.toString();

    // to fetch for assign tutor data
    if (userRole == 2 && req.body.tutor == "") {
      obj["tutor_id"] = mysqlOrm.Types.ObjectId(userId);
    }

    let totalCount = {};
    // to fetch for assign student data
    let matchLoggedUser = {};
    if (userRole == 3) {
      obj["student_ids"] = { $in: [mysqlOrm.Types.ObjectId(user_detail._id)] };
      totalCount["student_ids"] = {
        $in: [mysqlOrm.Types.ObjectId(user_detail._id)],
      };
      // matchLoggedUser = { student_id: user_detail._id };
      matchLoggedUser = {
        _id: mysqlOrm.Types.ObjectId(user_detail._id)
      };
    }

    const filter = [
      "name",
      "tutor_id",
      "apply_duration",
      "status",
      "date",
      "created_at",
      "action",
    ];

    const column_name = filter[req.body.order[0].column];
    const order_by = req.body.order[0].dir;

    var recordsTotal = 0;
    var recordsFiltered = 0;
    recordsTotal = await Assessment.count({ $and: [obj, searchStr] });
    recordsFiltered = await Assessment.count({ $and: [obj, searchStr] });

    let results = await Assessment.find(
      { $and: [obj, searchStr] },
      "_id name content slug tutor_id student_ids homework_status date start_time end_time apply_duration status created_at",
      { skip: Number(req.body.start), limit: Number(req.body.length) }
    )
      .populate({
        path: "content.learning_content_id",
        model: "learning_content_versions",
        match: matchTopicIds,
      })
      .populate("tutor_id")
      .populate("student_ids")
      .populate({
        path: "student_assessment_ids",
        model: "student_assessments",
        match: filterStatus,
        populate: [
          {
            path: "student_id",
            model: "users",
            match: matchLoggedUser,
          },
        ],
      })
      .sort({ [column_name]: order_by });

    if (userRole == 3 && results.length > 0) {

      const studentId = mysqlOrm.Types.ObjectId(user_detail._id);

      for (const assessment of results) {

        // only for processing assessments
        if (assessment.status !== "Processing") {
          continue;
        }

        // loop content
        if (
          assessment.content &&
          Array.isArray(assessment.content)
        ) {

          for (const contentItem of assessment.content) {

            if (
              !contentItem.lessons ||
              !Array.isArray(contentItem.lessons)
            ) {
              continue;
            }

            for (const lesson of contentItem.lessons) {

              const lessonId = lesson.lesson_id;

              if (!lessonId) {
                continue;
              }

              const attemptedAssessment =
                await AttemptedAssessment.findOne({
                  assessment_id: assessment._id,
                  student_id: studentId,
                  lesson_id: lessonId,
                })
                  .select("status")
                  .lean();

              if (attemptedAssessment?.status) {

                lesson.status = attemptedAssessment.status;
                if (
                  attemptedAssessment.status === 'Almost,Try Again'
                ) {
                  if (
                    assessment.student_assessment_ids &&
                    assessment.student_assessment_ids.length > 0
                  ) {
                    assessment.student_assessment_ids[0].status =
                      'Almost,Try Again';
                  }
                }
              }
            }
          }
        }
      }
    }

    const data = JSON.stringify({
      draw: req.body.draw,
      recordsFiltered: recordsFiltered,
      recordsTotal: recordsTotal,
      data: results,
      userRole: userRole,
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
 * create assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req, res) {
  try {

    let activeTopics = await Topic.find({ "status": 1, "isDeleted": false }).sort({ 'name': 1 });
    let activeGrades = await Grade.find({ "status": 1, "isDeleted": false }).sort({ 'name': 1 });

    let relatedUsers = await User.find({
      $or: [
        { role: 2, status: 1, isDeleted: false },
        { role: 3, status: 1, isDeleted: false },
      ],
    }).sort({ role: 1, first_name: 1 });
    let tutors = relatedUsers.filter((user) => user.role === 2);
    let students = [];
    let learningContents = [];
    const user_detail = res.locals.loggedUserInfo;

    if (user_detail.role == 2) {
      if (attachedStudentIds && attachedStudentIds.length > 0) {
        students = await User.find(
          {
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
          },
          "_id role first_name last_name"
        ).sort({ first_name: 1 });
      }

      if (attachedLearningContentIds && attachedLearningContentIds.length > 0) {
        learningContents = await LearningContent.find(
          { _id: { $in: attachedLearningContentIds }, status : 1 },
          "_id title",
        ).sort({ _id: -1 });
      }
    } else {
      students = relatedUsers.filter((user) => user.role === 3);
      
      learningContents = await LearningContent.find({status : 1}, "_id title").sort({
        _id: -1,
      });
    }

    return res.render("../views/admin/assessments/create", {
      learningContents: learningContents,
      tutors: tutors,
      students: students,
      activeTopics:activeTopics,
      activeGrades:activeGrades,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * store assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req, res) {
  try {
    const { student_ids, selected_contents, name, apply_duration, task_types, date, start_time, end_time } = req.body;
    const user_detail = res.locals.loggedUserInfo;
    const tutorId = user_detail.role === 2 ? user_detail._id : req.body.tutor_id;
    
    const pc = [];
    const versionCache = new Map();
    const processedLearningContents = new Set();
    const processedLessons = new Set();
    const processedContents = new Set();

    // First pass: Create all versions without duplicates
    for (const content of selected_contents) {
      const [learningContentId, lessonId, contentType, contentId] = content.split("--");

      let newContentDirectory = "";
      let oldContentDirectory = "";

      // 1. Create Learning Content Version if not exists
      if (!processedLearningContents.has(learningContentId)) {
        const learningContent = await LearningContent.findById(learningContentId);
        if (!learningContent) continue;

        // create folder of content directory
        const randomString = randomStr.generate({
          length: 8,
          charset: "alphabetic",
        });
        newContentDirectory = "lc_" + randomString + Date.now();
        
        if (!fs.existsSync("./assets/LearningContent")) {
          fs.mkdirSync("./assets/LearningContent", { recursive: true });
        }

        const dir = "./assets/LearningContent/" + newContentDirectory;
        await fs.mkdir(dir, (error) => {
          console.log(error);
        });
        oldContentDirectory = learningContent.content_directory;

        const latestVersion = await LearningContentVersions.findOne({ original_id: learningContentId })
          .sort({ version: -1 })
          .select("version")
          .lean();

        const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

        const learningContentData = learningContent.toObject();
        delete learningContentData._id;

        learningContentData.content_directory = newContentDirectory;
        
        let contentThumbnail = "";
        if (learningContentData.thumbnail != "" && learningContentData.thumbnail != null) {
          let thumbnail = learningContentData.thumbnail.split("-");
          thumbnail[0] = Date.now();
          contentThumbnail = thumbnail.join("-");
          
          globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${learningContentData.thumbnail}`,`./assets/LearningContent/${newContentDirectory}/${contentThumbnail}`);
        }    
        
        learningContentData.thumbnail = contentThumbnail;

        const learningContentVersion = await LearningContentVersions.create({
          ...learningContentData,
          original_id: learningContentId,
          version: versionNumber,
          created_at: new Date(),
          updated_at: new Date(),
          lesson_ids: []
        });

        versionCache.set(`lc_${learningContentId}`, learningContentVersion);
        processedLearningContents.add(learningContentId);
      }

      // 2. Create Lesson Version if not exists
      if (!processedLessons.has(lessonId)) {
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) continue;

        const latestVersion = await LessonVersions.findOne({ original_id: lessonId })
          .sort({ version: -1 })
          .select("version")
          .lean();

        const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

        const lessonData = lesson.toObject();
        delete lessonData._id;

        const lessonVersion = await LessonVersions.create({
          ...lessonData,
          original_id: lessonId,
          version: versionNumber,
          created_at: new Date(),
          updated_at: new Date(),
          slide_ids: [],
          practice_ids: [],
          challenge_ids: []
        });

        versionCache.set(`lesson_${lessonId}`, lessonVersion);
        processedLessons.add(lessonId);

        // Update learning content version with lesson reference
        const learningContentVersion = versionCache.get(`lc_${learningContentId}`);
        if (learningContentVersion) {
          await LearningContentVersions.findByIdAndUpdate(
            learningContentVersion._id,
            { $addToSet: { lesson_ids: lessonVersion._id } }
          );
        }
      }

      // 3. Create Practice/Challenge Version if not exists
      if (!processedContents.has(`${contentType}_${contentId}`)) {
        let contentVersion = null;
        
        if (contentType === "practice") {
          const practice = await Practice.findById(contentId);
          if (!practice) continue;

          const latestVersion = await PracticeVersions.findOne({ original_id: contentId })
            .sort({ version: -1 })
            .select("version")
            .lean();

          const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

          const practiceData = practice.toObject();
          delete practiceData._id;
          if (!Array.isArray(practiceData.options) || practiceData.options.some(opt => typeof opt !== 'object')) {
            practiceData.options = [];
          }

          let question_image = "";
          let question_audio = "";
          let optionObject = [];

          if (practiceData.options != "" && practiceData.options != null && practiceData.options != undefined) {
            for (option of practiceData.options) {
              let option_image = option.option_image;
              if (option.option_image != "" && option.option_image != null) {
                let image = option.option_image.split("-");
                image[0] = Date.now();
                option_image = image.join("-");

                globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${option.option_image}`,`./assets/LearningContent/${newContentDirectory}/${option_image}`);
              }

              let obj = {
                option_image: option_image,
                option_text: option.option_text,
                option_correct: option.option_correct,
              };
              optionObject.push(obj);
            }
          }

          if (practiceData.question_image != "" && practiceData.question_image != null && practiceData.question_image != undefined) {
            let image = practiceData.question_image.split("-");
            image[0] = Date.now();
            question_image = image.join("-");
            globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${practiceData.question_image}`,`./assets/LearningContent/${newContentDirectory}/${question_image}`);
          }

          if (practiceData.question_audio != "" && practiceData.question_audio != null) {
            let audio = practice.question_audio.split("-");
            audio[0] = Date.now();
            question_audio = audio.join("-");
            
            globalHelper.copyAnyFile(`./assets/LearningContent/${oldContentDirectory}/${practiceData.question_audio}`,`./assets/LearningContent/${newContentDirectory}/${question_audio}`);
          }

          practiceData.question_image = question_image;
          practiceData.question_audio = question_audio;
          practiceData.content_directory = newContentDirectory;
          practiceData.options = optionObject;

          // console.log('practiceData',practiceData);

          contentVersion = await PracticeVersions.create({
            ...practiceData,
            original_id: contentId,
            version: versionNumber,
            created_at: new Date(),
            updated_at: new Date()
          });

          // Update lesson version with practice reference
          const lessonVersion = versionCache.get(`lesson_${lessonId}`);
          if (lessonVersion) {
            await LessonVersions.findByIdAndUpdate(
              lessonVersion._id,
              { $addToSet: { practice_ids: contentVersion._id } }
            );
          }
        } 
        else if (contentType === "challenges") {
          const challenge = await Challenge.findById(contentId);
          if (!challenge) continue;

          const latestVersion = await ChallengeVersions.findOne({ original_id: contentId })
            .sort({ version: -1 })
            .select("version")
            .lean();

          const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

          const challengeData = challenge.toObject();
          delete challengeData._id;
          
          contentVersion = await ChallengeVersions.create({
            ...challengeData,
            original_id: contentId,
            version: versionNumber,
            created_at: new Date(),
            updated_at: new Date()
          });

          // Update lesson version with challenge reference
          const lessonVersion = versionCache.get(`lesson_${lessonId}`);
          if (lessonVersion) {
            await LessonVersions.findByIdAndUpdate(
              lessonVersion._id,
              { $addToSet: { challenge_ids: contentVersion._id } }
            );
          }
        }

        if (contentVersion) {
          versionCache.set(`${contentType}_${contentId}`, contentVersion);
          processedContents.add(`${contentType}_${contentId}`);
        }
      }
    }

    // Second pass: Build assessment content structure
    for (const content of selected_contents) {
      const [learningContentId, lessonId, contentType, contentId] = content.split("--");

      const learningContentVersion = versionCache.get(`lc_${learningContentId}`);
      const lessonVersion = versionCache.get(`lesson_${lessonId}`);
      const contentVersion = versionCache.get(`${contentType}_${contentId}`);

      if (!learningContentVersion || !lessonVersion || !contentVersion) continue;

      // Find or create learning content entry
      let lcEntry = pc.find(item => 
        item.learning_content_id.toString() === learningContentVersion._id.toString()
      );

      if (!lcEntry) {
        lcEntry = {
          learning_content_id: learningContentVersion._id,
          lessons: []
        };
        pc.push(lcEntry);
      }

      // Find or create lesson entry
      let lessonEntry = lcEntry.lessons.find(lesson => 
        lesson.lesson_id.toString() === lessonVersion._id.toString()
      );

      if (!lessonEntry) {
        lessonEntry = {
          lesson_id: lessonVersion._id,
          challenges_ids: [],
          practice_ids: []
        };
        lcEntry.lessons.push(lessonEntry);
      }

      // Add content reference
      if (contentType === "practice") {
        if (!lessonEntry.practice_ids.some(id => id.toString() === contentVersion._id.toString())) {
          lessonEntry.practice_ids.push(contentVersion._id);
        }
      } else {
        if (!lessonEntry.challenges_ids.some(id => id.toString() === contentVersion._id.toString())) {
          lessonEntry.challenges_ids.push(contentVersion._id);
        }
      }
    }

    // Create the assessment
    const newAssessment = {
      name,
      apply_duration: apply_duration === "1",
      tutor_id: tutorId,
      task_types,
      student_ids,
      date,
      content: pc,
      status: "N/A"
    };

    const assessmentDetail = await Assessment.create(newAssessment);

    // Create student assessments
    const studentAssessmentIds = [];
    if (student_ids && student_ids.length > 0) {
      for (const studentId of student_ids) {
        const studentAssessment = await StudentAssessment.create({
          assessment_id: assessmentDetail._id,
          student_id: studentId,
          status: "N/A"
        });
        studentAssessmentIds.push(studentAssessment._id);
      }
    }

    // Update assessment with student assessment references
    if (studentAssessmentIds.length > 0) {
      await Assessment.findByIdAndUpdate(assessmentDetail._id, {
        student_assessment_ids: studentAssessmentIds
      });
    }

    req.flash("success", "Assessment created successfully!");
    return res.status(200).json({
      success: true,
      message: "Assessment created successfully!",
      redirectUrl: "/assessments"
    });

  } catch (error) {
    console.error("Error in assessment store:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later."
    });
  }
}

/**
 * edit assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req,res){
  try{
    const slug = req.params.slug;
    const assessment = await Assessment.findOne({ slug: slug, deleted_at: null }).populate({
      path:'student_assessment_ids',
      model:'student_assessments',
      select:'id student_id status'
    }).populate({
      path: 'content.learning_content_id',
      model: 'learning_content_versions',
      select:'id title',
    }).populate({
      path: 'content.lessons.lesson_id',
      model: 'lesson_versions',
      select:'id title'
    }).populate({
      path: 'content.lessons.practice_ids',
      model: 'practices_versions',
      select:'id question_title original_id'
    }).populate({
      path: 'content.lessons.challenges_ids',
      model: 'challenges_versions',
      select:'id challenges original_id'
    });

    let relatedUsers = await User.find({
      $or: [
        { role: 2, status: 1, isDeleted: false },
        { role: 3, status: 1, isDeleted: false },
      ],
    }).sort({ role: 1, first_name: 1 });

    let activeTopics = await Topic.find({ "status": 1, "isDeleted": false }).sort({ 'name': 1 });
    let activeGrades = await Grade.find({ "status": 1, "isDeleted": false }).sort({ 'name': 1 });

    let tutors = relatedUsers.filter((user) => user.role === 2);
    let students = [];
    let learningContents = [];
    const user_detail = res.locals.loggedUserInfo;

    if (user_detail.role == 2) {
      if (attachedStudentIds && attachedStudentIds.length > 0) {
        students = await User.find(
          {
            _id: { $in: attachedStudentIds },
            isDeleted: false,
            role: 3,
          },
          "_id role first_name last_name"
        ).sort({ first_name: 1 });
      }

      if (attachedLearningContentIds && attachedLearningContentIds.length > 0) {
        learningContents = await LearningContent.find(
          { _id: { $in: attachedLearningContentIds }, status : 1 },
          "_id title"
        ).sort({ title: -1 });
      }
    } else {
      students = relatedUsers.filter((user) => user.role === 3);
      learningContents = await LearningContent.find({status : 1}, "_id title").sort({
        _id: -1,
      });
    }
    return res.render("../views/admin/assessments/edit",{ 
      learningContents: learningContents,
      tutors: tutors,
      students: students,
      assessment: assessment,
      activeTopics:activeTopics,
      activeGrades :activeGrades,
    });
  }catch(error){
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * update assessment
 */
async function update(req, res) {
  try {
    const { student_ids, selected_contents, assessment_id, name, apply_duration, task_types, date } = req.body;
    const user_detail = res.locals.loggedUserInfo;
    const tutorId = user_detail.role === 2 ? user_detail._id : req.body.tutor_id;

    // 1. Get existing assessment with populated student assessments
    const existingAssessment = await Assessment.findById(assessment_id)
      .populate('student_assessment_ids', 'student_id')
      .lean();
    
    if (!existingAssessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    // 2. Student validation
    const existingStudentIds = existingAssessment.student_ids.map(id => id.toString());
    const removedStudents = existingStudentIds.filter(id => !student_ids.includes(id.toString()));
    
    if (removedStudents.length > 0) {
      const attemptedAssessments = await AttemptedAssessment.find({
        assessment_id,
        student_id: { $in: removedStudents }
      }).populate('student_id', 'first_name last_name');

      if (attemptedAssessments.length > 0) {
        const studentNames = attemptedAssessments.map(a => `${a.student_id.first_name} ${a.student_id.last_name}`);
        return res.status(400).json({
          success: false,
          message: `Cannot remove students who have started: ${studentNames.join(', ')}`
        });
      }
    }

    // 3. Track all version IDs
    const usedVersionIds = new Set();
    const originalToVersionMap = new Map();
    const lessonToLcMap = new Map();

    // For asset tracking
    const contentDirectoryCache = new Map();

    // Utility to create new content directory for a given LC
    const ensureContentDirectory = async (learningContentId, oldContentDir) => {
      if (contentDirectoryCache.has(learningContentId)) {
        return contentDirectoryCache.get(learningContentId);
      }

      const randomString = randomStr.generate({
        length: 8,
        charset: "alphabetic",
      });
      const newDir = "lc_" + randomString + Date.now();
      const newDirPath = `./assets/LearningContent/${newDir}`;
      if (!fs.existsSync(newDirPath)) {
        await fs.promises.mkdir(newDirPath, { recursive: true });
      }

      contentDirectoryCache.set(learningContentId, { old: oldContentDir, new: newDir });
      return { old: oldContentDir, new: newDir };
    };


    // Helper for version creation with asset copying
    const getOrCreateVersion = async (originalModel, versionModel, originalId, parentLcId = null) => {
      const cacheKey = `${versionModel.modelName}-${originalId}`;
      if (originalToVersionMap.has(cacheKey)) {
        return versionModel.findById(originalToVersionMap.get(cacheKey));
      }

      if (mysqlOrm.Types.ObjectId.isValid(originalId)) {
        const existingVersion = await versionModel.findById(originalId);
        if (existingVersion) {
          originalToVersionMap.set(cacheKey, existingVersion._id);
          return existingVersion;
        }
      }

      const original = await originalModel.findById(originalId);
      if (!original) return null;

      const versionNumber = await versionModel.countDocuments({ original_id: originalId }) + 1;
      const versionData = original.toObject();
      delete versionData._id;

      if (versionModel.modelName === "learning_content_versions") {
        versionData.lesson_ids = [];
        const { old, new: newDir } = await ensureContentDirectory(originalId, versionData.content_directory);

        if (versionData.thumbnail) {
          const newThumb = Date.now() + "-" + versionData.thumbnail.split("-").slice(1).join("-");
          await globalHelper.copyAnyFile(`./assets/LearningContent/${old}/${versionData.thumbnail}`, `./assets/LearningContent/${newDir}/${newThumb}`);
          versionData.thumbnail = newThumb;
        }

        versionData.content_directory = newDir;
      }

      if (versionModel.modelName === "lesson_versions") {
        versionData.practice_ids = [];
        versionData.challenge_ids = [];
      }

      if (versionModel.modelName === "practices_versions") {
        const lc = contentDirectoryCache.get(parentLcId);
        if (!lc) return null;

        const oldDir = lc.old;
        const newDir = lc.new;

        if (versionData.question_image) {
          const newImage = Date.now() + "-" + versionData.question_image.split("-").slice(1).join("-");
          await globalHelper.copyAnyFile(`./assets/LearningContent/${oldDir}/${versionData.question_image}`, `./assets/LearningContent/${newDir}/${newImage}`);
          versionData.question_image = newImage;
        }

        if (versionData.question_audio) {
          const newAudio = Date.now() + "-" + versionData.question_audio.split("-").slice(1).join("-");
          await globalHelper.copyAnyFile(`./assets/LearningContent/${oldDir}/${versionData.question_audio}`, `./assets/LearningContent/${newDir}/${newAudio}`);
          versionData.question_audio = newAudio;
        }

        versionData.options = await Promise.all(
          versionData.options.map(async (opt) => {
            let newOptImage = "";
            if (opt.option_image) {
              newOptImage = Date.now() + "-" + opt.option_image.split("-").slice(1).join("-");
              await globalHelper.copyAnyFile(`./assets/LearningContent/${oldDir}/${opt.option_image}`, `./assets/LearningContent/${newDir}/${newOptImage}`);
            }
            return {
              ...opt,
              option_image: newOptImage,
              _id: new mysqlOrm.Types.ObjectId()
            };
          })
        );

        versionData.content_directory = newDir;
      }
        const newVersion = await versionModel.create({
        ...versionData,
        original_id: originalId,
        version: versionNumber,
        created_at: new Date(),
        updated_at: new Date(),
      });

      originalToVersionMap.set(cacheKey, newVersion._id);
      return newVersion;
    };

    // 4. Process content and build version references
    const contentMap = new Map();

    // for (const content of selected_contents) {
    //   const [learningContentRef, lessonRef, contentType, contentRef] = content.split("--");
      
    //   try {
    //     // Get/create content version first
    //     let contentVersion;
    //     if (contentType === "practice") {
    //       contentVersion = await getOrCreateVersion(Practice, PracticeVersions, contentRef);
    //     } else {
    //       contentVersion = await getOrCreateVersion(Challenge, ChallengeVersions, contentRef);
    //     }
    //     if (!contentVersion) continue;
    //     usedVersionIds.add(contentVersion._id.toString());

    //     // Get/create lesson version
    //     const lessonVersion = await getOrCreateVersion(Lesson, LessonVersions, lessonRef);
    //     if (!lessonVersion) continue;
    //     usedVersionIds.add(lessonVersion._id.toString());
    
    //     // Update lesson version with content reference
    //     const updateOperation = contentType === "practice" 
    //       ? { $addToSet: { practice_ids: contentVersion._id } }
    //       : { $addToSet: { challenge_ids: contentVersion._id } };
        
    //     await LessonVersions.findByIdAndUpdate(lessonVersion._id, updateOperation);

    //     // Get/create learning content version
    //     const lcVersion = await getOrCreateVersion(LearningContent, LearningContentVersions, learningContentRef);
    //     if (!lcVersion) continue;
    //     usedVersionIds.add(lcVersion._id.toString());

    //     // Update LC version with lesson reference
    //     if (!lcVersion.lesson_ids.includes(lessonVersion._id)) {
    //       await LearningContentVersions.findByIdAndUpdate(
    //         lcVersion._id,
    //         { $addToSet: { lesson_ids: lessonVersion._id } }
    //       );
    //     }

    //     // Track lesson to LC mapping
    //     lessonToLcMap.set(lessonVersion._id.toString(), lcVersion._id);

    //     // Build assessment content structure
    //     const contentKey = `${lcVersion._id}-${lessonVersion._id}`;
    //     let contentEntry = contentMap.get(contentKey);
        
    //     if (!contentEntry) {
    //       contentEntry = {
    //         learning_content_id: lcVersion._id,
    //         lessons: []
    //       };
    //       contentMap.set(contentKey, contentEntry);
    //     }

    //     let lessonEntry = contentEntry.lessons.find(l => l.lesson_id.equals(lessonVersion._id));
    //     if (!lessonEntry) {
    //       lessonEntry = {
    //         lesson_id: lessonVersion._id,
    //         practice_ids: [],
    //         challenges_ids: []
    //       };
    //       contentEntry.lessons.push(lessonEntry);
    //     }

    //     if (contentType === "practice") {
    //       if (!lessonEntry.practice_ids.some(id => id.equals(contentVersion._id))) {
    //         lessonEntry.practice_ids.push(contentVersion._id);
    //       }
    //     } else {
    //       if (!lessonEntry.challenges_ids.some(id => id.equals(contentVersion._id))) {
    //         lessonEntry.challenges_ids.push(contentVersion._id);
    //       }
    //     }
    //   } catch (err) {
    //     console.error(`Error processing content ${content}:`, err);
    //     continue;
    //   }
    // }

    for (const raw of selected_contents) {
      const [lcId, lessonId, type, contentId] = raw.split("--");

      const lcVersion = await getOrCreateVersion(LearningContent, LearningContentVersions, lcId);
      const lessonVersion = await getOrCreateVersion(Lesson, LessonVersions, lessonId);
      const contentVersion = await getOrCreateVersion(
        type === "practice" ? Practice : Challenge,
        type === "practice" ? PracticeVersions : ChallengeVersions,
        contentId,
        lcId
      );

      if (!lcVersion || !lessonVersion || !contentVersion) continue;

      usedVersionIds.add(lcVersion._id.toString());
      usedVersionIds.add(lessonVersion._id.toString());
      usedVersionIds.add(contentVersion._id.toString());

      // Add lesson ref to LC
      await LearningContentVersions.findByIdAndUpdate(lcVersion._id, {
        $addToSet: { lesson_ids: lessonVersion._id }
      });

      // Add practice/challenge ref to lesson
      await LessonVersions.findByIdAndUpdate(lessonVersion._id, {
        $addToSet: {
          [type === "practice" ? "practice_ids" : "challenge_ids"]: contentVersion._id
        }
      });

      const key = lcVersion._id.toString();
      if (!contentMap.has(key)) {
        contentMap.set(key, { learning_content_id: lcVersion._id, lessons: [] });
      }

      const lessonList = contentMap.get(key).lessons;
      let lessonEntry = lessonList.find((l) => l.lesson_id.equals(lessonVersion._id));
      if (!lessonEntry) {
        lessonEntry = {
          lesson_id: lessonVersion._id,
          practice_ids: [],
          challenges_ids: []
        };
        lessonList.push(lessonEntry);
      }

      if (type === "practice") {
        lessonEntry.practice_ids.push(contentVersion._id);
      } else {
        lessonEntry.challenges_ids.push(contentVersion._id);
      }
    }

    // 5. Clean up unused versions and orphaned references
    const previousVersionIds = new Set();
    
    const collectVersionIds = (content) => {
      previousVersionIds.add(content.learning_content_id.toString());
      content.lessons.forEach(lesson => {
        previousVersionIds.add(lesson.lesson_id.toString());
        lesson.practice_ids.forEach(id => previousVersionIds.add(id.toString()));
        lesson.challenges_ids.forEach(id => previousVersionIds.add(id.toString()));
      });
    };

    existingAssessment.content.forEach(collectVersionIds);

    const unusedVersionIds = [...previousVersionIds].filter(id => !usedVersionIds.has(id));
    console.log('unusedVersionIds',unusedVersionIds);

    // Clean up orphaned references in LC versions
    for (const [lessonId, lcId] of lessonToLcMap) {
      if (!usedVersionIds.has(lessonId)) {
        await LearningContentVersions.findByIdAndUpdate(
          lcId,
          { $pull: { lesson_ids: lessonId } }
        );
      }
    }

    // Delete unused versions
    if (unusedVersionIds.length > 0) {
      await Promise.all([
        LearningContentVersions.deleteMany({ _id: { $in: unusedVersionIds } }),
        LessonVersions.deleteMany({ _id: { $in: unusedVersionIds } }),
        PracticeVersions.deleteMany({ _id: { $in: unusedVersionIds } }),
        ChallengeVersions.deleteMany({ _id: { $in: unusedVersionIds } })
      ]);
    }

    // 6. Convert map to final content array
    const updatedContent = Array.from(contentMap.values());

    // 7. Handle student updates
    const newStudentAssessments = await Promise.all(
      student_ids
        .filter(id => !existingStudentIds.includes(id.toString()))
        .map(studentId => 
          StudentAssessment.create({
            assessment_id,
            student_id: studentId,
            status: "N/A"
          })
        )
    );

    // Get existing student assessment IDs to keep
    const existingStudentAssessmentsToKeep = existingAssessment.student_assessment_ids
      .filter(sa => student_ids.includes(sa.student_id.toString()))
      .map(sa => sa._id);

    // 8. Update assessment
    const updatedAssessment = {
      name,
      apply_duration: apply_duration === "1",
      tutor_id: tutorId,
      task_types,
      student_ids,
      date,
      content: updatedContent,
      student_assessment_ids: [
        ...existingStudentAssessmentsToKeep,
        ...newStudentAssessments.map(sa => sa._id)
      ],
      updated_at: new Date()
    };

    await Assessment.findByIdAndUpdate(assessment_id, updatedAssessment);

    // Remove assessments for removed students
    if (removedStudents.length > 0) {
      await StudentAssessment.deleteMany({
        assessment_id,
        student_id: { $in: removedStudents }
      });
    }

    req.flash("success", "Assessment updated successfully!");
    return res.status(200).json({
      success: true,
      message: "Assessment updated successfully!",
      redirectUrl: "/assessments"
    });

  } catch (error) {
    console.error("Error in assessment update:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later."
    });
  }
}
/**
 * destroy assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
      const assessmentId = mysqlOrm.Types.ObjectId(req.params.id);
  
      // Delete related tutor assessments
      await StudentAssessment.deleteMany({ assessment_id: assessmentId });
  
      // Fetch the assessment document
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        return res.status(404).json({ success: false, message: "Assessment not found." });
      }
  
      // Collect all versioned document IDs
      const contentIds = [];
      const lessonIds = [];
      const practiceIds = [];
      const challengeIds = [];
      const slideIds = [];
      const contentDirNames = [];
  
      for (const contentItem of assessment.content || []) {
        if (contentItem.learning_content_id) {
          contentIds.push(contentItem.learning_content_id);
  
          // Fetch the content doc to get content_directory
          const versionContent = await LearningContentVersions.findById(contentItem.learning_content_id);
          if (versionContent?.content_directory) {
            contentDirNames.push(versionContent.content_directory);
          }
        }
  
        for (const lesson of contentItem.lessons || []) {
          if (lesson.lesson_id) lessonIds.push(lesson.lesson_id);
          if (lesson.practice_ids?.length) practiceIds.push(...lesson.practice_ids);
          if (lesson.challenges_ids?.length) challengeIds.push(...lesson.challenges_ids);
          // if (lesson.slide_ids?.length) slideIds.push(...lesson.slide_ids);
        }
      }
  
      // Delete content directories
      for (const dirName of contentDirNames) {
        const dirPath = path.join(__dirname, '../../assets/LearningContent', dirName);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      }
  
      // Delete all related versioned documents
      if (lessonIds.length) await LessonVersions.deleteMany({ _id: { $in: lessonIds } });
      if (practiceIds.length) await PracticeVersions.deleteMany({ _id: { $in: practiceIds } });
      if (challengeIds.length) await ChallengeVersions.deleteMany({ _id: { $in: challengeIds } });
      // if (slideIds.length) await SlideVersion.deleteMany({ _id: { $in: slideIds } });
      if (contentIds.length) await LearningContentVersions.deleteMany({ _id: { $in: contentIds } });
  
      // Finally delete the assessment
      await Assessment.findByIdAndDelete(assessmentId);
      
      req.flash("success", "Assessment is deleted successfully.");
      return res.status(200).json({
        success: true,
        redirectUrl: "/assessments",
        message: "Assessment is deleted successfully.",
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

// Take an assessment Functions..................................

/**
 * load assessment lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function loadAssessmentLessons(req, res) {
  try {
    let assessmentId = mysqlOrm.Types.ObjectId(req.body.assessmentId);
    let results = await Assessment.find({ _id: assessmentId })
      .populate({
        path: "content.learning_content_id",
        model: "learning_content_versions",
      })
      .populate({
        path: "content.lessons.lesson_id",
        model: "lesson_versions",
      });
    let html = "";
    const user_detail = res.locals.loggedUserInfo;
    let userId = user_detail._id.toString();
    let studentId = mysqlOrm.Types.ObjectId(userId);
    if (results[0].content.length > 0) {
      for (learningContent of results[0].content) {
        let lessons = learningContent.lessons;
        let learningContentSlug = learningContent.learning_content_id.slug;
        for (lesson of lessons) {
          let filteredPractices = lesson.practice_ids.filter((practiceId) =>
            lesson.lesson_id.practice_ids.includes(practiceId)
          );
          let filteredChallenges = lesson.challenges_ids.filter((challengeId) =>
            lesson.lesson_id.challenge_ids.includes(challengeId)
          );

          let totalTask =
            filteredChallenges.length + (filteredPractices.length > 0);
          let attemptedTask = await AttemptedAssessment.countDocuments({
            student_id: studentId,
            assessment_id: assessmentId,
            lesson_id: lesson.lesson_id.id,
          });

          let attemptedTaskStatus = (attemptedTask / totalTask) * 100;
          let formattedAttemptedTaskStatus = attemptedTaskStatus;
          if (Number.isInteger(attemptedTaskStatus) == false) {
            formattedAttemptedTaskStatus = attemptedTaskStatus.toFixed(2);
          } else {
            formattedAttemptedTaskStatus = attemptedTaskStatus;
          }
          html += template.render({
              loggedUserRole: user_detail.role,
              assessmentId: assessmentId,
              attemptedTaskStatus: formattedAttemptedTaskStatus,
              learningContentSlug: learningContentSlug,
              lesson: lesson.lesson_id,
              totalPractices:
                filteredPractices.length > 0 ? filteredPractices.length : 0,
              totalChallenges:
                filteredChallenges.length > 0 ? filteredChallenges.length : 0,
            },"/learningContent/lesson/assessmentLessonListing.ejs"
          );
        }
      }
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
 * load assessment lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function loadAssessmentLessonTasks(req, res) {
  try {
    let lessonId = mysqlOrm.Types.ObjectId(req.body.lessonId);
    let assessmentId = mysqlOrm.Types.ObjectId(req.body.assessmentId);
    const user_detail = res.locals.loggedUserInfo;
    let studentId = mysqlOrm.Types.ObjectId(user_detail._id);
    let totalChallengeCount = 0;

    const assessment = await Assessment.aggregate([
      {
        $match: { _id: assessmentId }
      },
      {
        $unwind: "$content"
      },
      {
        $match: { "content.lessons.lesson_id": lessonId }
      },
      {
        $project: {
          lesson: {
            $first: "$content.lessons" // Assuming there can only be one matching lesson
          }
        }
      }
    ]);

    if (assessment.length > 0) {
      const filteredLesson = assessment[0].lesson;
      if(filteredLesson.challenges_ids != null){
        totalChallengeCount = filteredLesson.challenges_ids.length;
      }
    }

    let attemptedAssessmentDetail = await AttemptedAssessment.find({
      lesson_id: lessonId,
      student_id: studentId,
      assessment_id: assessmentId,
    });
    
    let resultObject = {
      practices:{status:'Start',correct:0,percentage:0,isAttempted:false,countTextQuestion:0},
      challenges:{status:'Start',correct:0,percentage:0,isAttempted:false,totalChallenge:0},
    };
    let challengeCount = 0;
    for(let data of attemptedAssessmentDetail){
      if(data.assessment_type =='challenges'){
        challengeCount++;
        let answers = data.answers;
        let correct = 0;
        for(let answer of answers){
          if(answer.isCorrect){
            correct++;
          }
        }
        let percentage = 0;
        if(challengeCount >0){
          percentage = (parseInt(challengeCount)/parseInt(totalChallengeCount))*100;
        }
        if(Number.isInteger(percentage) == false) {
          percentage = percentage.toFixed(2);
        }  
        if (isNaN(percentage)) {
          percentage  = 0;
        }
        resultObject.challenges = {correct:correct,percentage:percentage,isAttempted:true}
      }else if(data.assessment_type =='practices'){
        let answers = data.answers;
        let correct = 0;
        let inCorrect = 0;
        for(let answer of answers){
          if(answer.isCorrect){
            correct++;
          }else if(answer.isCorrect === false){
            inCorrect++;
          }
        }

        const countTextQuestion = answers.filter(question => question.type === 'text' && question.isCorrect === '').length;

        let percentage = (parseInt(correct)/(parseInt(correct)+parseInt(inCorrect)))*100;
        if(Number.isInteger(percentage) == false) {
          percentage = percentage.toFixed(2);
        }  
        if (isNaN(percentage)) {
          percentage  = 0;
        }
        resultObject.practices = {status:data.status,correct:correct,percentage:parseInt(percentage),isAttempted:true, countTextQuestion:countTextQuestion}
      }
    }
    let challengeStatus = 'Start';
    if(challengeCount > 0){
      challengeStatus = 'Processing';
    }
    if(challengeCount == totalChallengeCount){
      challengeStatus = 'Completed';
    }
    resultObject.challenges.status = challengeStatus;
    resultObject.challenges.totalChallenge = challengeCount;
    return res.status(200).json({
      success: true,
      data:resultObject,
      redirectUrl: "/assessments",
      message: "Assessment is data fetched successfully.",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/*
 * upload an attachment for text type practice.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function uploadAttachment(req, res) {
  try {
    let fileName = req.files[0].filename;
    res.status(200).json({
      success: true,
      message: "The Attachment uploaded successfully!",
      file: fileName,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * submit an assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function submitAnAssessment(req, res) {
  try {
    let assessmentType = req.body.assessmentType;
    let response = '';
    if (assessmentType !== "challenges") {
      response = await SubmitPracticeAssessment(req, res);
    }else if(assessmentType === "challenges"){
      response = await SubmitChallengeAssessment(req, res);
    }
    if(response){
      return res.status(200).json({
        success: true,
        redirectUrl: "/assessments",
        message: "The assessment is submitted successfully.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      redirectUrl: "page-reload",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * SubmitPracticeAssessment
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function SubmitPracticeAssessment(req, res) {
  try {
    let assessmentData = req.body.assessmentDetail;

    if (Array.isArray(assessmentData) && assessmentData.length > 0) {
      let assessmentId = req.body.assessmentId;
      let lessonId = req.body.lessonId;
      const user_detail = res.locals.loggedUserInfo;
      let userId = user_detail._id.toString();

      // Check if an existing attempt exists for this student
      const existingAttempt = await AttemptedAssessment.findOne({
        assessment_id: assessmentId,
        student_id: userId,
        lesson_id: lessonId,
        challenge_id: null,
      });

      let allQuestion = [];
      let haveTextTypeQuestion = false;

      for (let question of assessmentData) {
        if (existingAttempt) {
          const existingAnswer = existingAttempt.answers.find(
            (a) => a.questionId.toString() === question.questionId.toString()
          );
          if (existingAnswer && existingAnswer.isCorrect === true) {
            allQuestion.push(JSON.parse(JSON.stringify(existingAnswer)));
            continue;
          }
        }

        let correctOption = [];
        let practiceData = await PracticeVersions.findById(question.questionId, {
          question_type: 1,
          options: 1,
        });

        if (practiceData && practiceData.question_type != 'text') {
          for (options of practiceData.options) {
            if (options.option_correct) {
              if (
                practiceData.question_type == 'single_select' ||
                practiceData.question_type == 'multi_select'
              ) {
                correctOption.push(options.id);
              } else if (practiceData.question_type == 'drag_and_drop') {
                correctOption.push(options.option_text);
              }
            }
          }

          if (JSON.stringify(correctOption) == JSON.stringify(question.submittedAnswer)) {
            question.isCorrect = true;
          } else {
            question.isCorrect = false;
          }
        } else {
          haveTextTypeQuestion = true;
        }

        allQuestion.push(question);
      }

      const correctQuestion = allQuestion.filter((q) => q.isCorrect === true).length;
      const hasTextType = haveTextTypeQuestion
        ? assessmentData.some((item) => item.type === 'text')
        : false;

      const totalQuestion = allQuestion.length;
      let percentage = (correctQuestion / totalQuestion) * 100;
      if (!Number.isInteger(percentage)) {
        percentage = percentage.toFixed(2);
      }

      let response;

      if (existingAttempt) {
        response = await AttemptedAssessment.findByIdAndUpdate(
          existingAttempt._id,
          {
            answers: allQuestion,
            percentage: percentage,
            status: hasTextType ? 'Processing' : 'Completed',
            total_attempted_question: allQuestion.length,
            total_correct_answer: correctQuestion,
          },
          { new: true }
        );
      } else {
        const createObject = {
          assessment_id: assessmentId,
          student_id: userId,
          lesson_id: lessonId,
          answers: allQuestion,
          percentage: percentage,
          status: hasTextType ? 'Processing' : 'Completed',
          assessment_type: 'practices',
          total_attempted_question: allQuestion.length,
          total_correct_answer: correctQuestion,
        };
        response = await AttemptedAssessment.create(createObject);
      }

      if (response) {
        await manageAssessmentStatus(assessmentId, userId);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
}

/**
 * SubmitChallengeAssessment
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function SubmitChallengeAssessment(req, res){
  try{
      // Logged user ID 
    const user_detail = res.locals.loggedUserInfo;
    const userId = user_detail._id.toString(); 

      // Destructure request body for clarity and efficiency
    const { assessmentId, lessonId, challengeId, challengeAttempts } = req.body;

      // Calculate total answers and correct answers efficiently
    const totalAttempts = challengeAttempts.length;
    const totalCorrectAttempts = challengeAttempts.filter(answer => answer.isCorrect === 'true').length;

    let percentage = (totalCorrectAttempts/totalAttempts)*100;
    if(percentage)
    if(Number.isInteger(percentage) === false){
      percentage = percentage.toFixed(2);
    }
    
      // Create assessment attempt object, ensuring consistent formatting
    const assessmentObject = {
      assessment_id: assessmentId,
      student_id: userId,
      lesson_id: lessonId,
      assessment_type:'challenges',
      challenge_id:challengeId,
      answers: challengeAttempts,
      total_attempted_question:totalAttempts,
      total_correct_answer:totalCorrectAttempts,
      percentage:percentage,
      status:'Completed',
    };

    const storedAttempt  = await AttemptedAssessment.create(assessmentObject);
    if(storedAttempt){
      await manageAssessmentStatus(assessmentId, userId, lessonId, "challenges");
      return true;
    }
    return false;
  }catch(error){
    console.error('Error storing challenge attempt:', error);
    return false;
  }
}

/**
 * manageAssessmentStatus
 * @param {*} assessmentId 
 * @param {*} studentId 
 * @returns 
 */
async function manageAssessmentStatus(assessmentId,studentId){
  try{
    let assessment = await Assessment.findById(assessmentId);
    let content = assessment.content;
    let requiredAssessmentCount = 0;
    let totalChallengeQuestions = 0 ;
    let totalCorrectChallengeAnswers = 0 ;
    let totalPracticeQuestions = 0 ;
    let totalCorrectPracticeAnswers = 0 ;
    let havePractice = 0;
    let haveChallenge = 0;
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
      'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),
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
      'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),
      'student_id': mysqlOrm.Types.ObjectId(studentId),
    },updateObject);
    
    if(updatedData){
      let studentAssessments = await StudentAssessment.find({'assessment_id': mysqlOrm.Types.ObjectId(assessmentId)});
      let studentStatusArray = studentAssessments.map(item => item.status);
      let isNotAttempted = studentStatusArray.every(value => value === "N/A");
      let isCompleted = studentStatusArray.every(value => value === "Completed");
      let status = 'Processing';
      if(isNotAttempted){
        status = 'N/A';
      }else if(isCompleted){
        status = 'Completed';
      }
      let updatedAssessmentStatus = await Assessment.findByIdAndUpdate(assessmentId,{status:status});
    
      return updatedAssessmentStatus; 
    }
  } catch(error){
    console.log(error);
   return error;
  }
}

/*
 * save practice assessment answers.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function saveAndQuitAssessmentQuestion(req, res) {
  try {
    let attemptedQuestion = req.body.getData;
    let assessmentId = req.body.assessment_id;
    let lessonId = req.body.lesson_id;
    const user_detail = res.locals.loggedUserInfo;
    let studentId = user_detail._id.toString();
    const filteredData = attemptedQuestion;
    const object = {
      student_id: studentId,
      assessment_id: assessmentId,
      lesson_id: lessonId,
      answers: filteredData,
    };
    let isExistAssessment = await SavedAssessment.find({
      assessment_id: assessmentId,
      lesson_id: lessonId,
      student_id: studentId,
    });
    if (isExistAssessment.length) {
      let savedAssessmentId = isExistAssessment[0].id;
      let deletedExistingAssessment = await SavedAssessment.findByIdAndDelete(
        savedAssessmentId
      );
    }
    let response = await SavedAssessment.create(object);
    res
      .status(200)
      .json({ success: true, message: "The Assessment saved successfully!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * updateStatusOnAssessmentAttempt
 * @param {*} assessment_id
 * @param {*} student_id
 * @returns
 */
async function updateStatusOnAssessmentAttempt(
  assessment_id,
  student_id,
  haveTextTypeQuestion
) {
  try {
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
        totalCount =
          parseInt(totalCount) +
          parseInt(practiceCount) +
          parseInt(challengeCount);
      }
    }
    let status = "Processing";
    if (
      AttemptedAssessmentData.length == totalCount &&
      haveTextTypeQuestion === false
    ) {
      status = "Completed";
    }
    return status;
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

//--------Filter Functions.................................................................

/**
 * filter lessons by learningContent.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function filterLessonsByLearningContent(req, res) {
  try {
    let matchState;   
    if(req.body.assessment_types.length == 2){
      matchState = { $and: [{ practice_ids: { $gt: [] } }, { challenge_ids: { $gt: [] } }] };
    }

    if(req.body.assessment_types.length == 1 && req.body.assessment_types[0] == 1){
      matchState = { $and: [{ practice_ids: { $gt: [] } }] };
    }

    if(req.body.assessment_types.length == 1 && req.body.assessment_types[0] == 2){
      matchState = { $and: [{ challenge_ids: { $gt: [] } }] };
    }

    const learningContentId = req.body.learningContent_id;
    const learningContent = await LearningContent.find({_id: learningContentId,}, '_id lesson_ids').populate({
      path: "lesson_ids",
      model: "lessons",
      match: matchState,
      select: "_id, title",
      options: { sort: { position: 1, created_at: 1 } },
    });

    let allLesson = [];
    let lessonsLength = learningContent[0].lesson_ids.length;
    if (lessonsLength > 0) {
      for (lesson of learningContent[0].lesson_ids) {
        allLesson.push(lesson);
      }
    }
    return res.send(allLesson);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * filter students.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function filterStudents(req, res) {
  try {
    let grade_id = mysqlOrm.Types.ObjectId(req.body.grade_id);
    let students = await User.find(
      { role: 3, status: 1, grade_id: grade_id, isDeleted: false },
      { id: 1, first_name: 1, last_name: 1, status: 1 }
    );
    return res.send(students);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}