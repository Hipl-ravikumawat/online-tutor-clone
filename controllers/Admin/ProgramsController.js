const mysqlOrm = require('mysql-orm');
const Program = require('../../models/Program');
const User = require('../../models/User');
const Topic = require('../../models/Topic');
const Grade = require('../../models/Grade');
const Lesson = require('../../models/Lesson');

module.exports = {
    index,
    dataTable,
    create,
    store,
    edit,
    update,
    destroy,
    updateStatus,
    markCompleted,
    getNewStatistics,
    getProgramScores,
    skipLesson,
}

/**
 * list programs.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function index(req, res) {
    try {
        const grades = await Grade.find({ "status": 1,"isDeleted":false }).sort({ 'name': 1 });
        const users = await User.find({
            $or: [
              {"role": 2, "status": 1, "isDeleted": false},
              {"role": 3, "status": 1, "isDeleted": false},
            ]
        }, '_id role first_name last_name').sort({ 'role': 1, '_id': -1 });

        let programs = [];
        let programCounters = [];
        var countObj = {};
        let tutors = [];
        let students = [];
        let total = 0;
        let active = 0;
        let deactive = 0;
        const user_detail = res.locals.loggedUserInfo;

        if(user_detail.role == 2){
            if(attachedStudentIds && attachedStudentIds.length > 0){
                students = await User.find({
                    _id: { $in: attachedStudentIds },
                    isDeleted: false,
                    role: 3,
                  }, '_id role first_name last_name').sort({ first_name: 1 });
            }

            if(attachedProgramIds && attachedProgramIds.length > 0){
                programs = await Program.find({_id: { $in: attachedProgramIds }}, "id name").sort({ '_id': -1 });

                total =  attachedProgramIds?.length !== undefined ? attachedProgramIds?.length : 0;
                [
                    active,
                    deactive,
                  ] = await Promise.all([
                    Program.countDocuments({
                      _id: { $in: attachedProgramIds },
                      isDeleted: false,
                      status: 1
                    }),
                    Program.countDocuments({
                      _id: { $in: attachedProgramIds },
                      isDeleted: false,
                      status: 0
                    }),
                  ]);
            }

            countObj = {
                total : total,
                active : active,
                deactive : deactive
            }  
            programCounters.push(countObj);
        }
        else if(user_detail.role == 3){
            if(attachedTutorIds && attachedTutorIds.length > 0){
                tutors = await User.find({
                    _id: { $in: attachedTutorIds },
                    isDeleted: false,
                    role: 2,
                  }, '_id role first_name last_name').sort({ first_name: 1 });
            }
         
            if(attachedProgramIds && attachedProgramIds.length > 0){
                programs = await Program.find({_id: { $in: attachedProgramIds }}, "id name").sort({ '_id': -1 });

                total =  attachedProgramIds?.length !== undefined ? attachedProgramIds?.length : 0;
                [
                    active,
                    deactive,
                  ] = await Promise.all([
                    Program.countDocuments({
                      _id: { $in: attachedProgramIds },
                      isDeleted: false,
                      status: 1
                    }),
                    Program.countDocuments({
                      _id: { $in: attachedProgramIds },
                      isDeleted: false,
                      status: 0
                    }),
                  ]);
            }

            countObj = {
                total : total,
                active : active,
                deactive : deactive
            }  
            programCounters.push(countObj);
        }else{

        programs = await Program.find({}, "id name").sort({ '_id': -1 });
    
            tutors = users.filter(user => user.role === 2);
            students = users.filter(user => user.role === 3);
            programCounters = await Program.aggregate([
                { $sort: { _id: -1 } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: { if: { $eq: ["$status", 1] }, then: 1, else: 0 } } },
                        deactive: { $sum: { $cond: { if: { $eq: ["$status", 0] }, then: 1, else: 0 } } }
                    }
                }
            ]);

            [
                total,
                active,
                deactive,
              ] = await Promise.all([
                Program.countDocuments({ isDeleted: false }),
                Program.countDocuments({ isDeleted: false, status: 1}),
                Program.countDocuments({ isDeleted: false, status: 0}),
              ]);
        }

        return res.render('../views/admin/programs/index', { programs: programs, moment: res.locals.moment, programObject: programCounters[0], grades: grades, tutors: tutors, students:students,loggedUserRole: user_detail.role });

    } catch (error) {
        console.log('index: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}

/**
 * programs dataTable.
 * @param {*} req 
 * @param {*} res 
 */
async function dataTable(req, res) {
    try {
        let searchStr = req.body.search.value;
        let obj = {};
        const user_detail = res.locals.loggedUserInfo;
        if (req.body.programId) {
            obj["_id"] = req.body.programId;
        }
   
        if (req.body.search.value) {
            var regex = new RegExp(req.body.search.value, "i")
            searchStr = { $or: [{ 'name': regex }] };
        }
        else {
            searchStr = {};
        }
    
        const userRole = user_detail.role;
        const userId = user_detail._id.toString();
        
        countProgram = {};
        const filter = ['name', 'ex_content', 'grade_id', 'date'];
        let sort = {};

        if (req.body.order == undefined) {
            sort = { "_id": -1 };
        } else {
            const column_name = filter[req.body.order[0].column];
            const order_by = req.body.order[0].dir;
            sort = { [column_name]: order_by };
        }
    
        var recordsTotal = 0;
        var recordsFiltered = 0;
    
        recordsTotal = await Program.count(countProgram);
        recordsFiltered = await Program.count({ $and: [obj, searchStr] });
        let results = await Program.find({ $and: [obj, searchStr] }, '_id name content status slug', { 'skip': Number(req.body.start), 'limit': Number(req.body.length) }).populate('ex_content.learning_content_id').sort(sort);
    
        let data = JSON.stringify({
            "draw": req.body.draw,
            "recordsFiltered": recordsFiltered,
            "recordsTotal": recordsTotal,
            "data": results,
            "userRole": userRole,
        });
        return res.send(data);
    }catch (error) {
        console.log('dataTable: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}

/**
 * create program.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function create(req, res) {
    try {
        let activeTopics = await Topic.find({ "status": 1,"isDeleted":false  }).sort({ '_id': -1 });
        let activeGrades = await Grade.find({ "status": 1,"isDeleted":false  }).sort({ '_id': -1 });

        let users = await User.find({
            $or: [
              {"role": 2, "status": 1, "isDeleted": false},
              {"role": 3, "status": 1, "isDeleted": false},
            ]
        }).sort({'_id': -1 });
        
        // Separate tutors and students:
        let activeTutors = users.filter(user => user.role === 2);
        let activeStudents = users.filter(user => user.role === 3);

        return res.render('../views/admin/programs/create', { students: activeStudents, tutors: activeTutors, grades :activeGrades, topics: activeTopics, moment: res.locals.moment });
    } catch (error) {
        console.log('create: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}

/**
 * store program.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function store(req, res) {
    try {
        let selectedContents = req.body.selected_contents;
        let i = 0;
        let program = [];
        let pc = [];
        let lessons_ids;

        for (content of selectedContents) {
            lessons_ids = [];
            let data = content.split("--");
            let learningContentIndex = pc.findIndex(c => c.learning_content_id === data[0]);
            if (learningContentIndex === -1) {
                lessons_ids.push(data[1]);
                pc.push({
                    learning_content_id: data[0],
                    lesson_ids: lessons_ids,
                });

            } else {
                if (pc[learningContentIndex].lesson_ids.includes(data[1]) === false) {
                    let pcLessonIds = [...pc[learningContentIndex].lesson_ids];
                    pcLessonIds.push(data[1]);
                    pc[learningContentIndex].lesson_ids = pcLessonIds;
                }
            }
            let lessonData = await Lesson.findById(data[1])
            let slideData = [];
            if(lessonData.slide_ids.length>0){
                for(slide of lessonData.slide_ids){
                    slideData.push({'slide_id':slide.toString(),'completed':false})
                }
            }
            let obj = {
                lesson_id: data[1],
                learning_content_id: data[0],
                slides:slideData
            }
            program.push(obj);
            i++;
        }

        const uniqueContent = Array.from(program.reduce((a, o) => a.set(o.lesson_id, o), new Map()).values());
        let myProgram = {
            name: req.body.name,
            grade_id: req.body.grade_id,
            date: req.body.date,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            content: pc,
            ex_content: uniqueContent,
        }
        let newProgram = await Program.create(myProgram);
        if (newProgram) {
            req.flash('success', 'The new class is created successfully!');
            res.status(200).json({ "success": true, "message": "The new class is created successfully!", "redirectUrl": "/programs" });
        }

    } catch (error) {
        console.log('store: ', error);
        return res.status(500).json({ "success": false, "message": "Something went wrong!" });
    }
}

/**
 * edit program.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function edit(req, res) {
    try {
        const slug = req.params.slug;
        let activeTopics = await Topic.find({ "status": 1 }).sort({ '_id': -1 });
        let activeGrades = await Grade.find({ "status": 1 }).sort({ '_id': -1 });

        let users = await User.find({
            $or: [
              {"role": 2, "status": 1, "isDeleted": false},
              {"role": 3, "status": 1, "isDeleted": false},
            ]
        }).sort({'_id': -1 });
        
        // Separate tutors and students:
        let activeTutors = users.filter(user => user.role === 2);
        let activeStudents = users.filter(user => user.role === 3);

        let program = await Program.findOne({ "slug": slug }).populate([{
            path: 'ex_content.learning_content_id',
            model: 'learningContents',
            populate: [{
                path: 'grade_id',
                model: 'grades',
            },
            {
                path: 'topic_id',
                model: 'topics',
            },
            {
                path: 'sub_topic_id',
                model: 'subTopics',
            }],
        }]).populate([{
            path: 'ex_content.lesson_id',
            model: 'lessons',
            populate: [{
                path: 'slide_ids',
                model: 'slides',
            },
            {
                path: 'practice_ids',
                model: 'practices',
            }],
        }]);

        return res.render('../views/admin/programs/edit', { grades: activeGrades, students : activeStudents, tutors: activeTutors, topics: activeTopics, program: program, moment: res.locals.moment });
    } catch (error) {
        console.log('edit: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}

/**
 * update program.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function update(req, res) {
    try {
        let selectedContents = req.body.selected_contents;
        let i = 0;
        let program = [];
        for (content of selectedContents) {
            let data = content.split("--");
            let lessonData = await Lesson.findById(data[1])
            let slideData = [];

            //update previous record of existing program & lesson slides 
            let programData = await Program.find({"_id": mysqlOrm.Types.ObjectId(req.body.program_id)},{ex_content: {$elemMatch: {lesson_id:mysqlOrm.Types.ObjectId(data[1])}}});
            if(programData.length > 0 && programData[0].ex_content.length >0 ){
                slideData = programData[0].ex_content[0].slides;
            }else{
                if(lessonData.slide_ids.length>0){
                    for(slide of lessonData.slide_ids){
                        slideData.push({'slide_id':slide.toString(),'completed':false})
                    }
                }
            }
            let obj = {
                lesson_id: data[1],
                learning_content_id: data[0],
                slides:slideData,
            }
            program.push(obj);
            i++;
        }
        const uniqueContent = Array.from(program.reduce((a, o) => a.set(o.lesson_id, o), new Map()).values());
        let myProgram = {
            name: req.body.name,
            content: [],
            ex_content: uniqueContent,
        }

        let updatedProgram = await Program.findByIdAndUpdate(req.body.program_id, myProgram)

        req.flash('success', 'The class is updated successfully!');
        res.status(200).json({ "success": true, "message": "The class is updated successfully!", "redirectUrl": "/programs" });

    } catch (error) {
        console.log('update: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}

/**
 * delete a program.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function destroy(req, res) {
    try {
        let program = await Program.findByIdAndDelete(req.params.id);
        if (program) {
            req.flash("success", "The class is deleted successfully.");
            return res.status(200).json({
                success: true,
                redirectUrl: "/programs",
                message: "The class is deleted successfully.",
              });
        }      
    } catch (error) {
        console.log('destroy: ', error);
        return res.status(500).json({
            success: false,
            redirectUrl: "/programs",
            message: "Something went wrong, please try again later.",
          });
    }
}

/**
 * update status of the program.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function updateStatus(req, res) {
    try {
        if (req.body.uid && req.body.uid != '') {
            let status = ((req.body.status == 'true') ? '1' : '0');
            await Program.findByIdAndUpdate(req.body.uid, { status: status });
            res.status(200).json({ "success": true, "message": "The class status is updated successfully!" });
        }
    } catch (error) {
        console.log('updateStatus: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}

/**
 * mark a slide as `COMPLETED` in a program by assigned tutor.
 */
async function markCompleted(req, res) {
    try {
        const programId = req.body.programId;
        const lessonId = req.body.lessonId;
        const slideId = req.body.slideId;
        const isChecked = req.body.isChecked;

        const programData = await Program.findById(programId,
            { ex_content: 1, status: 1, percentage: 1 }
        );
        let content = programData.ex_content;

        if (content.length > 0) {
            for (lesson of content) {
                if (lesson.lesson_id.toString() == lessonId) {
                    for (slide of lesson.slides) {
                    if (slide.slide_id == slideId) {
                        if (isChecked == "true") {
                        slide.completed = true;
                        } else {
                        slide.completed = false;
                        }
                        break;
                    }
                    }
                }
            }
        }
  
        const programStatistics = await getNewStatistics(content);
        let dataToUpdate = {};

        if(programStatistics && programStatistics.completedSlides > 0){
            if(programStatistics.completedSlides === programStatistics.totalSlides){
                dataToUpdate =  {ex_content: content,  status:"Completed", percentage: 100 }
            }else {
                let percentage = ((programStatistics.completedSlides/programStatistics.totalSlides)*100);
                if(Number.isInteger(percentage) === false){
                    percentage = percentage.toFixed(2);
                }
                dataToUpdate =  {ex_content: content,  status:"Processing", percentage: percentage }
            }    
        } else {
            dataToUpdate =  {ex_content: content, status:"N/A", percentage: 0 }
        }

        await Program.findByIdAndUpdate(programId, dataToUpdate);
        let message = isChecked == "true" ? "This slide is marked as completed successfully!" : "This slide is marked uncomplete successfully!"
        req.flash("success", message);
        res
        .status(200)
        .json({
          success: true,
          message: message,
        });
    } catch (error) {
        console.log('markCompleted: ', error);
      return res.status(500).json({
        message: "Something went wrong, please try again later.",
      });
    }
}

/**
 * skip a lesson in a program (by tutor).
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function skipLesson(req, res) {
    try {
       const lessonId = req.body.lesson_id;
       let programId = req.body.program_id;
       const type = req.body.type;
       const programData = await Program.find({ '_id': mysqlOrm.Types.ObjectId(programId) }, { ex_content: 1 });
       const content = programData[0].ex_content;
        if (content.length > 0) {
            for (lesson of content) {
                if (lesson.lesson_id.toString() == lessonId) {
                    lesson.is_skipped = (type === 'true') ? false : true ;
                    for (slide of lesson.slides) {
                        slide.completed = (type === 'true') ? false : true ;
                    }
                }
            }
        }

        const programStatistics = await getNewStatistics(content);
        let dataToUpdate = {};

        if(programStatistics && programStatistics.completedSlides > 0){
            if(programStatistics.completedSlides === programStatistics.totalSlides){
                dataToUpdate =  {ex_content: content,  status:"Completed", percentage: 100 }
            }else {
                let percentage = ((programStatistics.completedSlides/programStatistics.totalSlides)*100);
                dataToUpdate =  {ex_content: content,  status:"Processing", percentage: percentage }
            }    
        } else {
            dataToUpdate =  {ex_content: content, status:"N/A", percentage: 0 }
        }

        await Program.findByIdAndUpdate(programId, dataToUpdate);
        let message = "This lesson is skipped successfully!";

        if(type === 'true'){
            message = "This lesson is undo successfully!";
        }
        req.flash('success', message);
        res.status(200).json({ "success": true, redirectUrl: "/programs","message": message });
    } catch (error) {
        console.log('skipLesson: ', error);
        return res.status(500).json({
            success: false,
            redirectUrl: "/programs",
            message: "Something went wrong, please try again later.",
          });
    }
}  

/**
 * program score to update 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function getNewStatistics(programContent){
    try{
        const programStatistics= programContent.reduce((acc, lesson) => {
        const completedCount = lesson.slides.filter(slide => slide.completed).length;
                return {
                totalSlides: acc.totalSlides + lesson.slides.length,
                completedSlides: acc.completedSlides + completedCount
                };
        }, { totalSlides: 0, completedSlides: 0 });

        return programStatistics;
    } catch (error) {
        console.log('getNewStatistics: ', error);
        return error;
    }
}

/**
 * program score. 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function getProgramScores(req,res){
    try{
        let programId = req.body.program_id;
        const results = await Program.findById(programId).populate('ex_content.learning_content_id').populate('ex_content.lesson_id');
        let lessonCount = 0;
        let programCompleted = 0;
        let object = [];
        // calculate overall all program complete percentage.
        for(content of results.ex_content){
            let slideCount = 0;
            for(slide of content.slides){
                if(slide.completed){
                    slideCount++;
                }
            }
            let averageScore = ((slideCount / content.slides.length) * 100);
            if(isNaN(averageScore)){
                averageScore = 0;
            }
            averageScore = Math.round(averageScore);
            let ObjectLesson = {
                'learning_content_name' : content.learning_content_id.title,
                'learning_content_slug' : content.learning_content_id.slug,
                'lesson_id' : content.lesson_id.id,
                'lesson_name' : content.lesson_id.title,
                'lesson_slug' : content.lesson_id.slug,
                'lesson_percentage' : averageScore,
                'is_skipped' : content.is_skipped,
            }
            object.push(ObjectLesson);
            programCompleted += averageScore;
            lessonCount++;
        }
        // calculate overall all program complete percentage.
        // let programPercentage = (Math.round(programCompleted / lessonCount));
        let programPercentage = results.percentage;
        // if(Number.isInteger(programPercentage) === false){
        //     programPercentage = programPercentage.toFixed(2);
        // }
        const data = {
            'program_id':results.id,
            'program_name':results.name,
            'program_percentage':programPercentage, // programPercentage
            'program_status':results.status,
            'lessons':Object.assign({}, object),
        }

        return res.send(JSON.stringify(data));
    } catch (error) {
        console.log('getProgramScores: ', error);
        return res.status(500).json({
            message: 'Something went wrong, please try again later.'
        })
    }
}