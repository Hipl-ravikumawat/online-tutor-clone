
const mysqlOrm = require('mysql-orm');
const fs = require('fs');
const path = require('path');
const Assessment = require('../../models/Assessment');
const Lesson = require('../../models/Lesson');
const Practice = require('../../models/Practice');

module.exports = {
    storePractice,
    editPractice,
    updatePractice,
    updatePracticePosition,
    duplicatePractice,
    destroyPractices,

    // additional
    checkPracticeAnswer,
    checkDragAndDropAnswer,
    deleteAttachmentFromFolder,
}

/**
 * store a new Practices.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function storePractice(req, res) {
    try {
        let lessonId = req.body.lesson_id;
        let fileName = req.files;
        let optionImage = [];
        req.body.question_image = '';
        req.body.question_audio = '';
        if (fileName.length > 0) {
            for (file of fileName) {
                if (file.fieldname == 'question_image') {
                    if (typeof (file.filename) != "undefined") {
                        req.body.question_image = file.filename;
                    }
                } else if (file.fieldname == 'question_audio') {
                    if (typeof (file.filename) != "undefined") {
                        req.body.question_audio = file.filename;
                    }
                } else {
                    optionImage.push(file);
                }
            }
        } else {
            req.body.question_image = '';
            req.body.question_audio = '';
        }
        let options = {};
        if (req.body.question_type != 'drag_and_drop') {
            if (req.body.options != undefined) {
                options = JSON.parse(JSON.stringify(req.body.options));
                options.forEach(function (item, index) {
                    if (optionImage.length > 0 && optionImage[index].filename) {
                        item['option_image'] = optionImage[index].filename;
                    }
                    if (item['option_correct']) {
                        item['option_correct'] = true;
                    } else {
                        item['option_correct'] = false;
                    }
                });
            } else {
                options = '';
            }
        } else {
            options = []
            allOptions = req.body.options.split(",");
            CorrectOptions = req.body.correct_options.split(",");
            let length = CorrectOptions.length;
            allOptions.forEach(function (item, index) {
                if (index < length) {
                    options.push({ 'option_text': item, 'option_correct': true });
                } else {
                    options.push({ 'option_text': item, 'option_correct': false });
                }
            });
        }
        let lessonDataFetched = await Lesson.findOne({ "_id": mysqlOrm.Types.ObjectId(lessonId) }).populate('practice_ids');
        let position = 0;
        if (lessonDataFetched != null) {
            let allPractices = lessonDataFetched.practice_ids;
            if (lessonDataFetched.practice_ids.length === 0) {
                position = 1;
            } else {
                maxPosition = allPractices.reduce((a, b) => a.position > b.position ? a : b).position;
                position = maxPosition + 1;
            }
        }

        if(req.body.question_type === 'text'){
            let keywords = req.body.keywords;
            options = []
            if(keywords){
                let splitArray = keywords.split(','); 
                const trimmedLowerCaseValues = splitArray.map(value => value.trim().toLowerCase());
                const uniqueValues = [...new Set(trimmedLowerCaseValues)];
                let keywordArray = [];
                for(word of uniqueValues){
                    let obj = { 
                        'option_image': null,
                        'option_text': word,
                        'option_correct': false, 
                    }
                    keywordArray.push(obj);
                }
                options = keywordArray;
            }
        }
        const object = {};
        object["question_type"] = req.body.question_type;
        object["question_title"] = req.body.question_title;
        object["question"] = req.body.question;
        object["question_duration"] = req.body.question_duration;
        object["question_explanation"] = req.body.question_explanation;
        object["content_directory"] = req.body.content_directory;
        object["question_image"] = req.body.question_image;
        object["question_audio"] = req.body.question_audio;
        object["position"] = position;
        object["option_display_preference"] = req.body.option_display_preference;
        object["challenges_listing"] = req.body.challenges_listing ? true : false;
        object["options"] = options;

        let newPractice = await Practice.create(object);
        const updatedLesson = await Lesson.findOneAndUpdate({ "_id": lessonId }, {
            $push: {
                "practice_ids": newPractice._id
            },
        },{ new: true }
        );
        let crudMessage = "Practice is added successfully!";
        req.flash('success', crudMessage);
        res.status(200).json({ "success": true, "message": crudMessage });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * edit practice form.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function editPractice(req, res) {
    try { 
        const practiceId = req.body.practice_id;
        const practice= await Practice.findById(practiceId);     
        res.status(200).json({ "success": true, "data": practice});
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * update a Practices.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function updatePractice(req, res) {
    try {
        let ImageDir = '';
        let fileName = req.files;
        let optionImage = {};
        let imageFlag = false;
        let audioFlag = false;
        if (req.body.practice_id != '') {
            // const isAttachedInAssessment = await Assessment.find({
            //     "content.lessons": {
            //       $elemMatch: {
            //         "practice_ids": { $in: [mysqlOrm.Types.ObjectId(req.body.practice_id)] }
            //       }
            //     }
            // }).limit(1).count();

            // if(isAttachedInAssessment){
            //     return res
            //     .status(404)
            //     .json({ success: false, message: "This practice is enrolled in an assessment, So it can't be updated."});
            // }
            
            let practice = await Practice.findById(req.body.practice_id);
            let oldOptions = practice.options;
            // console.log(oldOptions,'oldOptions');
            ImageDir = `./assets/LearningContent/${practice.content_directory}/`;
            const isValidQuestionImage = typeof practice.question_image === 'string' && practice.question_image.trim() !== '';
            const isValidQuestionAudio = typeof practice.question_audio === 'string' && practice.question_audio.trim() !== '';
            
            if (fileName.length > 0) {
                for (file of fileName) {
                    if (file.fieldname == 'question_image') {
                        if (typeof (file.filename) != "undefined") {
                            imageFlag = true;
                            req.body.question_image = file.filename;
                            if (isValidQuestionImage) {
                                const filePath = `${ImageDir}${practice.question_image}`;
                                deleteAttachmentFromFolder(filePath); // delete attachment from folder 
                            }
                        } 
                    } else if (file.fieldname == 'question_audio') {
                        if (typeof (file.filename) != "undefined") {
                            audioFlag = true;
                            req.body.question_audio = file.filename;
                            if (isValidQuestionAudio) {
                                const filePath = `${ImageDir}${practice.question_audio}`;
                                deleteAttachmentFromFolder(filePath); // delete attachment from folder 
                            }
                        } 
                    }else{
                        const startIndex = file.fieldname.indexOf("[") + 1;
                        const endIndex = file.fieldname.indexOf("]");
                        const index = file.fieldname.substring(startIndex, endIndex);
                        optionImage[index] = file.filename;
                    }
                }
            }else {
                if (req.body.is_remove == 1) {
                    imageFlag = true;
                    if (isValidQuestionImage) {
                        const filePath = `${ImageDir}${practice.question_image}`;
                        deleteAttachmentFromFolder(filePath); // delete attachment from folder 
                    }
                    req.body.question_image = '';
                }
                if (req.body.is_audio_removed == 1) {
                    audioFlag = true;
                    if (isValidQuestionAudio) {
                        const filePath = `${ImageDir}${practice.question_audio}`;
                        deleteAttachmentFromFolder(filePath); // delete attachment from folder 
                    }
                    req.body.question_audio = '';
                }
            }
            // console.log(optionImage,"optionImage");
            let options = req.body.options;
            let finalOptionData = [];
            if (req.body.question_type != 'drag_and_drop') {
                if (options != undefined) {
                    let optionObject = JSON.parse(JSON.stringify(options));
                    optionObject.forEach((item, index) => {
                        let image = ''
                        if(item.is_remove_option === '0'){
                            if(optionImage[index] === undefined){
                                if(oldOptions[index] !== undefined){
                                    image = oldOptions[index].option_image;
                                }
                                // console.log('case 1',image);
                            }else{
                                image = optionImage[index];
                                // console.log('case 2', image);
                            }
                        }
                        finalOptionData.push({
                            option_text:item.option_text,
                            option_image:image,
                            option_correct:(item.option_correct === 'on') ? true:false,
                        })
                    });
                }
            }else{
                allOptions = req.body.options.split(",");
                CorrectOptions = req.body.correct_options.split(",");
                let length = CorrectOptions.length;
                allOptions.forEach(function (item, index) {
                    if (index < length) {
                        finalOptionData.push({ 'option_text': item, 'option_correct': true });
                    } else {
                        finalOptionData.push({ 'option_text': item, 'option_correct': false });
                    }
                });
            }
            if(req.body.option_display_preference == 'text'){
                const updatedData = finalOptionData.map(obj => ({ ...obj, option_image: "",is_remove_option:1 }));
                finalOptionData = updatedData;
            }
            if(req.body.option_display_preference == 'image'){
                const updatedData = finalOptionData.map(obj => ({ ...obj, option_text: "" }));
                finalOptionData = updatedData;
            }
            const object = {};
            object["question_title"] = req.body.question_title;
            object["question"] = req.body.question;
            object["question_type"] = req.body.question_type;
            object["question_duration"] = req.body.question_duration;
            object["question_explanation"] = req.body.question_explanation;
            object["content_directory"] = req.body.content_directory;
            if (imageFlag) {
                object["question_image"] = req.body.question_image;
            }
            if (audioFlag) {
                object["question_audio"] = req.body.question_audio;
            }

            if(req.body.question_type === 'text'){
                let keywords = req.body.keywords;
                options = []
                if(keywords){
                    let splitArray = keywords.split(','); 
                    const trimmedLowerCaseValues = splitArray.map(value => value.trim().toLowerCase());
                    const uniqueValues = [...new Set(trimmedLowerCaseValues)];
                    let keywordArray = [];
                    for(word of uniqueValues){
                        let obj = { 
                            'option_image': null,
                            'option_text': word,
                            'option_correct': false, 
                        }
                        keywordArray.push(obj);
                    }
                    finalOptionData = keywordArray;
                }
            }

            object["option_display_preference"] = req.body.option_display_preference;
            object["challenges_listing"] = req.body.challenges_listing ? true : false;
            object["options"] = finalOptionData;

            await Practice.findByIdAndUpdate(req.body.practice_id, object);
            let crudMessage = "Practice is updated successfully!";
            req.flash('success', crudMessage);
            res.status(200).json({ "success": true, "message": crudMessage});
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * updatePracticePosition
 */
