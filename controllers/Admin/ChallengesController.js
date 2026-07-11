
const mysqlOrm = require('mysql-orm');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
var slugify = require('slugify');
const globalHelper = require('../../_helper/GlobalHelper');
const template = require('../../config/template');

const Lesson = require('../../models/Lesson');
const Challenge = require('../../models/Challenge');
const Assessment = require('../../models/Assessment');

module.exports = {
    storeChallenge,
    editChallenge,
    updateChallengePosition,
    destroyChallenge,
    checkSubmittedAnswer, 
}

const slugify_options = {
    replacement: '-',  // replace spaces with replacement character, defaults to `-`
    remove: undefined, // remove characters that match regex, defaults to `undefined`
    lower: true,      // convert to lower case, defaults to `false`
    strict: false,     // strip special characters except replacement, defaults to `false`
    locale: 'en',       // language code of the locale to use
    trim: true         // trim leading and trailing replacement chars, defaults to `true`
}

/**
 * store or update challenge.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function storeChallenge(req, res) {
    try {    
        if (req.body.challenge_id !== '') {
            // const isAttachedInAssessment = await Assessment.find({
            //     "content.lessons": {
            //       $elemMatch: {
            //         "challenges_ids": { $in: [mysqlOrm.Types.ObjectId(req.body.challenge_id)] }
            //       }
            //     }
            //   }).limit(1).count();

            // if(isAttachedInAssessment){
            //     return res
            //     .status(404)
            //     .json({ success: false, message: "This challenge is enrolled in an assessment, So it can't be updated."});
            // }
              
            var myChallenge = {};
            if (req.body.title) {
                myChallenge["title"] = req.body.title;
            }

            if (req.body.duration) {
                myChallenge["duration"] = req.body.duration;
            }

            if (req.body.type) {
                myChallenge["type"] = req.body.type;
            }

            if (req.body.multiplication_no) {
                myChallenge["multiplication_no"] = req.body.multiplication_no;
            }

            await Challenge.findByIdAndUpdate(req.body.challenge_id, myChallenge);
            let crudMessage = 'Challenge is updated successfully!';
            req.flash('success', crudMessage);
            res.status(200).json({ "success": true, "message": crudMessage });
        } else {
            let lessonId = req.body.lesson_id;
            // Find lesson and assign challenge_ids
            const lesson = await Lesson.findOne({ "_id": mysqlOrm.Types.ObjectId(lessonId) }).populate('challenge_ids');
         
            const challenges = lesson.challenge_ids;
            let temp_pos = 0;
            if (challenges.length === 0) {
                temp_pos = 1;
            } else {
                let maxPosition = challenges.reduce((a, b) => a.position > b.position ? a : b).position;
                temp_pos = maxPosition + 1;
            }
            req.body.position = temp_pos;

            var myChallenge = {
                title: req.body.title,
                duration: req.body.duration,
                type: req.body.type,
                multiplication_no: req.body.multiplication_no,
                position: req.body.position,
            };

            let newChallenge = await Challenge.create(myChallenge);
            await Lesson.findByIdAndUpdate(lessonId, { $push: { "challenge_ids": newChallenge._id } });
            let crudMessage = 'Challenge created successfully!';
            req.flash('success', crudMessage);
            res.status(200).json({ "success": true, "message": crudMessage });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
      }
}

/**
 * edit challenge form.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function editChallenge(req, res) {
    try {
        let challengeId = req.body.challengeId;
        const challenge = await Challenge.findById(challengeId);
        res.status(200).json({ "success": true, "data": challenge });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * destroy a challenge.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function destroyChallenge(req, res) {
    try {
        let requestSegments = req.originalUrl.split('/');
        let lessonSlug = requestSegments[4];
        let challengeId = mysqlOrm.Types.ObjectId(req.params.challengeId);

        let referencedInAssessment = await Assessment.find({
            "content.lessons": {
              $elemMatch: {
                "challenges_ids": { $in: [challengeId] }
              }
            }
          }).limit(1).count();

        if (referencedInAssessment) {
            return res.status(400).json({
                success: false,
                redirectUrl: "page-reload",
                message:
                  "This challenge is currently enrolled in an assessment and cannot be deleted at this time.",
            });
        }    
 
        await Challenge.findByIdAndDelete(req.params.challengeId);
        await Lesson.updateOne({ "slug": lessonSlug }, { $pull: { challenge_ids: challengeId } });
  
        let crudMessage = 'Challenge is deleted successfully!';
        req.flash('success', crudMessage);
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
 * update challenge position.
 */
async function updateChallengePosition(req, res) {
    try {
        let positions = req.body.positions;
        if (positions.length > 0) {
            for (position of positions) {
                await Challenge.findByIdAndUpdate(position[0], {
                    position: position[1],
                });
            }
            let crudMessage = "Challenge is reordered successfully!";
            req.flash('success', crudMessage);
            res.status(200).json({ "success": true, "message": crudMessage });
        }else {
            res.status(404).json({ "success": false, "message": "Something went wrong." });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}

/**
 * check submitted answer during a challenge.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function checkSubmittedAnswer(req, res) {
    try {
        let lessonId = mysqlOrm.Types.ObjectId(req.body.lessonId);
        let challengeId = mysqlOrm.Types.ObjectId(req.body.challengeId);
        let practiceId = mysqlOrm.Types.ObjectId(req.body.practiceId);
        let submittedAnswer = req.body.submittedAnswer;
        let correctAnswer = '';

        let results = await Lesson.find({ "_id": lessonId }, { "practices": 1 }).populate({
            path: 'practice_ids',
            model: 'practices',
            match: { '_id': practiceId }
        });
        if (results[0].practice_ids[0] != undefined) {
            let options = results[0].practice_ids[0].options;
            for (option of options) {
                if (option.option_correct) {
                    correctAnswer = option.option_text;
                }
            }
        }
        final_data = JSON.stringify({
            "submitted_answer": submittedAnswer,
            "correct_answer": correctAnswer
        });

        return res.send(final_data);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
          message: "Something went wrong, please try again later.",
        });
    }
}