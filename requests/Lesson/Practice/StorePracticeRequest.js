const { body, validationResult } = require('express-validator');
const Lesson = require('../../../models/Lesson');
const Practice = require('../../../models/Slide');
const fs = require("fs");

var validateUser = () => [
  body('question_title')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Practice title can not be empty!')
    .bail()
    .isString()
    .withMessage('Practice title should be valid!')
    // .bail()
    // .custom((value, { req }) => {
    //   if (req.body.practice_id != '') {
    //     return Lesson.findById(req.body.lesson_id, { "practice_ids": 1 }).populate([{
    //       path: 'practice_ids',
    //       model: 'practices',
    //       match: { "question_title": value, _id: { $ne: req.body.practice_id } }
    //     }]).then(data => {
    //         if (data.practice_ids.length) {
    //           return Promise.reject('Practice title is already in use!');
    //         }
    //       })
    //   } else {
    //     return Lesson.findById(req.body.lesson_id, { "practice_ids": 1 }).populate([{
    //       path: 'practice_ids',
    //       model: 'practices',
    //       match: { "question_title": value }
    //     }]).then(data => {
    //       if (data.practice_ids.length) {
    //         return Promise.reject('Practice title is already in use!');
    //       }
    //     })
    //   }
    // })
    .bail(),
    body('question')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Practice Question can not be empty!')
    .bail()
    .isString()
    .withMessage('Practice Question should be valid!')
    .bail(),
  body('question_duration')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Practice duration can not be empty!')
    .bail()
    .isString()
    .withMessage('Practice duration should be valid!')
    .bail(),
  // body('option_display_preference').isBoolean()
  // .withMessage('Display Preference can not be empty!')
  //   .bail(),  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files.length > 0) {
        for (file of req.files) {
          fs.unlink(file.path, (err) => {
            if (err) {
            }
            console.log(`successfully deleted ${file.path}`);
          });
        }
      }
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateUser();