async function updatePracticePosition(req, res) {
    try {
        let positions = req.body.positions;
        if (positions.length > 0) {
            for (position of positions) {
                await Practice.findByIdAndUpdate(position[0], {
                    position: position[1],
                });
            }
            let crudMessage = "Practice is reordered successfully!";
            req.flash("success", crudMessage);
            res.status(200).json({ success: true, message: crudMessage });
        } else {
            res.status(404).json({ success: false, message: "Something went wrong." });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * store a new practice.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function duplicatePractice(req, res) {
    try {
        const lessonId = req.body.lessonId;
        const practiceId = req.body.id;
        const practice = await Practice.findById(practiceId);
        const Obj = {
            "question_type": practice.question_type,
            "question_title": practice.question_title,
            "question": practice.question,
            "question_duration": practice.question_duration,
            "question_explanation": practice.question_explanation,
            "content_directory": practice.content_directory,
            "question_image": practice.question_image,
            "question_audio": practice.question_audio,
            "option_display_preference": practice.option_display_preference,
            "challenges_listing": practice.challenges_listing,
            // "options": ((practice.question_type === 'text') ? null : practice.options),
            "options": practice.options,
        }

        let duplicatePractice = await Practice.create(Obj);
        const updatedLesson = await Lesson.findByIdAndUpdate(lessonId, { $push: { "practice_ids": duplicatePractice._id } });

        //-- Duplicate Media
        const contentDirectory = practice.content_directory;
        const isValidQuestionImage = typeof practice.question_image === 'string' && practice.question_image.trim() !== '';
        const isValidQuestionAudio = typeof practice.question_audio === 'string' && practice.question_audio.trim() !== '';
  
        if (isValidQuestionImage) {
            let questionImage = practice.question_image.split("-");
            questionImage[0] = Date.now();
            newQuestionImage = questionImage.join("-");
            fs.copyFile(
                `./assets/LearningContent/${contentDirectory}/${practice.question_image}`,
                `./assets/LearningContent/${contentDirectory}/${newQuestionImage}`,
                (err) => {
                  if (err) throw err;
                }
            );
        }

        if (isValidQuestionAudio) {
            let questionAudio = practice.question_audio.split("-");
            questionAudio[0] = Date.now();
            newQuestionAudio = questionAudio.join("-");
            fs.copyFile(
                `./assets/LearningContent/${contentDirectory}/${practice.question_audio}`,
                `./assets/LearningContent/${contentDirectory}/${newQuestionAudio}`,
                (err) => {
                  if (err) throw err;
                }
            );
        }

        if (practice.options && practice.options.length > 0 && practice.option_display_preference !== 'text') {
            for (option of practice.options) {
                const isValidOptionImage = typeof option.option_image === 'string' && option.option_image.trim() !== '';
                if (isValidOptionImage) {
                    let optionImage = option.option_image.split("-");
                    optionImage[0] = Date.now();
                    newOptionImage = optionImage.join("-");
                    fs.copyFile(
                        `./assets/LearningContent/${contentDirectory}/${option.option_image}`,
                        `./assets/LearningContent/${contentDirectory}/${newOptionImage}`,
                        (err) => {
                          if (err) throw err;
                        }
                    );
                }
            }
        }
        //-- Duplicate Media

        let crudMessage = "Practice is duplicated successfully!";
        req.flash('success', crudMessage);
        return res.status(200).json({
          success: true,
          redirectUrl: "",
          message: crudMessage,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}


/**
 * destroy a practice.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function destroyPractices(req, res) {
    try {
        let requestSegments = req.originalUrl.split("/");
        let lessonSlug = requestSegments[4];
        let practiceId = mysqlOrm.Types.ObjectId(req.params.practiceId);

        let referencedInAssessment = await Assessment.find({
          "content.lessons": {
            $elemMatch: {
              "practice_ids": { $in: [practiceId] }
            }
          }
        }).limit(1).count();
        
        if (referencedInAssessment) {
            return res.status(400).json({
                success: false,
                redirectUrl: "page-reload",
                message:
                  "This practice is currently enrolled in an assessment and cannot be deleted at this time.",
            });
        } 

        const practice = await Practice.findById(req.params.practiceId);
        const isValidQuestionImage = typeof practice.question_image === 'string' && practice.question_image.trim() !== '';
        const isValidQuestionAudio = typeof practice.question_audio === 'string' && practice.question_audio.trim() !== '';

        if (isValidQuestionImage) {
            const filePath = `./assets/LearningContent/${practice.content_directory}/${practice.question_image}`;
            fs.exists(filePath, function (exists) {
                if (exists) {
                    fs.unlinkSync(filePath);
                } else {
                    console.log('The question image is not found, so not deleted.');
                }
            });
        }

        if (isValidQuestionAudio) {
            const filePath = `./assets/LearningContent/${practice.content_directory}/${practice.question_audio}`;
            fs.exists(filePath, function (exists) {
                if (exists) {
                    fs.unlinkSync(filePath);
                } else {
                    console.log('The question audio is not found, so not deleted.');
                }
            });
        }

        if (practice.options && practice.options.length > 0 && practice.option_display_preference !== 'text') {
            for (option of practice.options) {
                if (option.option_image !== "") {
                    const filePath = `./assets/LearningContent/${practice.content_directory}/${option.option_image}`;
                    fs.exists(filePath, function (exists) {
                        if (exists) {
                            fs.unlinkSync(filePath);
                        } else {
                            console.log('The option image is not found, so not deleted.');
                        }
                    });
                }
            }
        }

        await Practice.findByIdAndDelete(practiceId);
        await Lesson.updateOne({ "slug": lessonSlug }, { $pull: { practice_ids: practiceId } });

        let crudMessage = "Practice is deleted successfully!";
        req.flash("success", crudMessage);
        return res.status(200).json({
          success: true,
          redirectUrl: "page-reload",
          message: crudMessage,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}


/**
 * submit question answer
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function checkPracticeAnswer(req, res) {
    try {
        const user_detail = res.locals.loggedUserInfo;
        let student_assessment_attachment = '';
        if (req.files.length > 0 && req.files[0].filename && req.files[0].filename != undefined) {
            student_assessment_attachment = req.files[0].filename
        }

        let practice = await Practice.findById(req.body.practice_id);
        let final_data = JSON.stringify({
            "submitted_answer": [],
            "correct_answer": [],
            "homework_id": '',
            "user_id": user_detail.role,
            "student_assessment_attachment": '',
        });
        if(practice){
            let homeworkId = '';
            let value = (req.body.question !== undefined) ? req.body.question : '';
            let correct = [];
            let data = [];
    
            if (practice.question_type == 'text') {
                data = [];              
                correct = await matchTextTypeKeyword(req.body.question_explanation, practice.options);
            } else {
                for (practice of practice.options) {
                    if (value.includes(practice.id)) {
                        data.push({ 'id': practice.id, 'description': practice.option_explanation });
                    }
                    if (practice.option_correct) {
                        correct.push({ 'id': practice.id, 'description': practice.option_explanation });
                    }
                }
            }
    
            final_data = JSON.stringify({
                "submitted_answer": data,
                "correct_answer": correct,
                "homework_id": homeworkId,
                "user_id": user_detail.role,
                "student_assessment_attachment": student_assessment_attachment,
            });
        }
        return res.send(final_data);
    }  catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * submit question answer
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function checkDragAndDropAnswer(req, res) {
    try {
        let practiceId = req.body.practice_id;
        const practice = await Practice.findById(practiceId);
        if(practice){
            const correctAnswer = [];
            let allOptions = practice.options;
            let homeworkId = '';
            for (option of allOptions) {
                if (option.option_correct) {
                    correctAnswer.push(option.option_text);
                }
            }
            let final_data = JSON.stringify({
                "correctAnswer": correctAnswer,
                "homework_id": homeworkId
            });
            return res.send(final_data);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * delete an attachment from folder.
 * @param {*} filePath 
 */
async function deleteAttachmentFromFolder(filePath) {
    fs.exists(filePath, function (exists) {
        if (exists) {
            fs.unlinkSync(filePath);
        } else {
            console.log('The file not found, so not deleted.');
        }
        return;
    });
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
            if (option.option_text != undefined && option.option_text != null && option.option_text != '' && textArray.includes(option.option_text.toLowerCase())) {
                option.option_correct = true;
            }
        }
    }
    return keywords;
}