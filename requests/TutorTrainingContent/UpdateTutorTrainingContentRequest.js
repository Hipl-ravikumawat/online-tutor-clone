const { body, validationResult } = require('express-validator');
const Grade = require('../../models/Grade');
const Topic = require('../../models/Topic');
const TutorTrainingContent = require('../../models/TutorTrainingContent');
const fs = require("fs");


var validateUser = () => [
  body('title')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Content title can not be empty!')
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage('Content title should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content title length is should be in a valid range!')
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return TutorTrainingContent.findOne({ "title": regex, _id: { $ne: req.body.content_id } })
        .then(tutorTrainingContent => {
          if (tutorTrainingContent != null) {
            return Promise.reject('Content title is already in use!');
          }
        })
    })
    .bail(),
  body('topic_id')
    .trim()
    .not()
    .isEmpty()
    .withMessage('MainTopic is required!')
    .bail()
    .isString()
    .withMessage('MainTopic should be a valid string!')
    .bail()
    .custom((value, { req }) => {
      return Topic.find({ "_id": value })
        .then(topic => {
          if (topic.length == 0) {
            return Promise.reject('Please select a valid MainTopic!');
          }
        })
    })
    .bail(),
  body('short_description')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Content description can not be empty!')
    .bail()
    .isString()
    .withMessage('Content description should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content description length is should be in a valid range!')
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file != undefined) {
        // console.log(req.file);
        fs.unlink(req.file.path, (err) => {
          if (err) {
          }

          fs.rmdir(req.file.destination, () => {
            if (err) {
            }  
            console.log(`successfully deleted ${req.file.destination}`);

          });
          console.log(`successfully deleted ${req.file.path}`);

        });
      }
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateUser();