const mysqlOrm = require('mysql-orm');
const globalHelper = require("../../_helper/GlobalHelper");
const template = require("../../config/template");
const Topic = require("../../models/Topic");
const User = require('../../models/User');
const Grade = require("../../models/Grade");
const TutorTrainingContent = require("../../models/TutorTrainingContent");
const TutorTrainingLesson = require("../../models/TutorTrainingLesson");
const TutorTrainingAssessment = require("../../models/TutorTrainingAssessment");
const TutorTrainingPractice = require("../../models/TutorTrainingPractice");
const TutorAssessments = require("../../models/TutorAssessments");
const TutorAttemptedAssessments = require("../../models/TutorAttemptedAssessments");

const TutorTrainingVersionContent = require("../../models/TutorTrainingVersionContent");
const TutorTrainingVersionLesson = require("../../models/TutorTrainingVersionLesson");
const TutorTrainingVersionPractice = require("../../models/TutorTrainingVersionPractice");
const TutorTrainingVersionSlide = require("../../models/TutorTrainingVersionSlide");
const randomStr = require("randomstring");
const path = require("path");


module.exports = {
  index,
  dataTable,
  create,
  store,
  edit,
  update,
  destroy,

  renderTrainingContents,
  renderTrainingContentLessons,

  loadAssignedLessons,
  viewSingle,
  loadAssessmentLessonTasks,
  submitTutorAssessmentSlides,
  submitTutorAssessmentPractices,
  uploadAttachment,
  assessmentDetailedReport,
};

/**
 * listing assign tutor training assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function index(req,res){
  try{
    let obj = {};
    const user_detail = res.locals.loggedUserInfo;
    let userId = user_detail._id.toString();
    let trainingAssessmentObject = {};
    const tutorTrainingContent = await TutorTrainingVersionContent.find({status:1}, '_id, title').sort({ _id: -1 });
    const trainingAssessments = await TutorTrainingAssessment.find(obj, '_id, name').sort({ name: 1 });

    if (user_detail.role == 2) {
      if (attachedTutorTrainingAssessmentIds && attachedTutorTrainingAssessmentIds.length > 0) {
        obj["_id"] = { $in: attachedTutorTrainingAssessmentIds };
      }else{
        obj["_id"] =  user_detail.id;
      }

      let totalAssessments = 0;
      let completedAssessments = 0;
      let processingAssessments = 0;
      let notCompleted = 0;
      let filterCompleted = 0;
      let filterProcessing = 0;

      totalAssessments = await TutorTrainingAssessment.find(obj).sort({ _id: -1 }).count();
      completedAssessments = await TutorTrainingAssessment.find(obj).populate({
        path: "tutor_assessment_ids",
        model: "tutor_assessments",
        match: { tutor_id: userId, status: "Completed", },
      });

      processingAssessments = await TutorTrainingAssessment.find(obj).populate({
        path: "tutor_assessment_ids",
        model: "tutor_assessments",
        match: { tutor_id: userId, status: "Processing", },
      });
   
      filterCompleted = completedAssessments.filter(
        (data) => data.tutor_assessment_ids.length > 0
      ).length;
      filterProcessing = processingAssessments.filter(
        (data) => data.tutor_assessment_ids.length > 0
      ).length;
      notCompleted = totalAssessments - filterCompleted - filterProcessing;
      trainingAssessmentObject = {
        total: totalAssessments,
        completed: filterCompleted,
        not_completed: notCompleted,
        pending: filterProcessing,
      };

    }else{
      totalAssessments = await TutorTrainingAssessment.find({}).count();
      completedAssessments = await TutorTrainingAssessment.find({status:"Completed"}).count();;
      processingAssessments = await TutorTrainingAssessment.find({status:"Processing"}).count();
      notCompleted = await TutorTrainingAssessment.find({status:"N/A"}).count();

      trainingAssessmentObject = {
        total: totalAssessments,
        completed: completedAssessments,
        pending: processingAssessments,
        not_completed: notCompleted,
      };
    }

    let tutors = await User.find(
      { role: 2, isDeleted: false  },
      "_id role first_name last_name"
    ).sort({ first_name: 1 });
    
    return res.render("../views/admin/tutorTrainingAssessment/",
      { userRole: user_detail.role, 
        userId: userId, 
        tutors: tutors,
        trainingAssessmentObject: trainingAssessmentObject,
        trainingAssessments : trainingAssessments,
        tutorTrainingContent: tutorTrainingContent
      });
  }catch(error){
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * dataTable assign tutor training assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function dataTable(req,res){
  try{
    let searchStr = req.body.search.value;
    let obj = {};
    let countProgram = {};
    const user_detail = res.locals.loggedUserInfo;
    let userRole = user_detail.role;
    let userId = user_detail._id.toString();
    let selectedTutorId = req.body.selectedTutorId;

    if (req.body.training_assessment_id) {
      obj["_id"] = req.body.training_assessment_id;
    }
    if(req.body.training_content_id){
      obj["content.training_content_id"] = req.body.training_content_id;
    }

    // to fetch for assign tutor data
    if (userRole == 2) {
      obj["tutor_ids"] = { $in: [mysqlOrm.Types.ObjectId(userId)] };
    }else{
      if(req.body.selectedTutorId != undefined && req.body.selectedTutorId != '' && req.body.selectedTutorId != null){
        obj["tutor_ids"] = { $in: [mysqlOrm.Types.ObjectId(selectedTutorId)] };
      }

      if(req.body.status){
        obj["status"] = req.body.status;
      }
    }

    var recordsTotal = 0;
    var recordsFiltered = 0;
    if (req.body.search.value) {
      var regex = new RegExp(req.body.search.value, "i")
      searchStr = { $or: [{ 'name': regex }] };
    }
    else {
        searchStr = {};
    }
    
    const filter = [
      "name",
    ];

    column_name = "_id";
    order_by = -1;

    if(req.body.order !== undefined){
      column_name = filter[req.body.order[0].column];
      order_by = req.body.order[0].dir;
    }
    let results = '';
    if(userRole ==1){
      recordsTotal = await TutorTrainingAssessment.count(countProgram);
      recordsFiltered = await TutorTrainingAssessment.count({ $and: [obj, searchStr] });
      results = await TutorTrainingAssessment.find({ $and: [obj, searchStr] }, '_id name content status slug', { 'skip': Number(req.body.start), 'limit': Number(req.body.length) }).populate('content.training_content_id').populate('tutor_ids').populate('tutor_assessment_ids').sort({ [column_name]: order_by });
    }else{
      let statusObj = {};
      if(req.body.status){
        statusObj["status"] = req.body.status;
        statusObj["tutor_id"] =  mysqlOrm.Types.ObjectId(userId);
      }
      countProgram["tutor_ids"] = { $in: [mysqlOrm.Types.ObjectId(userId)] };
      recordsTotal = await TutorTrainingAssessment.count(countProgram);
      recordsFiltered = await TutorTrainingAssessment.count({ $and: [obj, searchStr] });
      results = await TutorTrainingAssessment.find(
        {
          $and: [
            obj, 
            searchStr, 
          ]
        },
        '_id name content status slug',
        { 'skip': Number(req.body.start), 'limit': Number(req.body.length) }
      )
      .populate('content.training_content_id')
      .populate('tutor_ids')
      .populate({
        path: 'tutor_assessment_ids',
        match: statusObj,
      })
      .sort({ [column_name]: order_by });

      const filteredAssessments = results.filter(assessment => assessment.tutor_assessment_ids.length > 0);
      results = filteredAssessments;
    }
    
    const data = JSON.stringify({
      "draw": req.body.draw,
      "recordsFiltered": recordsFiltered,
      "recordsTotal": recordsTotal,
      "data": results,
    });
    
  return res.send(data);
  }catch(error){
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }
}
  
/**
 * create an assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function create(req,res){
  try{
    const activeTopics = await Topic.find({ "status": 1,"isDeleted":false  }).sort({ 'name': 1 });
    const activeGrades = await Grade.find({ "status": 1,"isDeleted":false  }).sort({ 'name': 1 });
    const users = await User.find({"role": 2, "status": 1, "isDeleted": false}).sort({'first_name': 1 });
    return res.render("../views/admin/tutorTrainingAssessment/create",{tutors: users, grades :activeGrades, topics: activeTopics});
  }catch(error){
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }
}
    
/**
 * store an assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function store(req,res){
  const session = await mysqlOrm.startSession();
  session.startTransaction();
  try{
    const { tutor_ids, selected_contents, name } = req.body;
    const tutors = Array.isArray(tutor_ids) ? tutor_ids : [tutor_ids];
    let trainingContent = [];
    for (content of selected_contents) {
      let data = content.split("--");
      let getLessonDetail = await TutorTrainingLesson.findById(data[1]);
      
      let lessonObject = {
          lesson_id: mysqlOrm.Types.ObjectId(data[1]),
          slide_ids: getLessonDetail.slide_ids,
          practice_ids: getLessonDetail.practice_ids,
        };

      let obj = {
        lessons: lessonObject,
        training_content_id: data[0],
      }
      trainingContent.push(obj);
    }

    const uniqueContent = trainingContent.reduce((acc, curr) => {
      const existingObj = acc.find(item => item.training_content_id === curr.training_content_id);
      if (existingObj) {
          existingObj.lessons.push(curr.lessons);
      } else {
          acc.push({
              lessons: [curr.lessons],
              training_content_id: curr.training_content_id
          });
      }
      return acc;
    }, []);

    // Process versioning
    const versionContent = [];
    
    for (const item of uniqueContent) {
      const selectedLessonIds = item.lessons.map(lesson => lesson.lesson_id);

      const originalContent = await TutorTrainingContent.findById(item.training_content_id)
        .populate({
          path: "lesson_ids",
          model: "tutor_training_lessons",
          match: { _id: { $in: selectedLessonIds } },
          populate: [
            { path: "slide_ids", model: "tutor_training_slides" },
            { path: "practice_ids", model: "tutor_training_practices" },
          ],
        })
        .lean();

      const randomString = randomStr.generate({
        length: 8,
        charset: "alphabetic",
      });
      let newContentDirectory = "lc_" + randomString + Date.now();
      const dir = "./assets/TutorTrainingContent/" + newContentDirectory;
      await fs.mkdir(dir, (error) => {
        console.log(error);
      });
      let oldContentDirectory = originalContent.content_directory;

      // Version slides and practices, then lessons
      const versionLessonIds = [];      
      const versionLessonsArray = [];
      for (const lesson of originalContent.lesson_ids) {
        const versionSlideIds = await Promise.all(
          lesson.slide_ids.map(slide => {
            // copying slide attatchments            
            let newAttachment = (video = "");
            if (slide.attachments[0] != "" && slide.attachments[0] != null && slide.attachments[0] != undefined) {
              let attachment = slide.attachments[0].split("-");
              attachment[0] = Date.now();
              newAttachment = attachment.join("-");

              globalHelper.copyAnyFile(`./assets/TutorTrainingContent/${oldContentDirectory}/${slide.attachments[0]}`,`./assets/TutorTrainingContent/${newContentDirectory}/${newAttachment}`);
            }

            if (slide.video != "" && slide.video != null && slide.video != undefined) {
              let videoName = slide.video.split("-");
              videoName[0] = Date.now();
              video = videoName.join("-");
              globalHelper.copyAnyFile(`./assets/TutorTrainingContent/${oldContentDirectory}/${slide.video}`,`./assets/TutorTrainingContent/${newContentDirectory}/${video}`);
            }
            
            return (TutorTrainingVersionSlide.create({
              tutor_training_slide_id: slide._id,
              title: slide.title,
              duration: slide.duration,
              description: slide.description,
              video_url: slide.video_url,
              video: slide.video,
              // attachments: slide.attachments,
              attachments: newAttachment,
              position: slide.position,
              content_directory: newContentDirectory,
              marked_completed: slide.marked_completed,
            }).then(s => s._id));
          })
        );
        
        const versionPracticeIds = await Promise.all(
          lesson.practice_ids.map(practice => {
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

                  globalHelper.copyAnyFile(`./assets/TutorTrainingContent/${oldContentDirectory}/${option.option_image}`,`./assets/TutorTrainingContent/${newContentDirectory}/${option_image}`);
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
              globalHelper.copyAnyFile(`./assets/TutorTrainingContent/${oldContentDirectory}/${practice.question_image}`,`./assets/TutorTrainingContent/${newContentDirectory}/${question_image}`);
            }
  
            if (practice.question_audio != "" && practice.question_audio != null) {
              let audio = practice.question_audio.split("-");
              audio[0] = Date.now();
              question_audio = audio.join("-");
              
              globalHelper.copyAnyFile(`./assets/TutorTrainingContent/${oldContentDirectory}/${practice.question_audio}`,`./assets/TutorTrainingContent/${newContentDirectory}/${question_audio}`);
            }
            
            return (
                TutorTrainingVersionPractice.create({
                  tutor_training_practice_id: practice._id,
                  question_type: practice.question_type,
                  question_title: practice.question_title,
                  question: practice.question,
                  question_duration: practice.question_duration,
                  question_image: question_image,
                  question_audio: question_audio,
                  content_directory: newContentDirectory,
                  question_explanation: practice.question_explanation,
                  option_display_preference: practice.option_display_preference,
                  challenges_listing: practice.challenges_listing,
                  options: optionObject,
                  reference_id: practice.reference_id,
                  position: practice.position,
              }).then(p => p._id)
            );
          })
        );

        
        
        const newVersionLesson = await TutorTrainingVersionLesson.create({
          tutor_training_lesson_id: lesson._id,
          title: lesson.title,
          position: lesson.position,
          slide_ids: versionSlideIds,
          practice_ids: versionPracticeIds,
        });
        
        versionLessonsArray.push({
          lesson_id: newVersionLesson._id,
          slide_ids: versionSlideIds,
          practice_ids: versionPracticeIds,
        });
        
        versionLessonIds.push(newVersionLesson._id);
      }
      
      let contentThumbnail = "";
      if (originalContent.thumbnail != "" && originalContent.thumbnail != null) {
        let thumbnail = originalContent.thumbnail.split("-");
        thumbnail[0] = Date.now();
        contentThumbnail = thumbnail.join("-");
        
        globalHelper.copyAnyFile(`./assets/TutorTrainingContent/${oldContentDirectory}/${originalContent.thumbnail}`,`./assets/TutorTrainingContent/${newContentDirectory}/${contentThumbnail}`);
      }      
      
      // Create versioned content
      const versionContentDoc = await TutorTrainingVersionContent.create({
        tutor_training_content_id: originalContent._id,
        topic_id: originalContent.topic_id,
        sub_topic_id: originalContent.sub_topic_id,
        title: originalContent.title,
        short_description: originalContent.short_description,
        content_directory: newContentDirectory,
        thumbnail: contentThumbnail,
        lesson_ids: versionLessonIds,
      });

      // Build reference object for assessment
      const versionedObject = {
        training_content_id: versionContentDoc._id,
        lessons: versionLessonsArray,
      };
      versionContent.push(versionedObject);
    }
    
    // Create main assessment record
    const newAssessment = await TutorTrainingAssessment.create({
      name: name,
      tutor_ids: tutors,
      original_content: uniqueContent,
      content: versionContent,
    });

    // Create TutorAssessments
    const tutorAssessmentIds = await Promise.all(
      tutors.map(tutor =>
        TutorAssessments.create({
          assessment_id: newAssessment._id,
          tutor_id: tutor,
        }).then(doc => doc._id)
      )
    );

    // Update assessment with tutorAssessmentIds
    await TutorTrainingAssessment.findByIdAndUpdate(newAssessment._id, {
      tutor_assessment_ids: tutorAssessmentIds,
    });

    await session.commitTransaction();

    req.flash("success", "The new staff assessment is created successfully!");
    return res.status(200).json({
      success: true,
      message: "The new staff assessment is created successfully!",
      redirectUrl: "/tutor-training-assessments",
    });

  }catch(error){
    console.log(error);
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }finally {
    session.endSession();
  }
}


/**
 * assign tutor training content edit
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function edit(req,res){
  try{
    const activeTopics = await Topic.find({ "status": 1,"isDeleted":false  }).sort({ 'name': 1 });
    const users = await User.find({"role": 2, "status": 1, "isDeleted": false}).sort({'first_name': 1  });
    const slug  = req.params.slug;
    const tutorTrainingAssessment = await TutorTrainingAssessment.findOne({ slug: slug, deleted_at: null, status: "N/A" })
    .populate({
      path:'tutor_ids',
      model:'users',
      select:'id first_name last_name'
    })
    .populate({
      path: 'content.training_content_id',
      model: 'tutor_training_version_contents',
      select:'id title',
      populate: [{
          path: 'topic_id',
          model: 'topics',
          select:'id name'
      },
      {
          path: 'sub_topic_id',
          model: 'subTopics',
          select:'id name'
      }]
    }).populate({
      path: 'content.lessons.lesson_id',
      model: 'tutor_training_version_lessons',
      select:'id title tutor_training_lesson_id'
  });
  
    const tutorIds = tutorTrainingAssessment.tutor_ids.map((data) => data._id.toString());
    const ObjectData = {
      name:tutorTrainingAssessment.name,
      assessmentId:tutorTrainingAssessment.id,
      tutorIds:tutorIds,
      data:tutorTrainingAssessment,
    }
  return res.render("../views/admin/tutorTrainingAssessment/edit",{ObjectData:ObjectData, tutors: users, topics: activeTopics });
  }catch(error){
    console.log(error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * assign tutor training content update
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function update(req, res) {
  const session = await mysqlOrm.startSession();
  session.startTransaction();

  try {
    const { tutor_ids, selected_contents, tutor_assessment_id, name } = req.body;
    const tutors = Array.isArray(tutor_ids) ? tutor_ids : [tutor_ids];

    const existingAssessment = await TutorTrainingAssessment.findById(tutor_assessment_id)
      .populate('tutor_assessment_ids')
      .populate({
        path: 'content.training_content_id',
        model: 'tutor_training_version_contents',
        select: 'id title tutor_training_content_id content_directory'
      })
      .lean();

    if (!existingAssessment) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    const existingTutorIds = existingAssessment.tutor_ids.map(id => id.toString());
    const removedTutors = existingTutorIds.filter(id => !tutors.includes(id));

    if (removedTutors.length > 0) {
      const attempted = await TutorAttemptedAssessments.find({
        assessment_id: tutor_assessment_id,
        tutor_id: { $in: removedTutors }
      }).populate('tutor_id', 'first_name last_name');

      if (attempted.length > 0) {
        const tutorNames = attempted.map(t => `${t.tutor_id.first_name} ${t.tutor_id.last_name}`);
        return res.status(400).json({
          success: false,
          message: `Cannot remove tutors who have started the assessment: ${tutorNames.join(", ")}`
        });
      }
    }

    const grouped = {};
    for (const content of selected_contents) {
      const [contentId, lessonId, contentType] = content.split("--");
      if (!grouped[contentId]) grouped[contentId] = [];
      grouped[contentId].push({ lessonId, contentType });
    }

    const existingLessonIds = (existingAssessment.content || []).flatMap(c =>
      c.lessons.map(lesson => lesson.lesson_id.toString())
    );

    const existingContentIds = (existingAssessment.content || []).map(c =>
      (c.training_content_id?._id || c.training_content_id)?.toString()
    );

    const usedLessons = [];

    for (const contentId in grouped) {
      const items = grouped[contentId];
      const originals = items.filter(i => i.contentType === 'original');
      const versions = items.filter(i => i.contentType === 'version');

      const matchingVersion = existingAssessment.content.find(c => {
        const tcId = c.training_content_id;
        return (
          tcId?.tutor_training_content_id?.toString() === contentId ||
          tcId?._id?.toString() === contentId
        );
      });

      const existingVersionLessons = matchingVersion ? [...matchingVersion.lessons] : [];
      const newLessons = [];

      if (versions.length > 0 && matchingVersion) {
        const versionedLessonIds = versions.map(v => v.lessonId);
        const reusedLessons = matchingVersion.lessons.filter(lesson =>
          versionedLessonIds.includes(lesson.lesson_id.toString())
        );
        newLessons.push(...reusedLessons);
        usedLessons.push(...reusedLessons.map(l => ({
          ...l,
          training_content_id: matchingVersion.training_content_id._id
        })));
      }

      if (originals.length > 0) {
        const selectedLessonIds = originals.map(i => mysqlOrm.Types.ObjectId(i.lessonId));
        const originalContent = await TutorTrainingContent.findById(contentId)
          .populate({
            path: 'lesson_ids',
            match: { _id: { $in: selectedLessonIds } },
            populate: [
              { path: 'slide_ids', model: 'tutor_training_slides' },
              { path: 'practice_ids', model: 'tutor_training_practices' }
            ]
          })
          .lean();

        if (!originalContent || !originalContent.lesson_ids.length) continue;

        const oldDir = originalContent.content_directory;
        const newDir = matchingVersion ? matchingVersion.training_content_id.content_directory : `lc_${randomStr.generate({ length: 8, charset: 'alphabetic' })}${Date.now()}`;
        const newDirPath = `./assets/TutorTrainingContent/${newDir}`;
        if (!fs.existsSync(newDirPath)) await fs.promises.mkdir(newDirPath, { recursive: true });

        for (const lesson of originalContent.lesson_ids) {
          const slideIds = await Promise.all(lesson.slide_ids.map(async slide => {
            const attachment = slide.attachments?.[0] ? await copyFile(oldDir, newDir, slide.attachments[0]) : "";
            const video = slide.video ? await copyFile(oldDir, newDir, slide.video) : "";
            const s = await TutorTrainingVersionSlide.create({
              tutor_training_slide_id: slide._id,
              title: slide.title,
              description: slide.description,
              duration: slide.duration,
              video_url: slide.video_url,
              video,
              attachments: attachment,
              position: slide.position,
              content_directory: newDir,
              marked_completed: slide.marked_completed
            });
            return s._id;
          }));

          const practiceIds = await Promise.all(lesson.practice_ids.map(async practice => {
            const question_image = practice.question_image ? await copyFile(oldDir, newDir, practice.question_image) : "";
            const question_audio = practice.question_audio ? await copyFile(oldDir, newDir, practice.question_audio) : "";
            const options = await Promise.all((practice.options || []).map(async o => {
              const option_image = o.option_image ? await copyFile(oldDir, newDir, o.option_image) : "";
              return { option_image, option_text: o.option_text, option_correct: o.option_correct };
            }));
            const p = await TutorTrainingVersionPractice.create({
              tutor_training_practice_id: practice._id,
              question_type: practice.question_type,
              question_title: practice.question_title,
              question: practice.question,
              question_duration: practice.question_duration,
              question_image,
              question_audio,
              question_explanation: practice.question_explanation,
              option_display_preference: practice.option_display_preference,
              challenges_listing: practice.challenges_listing,
              options,
              reference_id: practice.reference_id,
              position: practice.position,
              content_directory: newDir
            });
            return p._id;
          }));

          const newLesson = await TutorTrainingVersionLesson.create({
            tutor_training_lesson_id: lesson._id,
            title: lesson.title,
            position: lesson.position,
            slide_ids: slideIds,
            practice_ids: practiceIds
          }); 

          console.log('newLesson',newLesson);

          newLessons.push({
            lesson_id: newLesson._id,
            slide_ids: slideIds,
            practice_ids: practiceIds
          });

          usedLessons.push({
            lesson_id: newLesson._id,
            slide_ids: slideIds,
            practice_ids: practiceIds,
            training_content_id: matchingVersion ? matchingVersion.training_content_id._id : null
          });
        }

        if (!matchingVersion) {
          const thumbnail = originalContent.thumbnail ? await copyFile(oldDir, newDir, originalContent.thumbnail) : "";
          const versionContentDoc = await TutorTrainingVersionContent.create({
            tutor_training_content_id: originalContent._id,
            topic_id: originalContent.topic_id,
            sub_topic_id: originalContent.sub_topic_id,
            title: originalContent.title,
            short_description: originalContent.short_description,
            content_directory: newDir,
            thumbnail,
            lesson_ids: newLessons.map(l => l.lesson_id)
          });

          usedLessons.forEach(l => {
            if (!l.training_content_id) l.training_content_id = versionContentDoc._id;
          });
        }
      }
    }

    // Final content structure map
    const versionContentMap = new Map();
    for (const lesson of usedLessons) {
      const contentId = lesson.training_content_id.toString();
      if (!versionContentMap.has(contentId)) {
        versionContentMap.set(contentId, {
          training_content_id: mysqlOrm.Types.ObjectId(contentId),
          lessons: []
        });
      }
      versionContentMap.get(contentId).lessons.push({
        lesson_id: lesson.lesson_id,
        slide_ids: lesson.slide_ids,
        practice_ids: lesson.practice_ids
      });
    }

    const usedLessonIds = new Set(usedLessons.map(l => l.lesson_id.toString()));
    const removedLessonIds = existingLessonIds.filter(id => !usedLessonIds.has(id));

    for (const lessonId of removedLessonIds) {
      const lesson = await TutorTrainingVersionLesson.findById(lessonId);
      if (!lesson) continue;

      await TutorTrainingVersionSlide.deleteMany({ _id: { $in: lesson.slide_ids } });
      await TutorTrainingVersionPractice.deleteMany({ _id: { $in: lesson.practice_ids } });
      await TutorTrainingVersionLesson.findByIdAndDelete(lessonId);

      if (lesson.content_directory) {
        await cleanLessonAssets(lesson.content_directory, lesson.slide_ids, lesson.practice_ids);
      }

    }

    for (const [key, value] of versionContentMap.entries()) {
      const filteredLessons = value.lessons.filter(
        l => !removedLessonIds.includes(l.lesson_id.toString())
      );

      if (filteredLessons.length === 0) {
        versionContentMap.set(key, { ...value, lessons: [] });
      } else {
        versionContentMap.set(key, { ...value, lessons: filteredLessons });
      }
    }

    // Delete empty content
    for (const [key, value] of versionContentMap.entries()) {
      if (!value.lessons.length) {
        const versionCnt = await TutorTrainingVersionContent.findById(value.training_content_id);
        if (versionCnt) {
          await TutorTrainingVersionContent.findByIdAndDelete(value.training_content_id);
          if (versionCnt.content_directory) {
            await cleanContentDirectory(versionCnt.content_directory);
          }
        }
        versionContentMap.delete(key);
      }
    }

    const finalMergedContent = Array.from(versionContentMap.values());

    const existingTutorAssessments = existingAssessment.tutor_assessment_ids;
    const keepIds = existingTutorAssessments.filter(a => tutors.includes(a.tutor_id.toString())).map(a => a._id);
    const newTutorAssessments = await Promise.all(
      tutors.filter(id => !existingTutorIds.includes(id)).map(tutorId =>
        TutorAssessments.create({ assessment_id: tutor_assessment_id, tutor_id: tutorId }).then(doc => doc._id)
      )
    );

    for (const content of finalMergedContent) {
      await TutorTrainingVersionContent.findByIdAndUpdate(
        content.training_content_id,
        { $set: { lesson_ids: content.lessons.map(l => l.lesson_id) } }
      );
    }

    await TutorTrainingAssessment.findByIdAndUpdate(tutor_assessment_id, {
      name,
      tutor_ids: tutors,
      content: finalMergedContent,
      tutor_assessment_ids: [...keepIds, ...newTutorAssessments],
      updated_at: new Date()
    });

    if (removedTutors.length > 0) {
      await TutorAssessments.deleteMany({ assessment_id: tutor_assessment_id, tutor_id: { $in: removedTutors } });
    }

    await session.commitTransaction();
    req.flash("success", "Staff Course Assessment updated successfully!");
    return res.status(200).json({
      success: true,
      message: "Staff Course Assessment updated successfully!",
      redirectUrl: "/tutor-training-assessments"
    });
  } catch (err) {
    console.error("Update Tutor Assessment Error:", err);
    await session.abortTransaction();
    return res.status(500).json({ success: false, message: "Something went wrong, please try again later." });
  } finally {
    session.endSession();
  }
}



async function cleanLessonAssets(contentDirectory, slideIds, practiceIds) {
  try {
    // Get all files referenced by these slides and practices
    const slides = await TutorTrainingVersionSlide.find({ _id: { $in: slideIds } });
    const practices = await TutorTrainingVersionPractice.find({ _id: { $in: practiceIds } });
    
    const filesToDelete = [];
    
    // Collect slide files
    for (const slide of slides) {
      if (slide.video) filesToDelete.push(slide.video);
      if (slide.attachments && slide.attachments.length > 0) {
        filesToDelete.push(...slide.attachments);
      }
    }
    
    // Collect practice files
    for (const practice of practices) {
      if (practice.question_image) filesToDelete.push(practice.question_image);
      if (practice.question_audio) filesToDelete.push(practice.question_audio);
      if (practice.options) {
        for (const option of practice.options) {
          if (option.option_image) filesToDelete.push(option.option_image);
        }
      }
    }
    
    // Delete files
    for (const file of filesToDelete) {
      if (file) {
        const filePath = path.join('./assets/TutorTrainingContent', contentDirectory, file);
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        } catch (err) {
          console.error(`Error deleting file ${filePath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error cleaning lesson assets:', err);
  }
}

async function cleanContentDirectory(contentDirectory) {
  try {
    const dirPath = path.join('./assets/TutorTrainingContent', contentDirectory);
    if (fs.existsSync(dirPath)) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error cleaning content directory ${contentDirectory}:`, err);
  }
}

async function copyFile(fromDir, toDir, filename) {
  const oldPath = `./assets/TutorTrainingContent/${fromDir}/${filename}`;
  const newPath = `./assets/TutorTrainingContent/${toDir}/${filename}`;
  if (fs.existsSync(oldPath)) {
    await globalHelper.copyAnyFile(oldPath, newPath);
  }
  return filename;
}



/**
 * delete an assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function destroy(req, res) {
  try {
    const assessmentId = mysqlOrm.Types.ObjectId(req.params.id);

    // Delete related tutor assessments
    await TutorAssessments.deleteMany({ assessment_id: assessmentId });

    // Fetch the assessment document
    const trainingAssessment = await TutorTrainingAssessment.findById(req.params.id);
    if (!trainingAssessment) {
      return res.status(404).json({ success: false, message: "Assessment not found." });
    }

    // Collect all versioned document IDs
    const trainingContentIds = [];
    const lessonIds = [];
    const practiceIds = [];
    const slideIds = [];
    const contentDirNames = [];

    for (const contentItem of trainingAssessment.content || []) {
      if (contentItem.training_content_id) {
        trainingContentIds.push(contentItem.training_content_id);

        // Fetch the content doc to get content_directory
        const versionContent = await TutorTrainingVersionContent.findById(contentItem.training_content_id);
        if (versionContent?.content_directory) {
          contentDirNames.push(versionContent.content_directory);
        }
      }

      for (const lesson of contentItem.lessons || []) {
        if (lesson.lesson_id) lessonIds.push(lesson.lesson_id);
        if (lesson.practice_ids?.length) practiceIds.push(...lesson.practice_ids);
        if (lesson.slide_ids?.length) slideIds.push(...lesson.slide_ids);
      }
    }

    // Delete content directories
    for (const dirName of contentDirNames) {
      const dirPath = path.join(__dirname, '../../assets/TutorTrainingContent', dirName);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }

    // Delete all related versioned documents
    if (lessonIds.length) await TutorTrainingVersionLesson.deleteMany({ _id: { $in: lessonIds } });
    if (practiceIds.length) await TutorTrainingVersionPractice.deleteMany({ _id: { $in: practiceIds } });
    if (slideIds.length) await TutorTrainingVersionSlide.deleteMany({ _id: { $in: slideIds } });
    if (trainingContentIds.length) await TutorTrainingVersionContent.deleteMany({ _id: { $in: trainingContentIds } });

    // Finally delete the assessment
    await TutorTrainingAssessment.findByIdAndDelete(assessmentId);

    const crudMsg = "Assessment and all related content deleted successfully.";
    req.flash("success", crudMsg);
    return res.status(200).json({
      success: true,
      redirectUrl: "/tutor-training-assessments",
      message: crudMsg,
    });

  } catch (error) {
    console.error('Destroy Error:', error);
    return res.status(500).json({
      success: false,
      redirectUrl: "/tutor-training-assessments",
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * render training contents.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function renderTrainingContents(req, res) {
  try {
    let reqObj = {};
    if (req.body.grade_id) {
      reqObj["grade_id"] = req.body.grade_id;
    }
    if (req.body.topic_id) {
      reqObj["topic_id"] = req.body.topic_id;
    }
    
    if (req.body.sub_topic_id !== null && req.body.sub_topic_id !== undefined && req.body.sub_topic_id !== '') {
      reqObj["sub_topic_id"] = req.body.sub_topic_id;
    }

    reqObj["status"] = 1;
    let recordsFiltered = await TutorTrainingContent.find({ $and: [reqObj] }).sort({
      title: "asc",
    });

    return res.send(recordsFiltered);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * render lessons according to training content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function renderTrainingContentLessons(req, res) {
  try {
    if(req.body.content_id != ''){
      let trainingContentId = mysqlOrm.Types.ObjectId(req.body.content_id);
      const learningContentDetail = await TutorTrainingContent.find({_id: trainingContentId,}, '_id title lesson_ids').populate({
        path: "lesson_ids",
        match: { $and: [{ slide_ids: { $gt: [] } }, { practice_ids: { $gt: [] } }] },
      });
      return res.send(learningContentDetail[0]);
    }
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
async function loadAssignedLessons(req, res) {
  try {
    const user_detail = res.locals.loggedUserInfo;
    let tutorAssessmentId = req.body.tutor_assessment_id;
    let userId = user_detail._id.toString();
    let tutorTrainingAssessment = await TutorTrainingAssessment.findById(tutorAssessmentId)
    .populate({
      path: 'content.training_content_id',
      model: 'tutor_training_version_contents',
      select: 'id slug'
    })
    .populate({
      path: 'content.lessons.lesson_id',
      model: 'tutor_training_version_lessons',
      select: 'id slug title slide_ids practice_ids'
    });
    let html = '';
    
    for(let contentData of tutorTrainingAssessment.content){
      for(let lesson of contentData.lessons){
        
        let attemptedAssessments = await TutorAttemptedAssessments.find({
          'assessment_id': mysqlOrm.Types.ObjectId(tutorAssessmentId),
          'tutor_id':mysqlOrm.Types.ObjectId(userId),
          'lesson_id':mysqlOrm.Types.ObjectId(lesson.lesson_id.id),
        });
        let status = 'N/A';
        if(attemptedAssessments.length === 2){
          const slidesAnswers = attemptedAssessments.filter(item => item.assessment_type === 'slides').map(item => item.answers);
          const allRead = slidesAnswers[0].every(item => item.isread === true);
          if(allRead){
            status = 'Completed'
          }else{
            status = 'Processing'
          }
        }else if(attemptedAssessments.length === 1){
          status = 'Processing';
        }
        let data = {
          assessmentId: tutorTrainingAssessment.id,
          trainingContentSlug: contentData.training_content_id.slug,
          lessonId: lesson.lesson_id.id,
          lessonSlug:lesson.lesson_id.slug,
          lessonName: lesson.lesson_id.title,
          slideCount: lesson.slide_ids.length,
          practiceCount: lesson.practice_ids.length,
          status:status,
        }
        
        html += template.render({data:data},"/tutorTrainingContent/lesson/assessmentLessonListing.ejs");
      }

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
 * view a single lesson.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function viewSingle(req, res) {
  try {
    let viewType = req.originalUrl.split("/")[5];
    
    let contentSlug = req.originalUrl.split("/")[2];
    let assessmentType = req.params.type;
    const user_detail = res.locals.loggedUserInfo;
    let userId = user_detail._id.toString();
    const tutorTrainingContentDetail = await TutorTrainingVersionContent.find({slug: contentSlug})
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
    
    if (tutorTrainingContentDetail[0]) {
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

      // check the assessment slide is marked read or not
      let idsWithIsRead = [];
      let assessmentId = req.params.assessmentId;
      if(assessmentType === 'slides'){
        let lessonId = singleLesson.id;
        let attemptedAssessment = await TutorAttemptedAssessments.find({
          'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),
          'tutor_id':mysqlOrm.Types.ObjectId(userId),
          'lesson_id':mysqlOrm.Types.ObjectId(lessonId),
          'assessment_type':'slides',
        });
        if(attemptedAssessment.length>0 && attemptedAssessment[0].answers.length > 0){
          let data = attemptedAssessment[0].answers;
          idsWithIsRead = data.filter(item => item.isread).map(item => item.id);
        }
      }
      // get assign slide and practices

      const assessmentData = await TutorTrainingAssessment.aggregate([
        
        {$match: { _id: mysqlOrm.Types.ObjectId(assessmentId) }},
        {
          $unwind: "$content"
        },
        {
          $match: { "content.lessons.lesson_id": mysqlOrm.Types.ObjectId(singleLesson.id) }
        },
        {
          $project: {
            content: 1, 
          },
        }
      ]);
      let lessonsArray = assessmentData[0].content.lessons;
      const filteredLesson = lessonsArray.filter(lesson => lesson.lesson_id.toString() === singleLesson.id);
      let assignSlideIdsArray = [];
      let assignPracticeIdsArray = [];
      if(filteredLesson[0].slide_ids.length > 0){
        assignSlideIdsArray = filteredLesson[0].slide_ids.map(slideId => slideId.toString());
      }
      if(filteredLesson[0].practice_ids.length > 0){
        assignPracticeIdsArray = filteredLesson[0].practice_ids.map(practiceId => practiceId.toString());
      }
      
      // store all type of duration & counts in object
      const contentStatics = {
        slide_duration: totalSlideDuration,
        practice_duration: totalPracticeDuration,
        total_duration: totalDuration,
        total_slides: totalSlides,
        total_practices: totalPractices,
        total_challenges: totalChallenges,
        assessment_type:assessmentType,
        is_read_slides: idsWithIsRead,
        is_assessment : true,
        assessment_id:assessmentId,
        assignSlideIdsArray:assignSlideIdsArray,
        assignPracticeIdsArray:assignPracticeIdsArray,
      };
      
      global.lessonContentStatics = contentStatics;
      global.sidebarType = "trainingContent";
      return res.render("../views/admin/tutorTraining/lessons/view",{
        lesson: singleLesson,
        learningContent: tutorTrainingContentInfo
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
 * load assessment lessons.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function loadAssessmentLessonTasks(req, res) {
  try{
    let lessonId = mysqlOrm.Types.ObjectId(req.body.lessonId);
    let assessmentId = mysqlOrm.Types.ObjectId(req.body.assessmentId);
    const user_detail = res.locals.loggedUserInfo;
    let tutorId = mysqlOrm.Types.ObjectId(user_detail._id);
    let attemptedAssessment = await TutorAttemptedAssessments.find({
      'assessment_id':assessmentId,
      'tutor_id':tutorId,
      'lesson_id':lessonId,
    });
    let resultObject = {
      slides:{status:'Start',correct:0,percentage:0,isAttempted:false},
      practices:{status:'Start',correct:0,percentage:0,isAttempted:false,countTextQuestion:0},
    };
    for(let data of attemptedAssessment){
      if(data.assessment_type == 'slides'){
        let answers = data.answers;
        let correct = 0;
        for(let answer of answers){
          if(answer.isread){
            correct++;
          }
        }
        let percentage = (parseInt(correct)/answers.length)*100;
        if(Number.isInteger(percentage) == false) {
          percentage = percentage.toFixed(2);
        }  
        resultObject.slides = {status:data.status,correct:correct,percentage:percentage,isAttempted:true}
      }else if(data.assessment_type == 'practices'){
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
        if(isNaN(percentage)){
          percentage = 0;
        }
        resultObject.practices = {status:data.status,correct:correct,percentage:parseInt(percentage),isAttempted:true, countTextQuestion:countTextQuestion}
      }
    }
    return res.status(200).json({
      success: true,
      data:resultObject,
      redirectUrl: "/tutor-training-assessments",
      message: "Assessment is deleted successfully.",
    });
  }catch(error){
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * submit slides assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function submitTutorAssessmentSlides(req, res) {
  try {
    // Extracting necessary information from the request body
    let { assessmentId, lessonId, id, type } = req.body;
    const user_detail = res.locals.loggedUserInfo;
    let userId = user_detail._id.toString();

    // Retrieving attempted assessments for slides
    let slidesAssessments = await TutorAttemptedAssessments.find({
      'assessment_id': mysqlOrm.Types.ObjectId(assessmentId),
      'tutor_id': mysqlOrm.Types.ObjectId(userId),
      'lesson_id':mysqlOrm.Types.ObjectId(lessonId),
      'assessment_type': type,
    });


    const assessmentData = await TutorTrainingAssessment.aggregate([
      {$match: { _id: mysqlOrm.Types.ObjectId(assessmentId) }},
      {
        $unwind: "$content"
      },
      {
        $match: { "content.lessons.lesson_id": mysqlOrm.Types.ObjectId(lessonId) }
      },
      {
        $project: {
          content: 1, 
        },
      }
    ]);
    let lessonsArray = assessmentData[0].content.lessons;
    const filteredLesson = lessonsArray.filter(lesson => lesson.lesson_id.toString() === lessonId);

    let assignSlideIdsArray = [];
    let assignPracticeIdsArray = [];
    if(filteredLesson[0].slide_ids.length > 0){
      assignSlideIdsArray = filteredLesson[0].slide_ids.map(slideId => slideId.toString());
    }
    if(filteredLesson[0].practice_ids.length > 0){
      assignPracticeIdsArray = filteredLesson[0].practice_ids.map(practiceId => practiceId.toString());
    }
  
    let response = {};

    // Checking if there are attempted assessments for slides
    if (slidesAssessments.length > 0) {
      // If attempted assessments exist, get the answers
      const answers = slidesAssessments[0].answers;

      // Update the answer corresponding to the given ID to mark it as read
      const updatedAnswer = answers.map(item => {
        if (item.id === id) {
          return { ...item, isread: true };
        }
        return item;
      });
      // Check if all answers are read
      const allRead = updatedAnswer.every(item => item.isread === true);

      let status = 'Processing';
      if (allRead) {
        status = 'Completed';
      }

      // Construct the update object with the updated answers
      const updateObject = {
        assessment_id: assessmentId,
        tutor_id: user_detail._id,
        lesson_id: lessonId,
        assessment_type: 'slides',
        answers: updatedAnswer,
        status: status,
      };

      // Update the attempted assessment
      response = await TutorAttemptedAssessments.findByIdAndUpdate(slidesAssessments[0].id, updateObject);
    } else {
      // If no attempted assessments exist, fetch the lesson details
      let lesson = await TutorTrainingVersionLesson.findById(lessonId)
        .populate({
          path: "slide_ids",
          model: "tutor_training_version_slides",
          select: '_id title'
        })
        .populate({
          path: "practice_ids",
          model: "tutor_training_version_practices",
          select: '_id question_title'
        });

      // Get the slide IDs from the lesson
      const slides = lesson.slide_ids;

      // If the assessment type is slides, add slides to answers
      let allAnswer = []
      if (type === 'slides') {
        for (let slide of slides) {
          if(assignSlideIdsArray.includes(slide.id)){
            allAnswer.push({
              id: slide.id,
              title: slide.title,
              isread: false
            });
          }

        }
      }

      // Update the answer corresponding to the given ID to mark it as read
      const updatedAnswer = allAnswer.map(item => {
        if (item.id === id) {
          return { ...item, isread: true };
        }
        return item;
      });
      const allRead = updatedAnswer.every(item => item.isread === true);
      // Construct the create object with the updated answers
      const createObject = {
        assessment_id: assessmentId,
        tutor_id: user_detail._id,
        lesson_id: lessonId,
        assessment_type: 'slides',
        answers: updatedAnswer,
        status: allRead ? 'Completed' : 'Processing',
      };

      // Create a new attempted assessment
      response = await TutorAttemptedAssessments.create(createObject);
    }
    let updateStatus = await manageTutorAssessmentStatus(assessmentId,userId);
    // Send response
    res.status(200).json({ "success": true, "message": "The slide marked successfully!", "redirectUrl": "/tutor-training-assessments" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}

/**
 * submit practices assessment.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function submitTutorAssessmentPractices(req, res) {
  try{
    let assessmentId = req.body.assessmentId;
    let lessonId = req.body.lessonId;
    let type = req.body.type;
    const user_detail = res.locals.loggedUserInfo;
    let userId = user_detail._id.toString();
    let assessmentData =  req.body.data;
    let allQuestion = [];
    for (let question of assessmentData) {
      let correctOption = [];
      let practiceData = await TutorTrainingVersionPractice.findById(question.questionId, {
        question_type: 1,
        options: 1,
      });
      if (practiceData.question_type != "text") {
        for (options of practiceData.options) {
          if (options.option_correct) {
            if (
              practiceData.question_type == "single_select" ||
              practiceData.question_type == "multi_select"
            ) {
              correctOption.push(options.id);
            } else if (practiceData.question_type == "drag_and_drop") {
              correctOption.push(options.option_text);
            }
          }
        }

        if ( JSON.stringify(correctOption) == JSON.stringify(question.submittedAnswer)) {
          question.isCorrect = true;
        } else {
          question.isCorrect = false;
        }
      } else {
        haveTextTypeQuestion = true;
      }
      allQuestion.push(question);
    }
    const hasTextType = assessmentData.some(item => item.type === 'text');
    const createObject = {
      assessment_id: assessmentId,
      tutor_id: userId,
      lesson_id: lessonId,
      assessment_type: type,
      answers: allQuestion,
      status: hasTextType ? 'Processing':'Completed',
    };

    let response = await TutorAttemptedAssessments.create(createObject);
    await manageTutorAssessmentStatus(assessmentId,userId );
    req.flash("success", "The assessment submitted successfully.");
    res.status(200).json({ "success": true, "message": "The assessment submitted successfully", "redirectUrl": "/tutor-training-assessments" });
  }catch(error){
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
 } catch(error){
  return error;
 }
}

/**
 * render lessons according to training content.
 * @param {*} req
 * @param {*} res
 * @returns
 */
async function assessmentDetailedReport(req, res) {
  try {
    let assessmentId = req.params.assessment_slug;
    const assessment = await Assessment.find({ slug: assessmentId });
    let tutors = await User.find({"role": 2, "status": 1, "isDeleted": false},).sort({ 'role': 1, '_id': -1 });
    return res.render("../views/admin/tutorTrainingAssessment/view-detailed-report",{assessmentDetail:assessment,tutors:tutors});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong, please try again later.",
    });
  }
}
