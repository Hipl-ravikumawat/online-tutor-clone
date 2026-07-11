const { body, validationResult } = require('express-validator');
const Grade = require('../../models/Grade');
const User = require('../../models/User');
const Assessment = require('../../models/Assessment');

var validateAssessment = () => [
  body('name')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Assessment Name can not be empty!')
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage('Assessment Name should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Assessment Name length is should be in a valid range!')
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return Assessment.find({ "name": regex })
        .then(assessment => {
          if (assessment.length) {
            return Promise.reject('Assessment name is already in use!');
          }
        })
    })
    .bail(),
  // body('grade_id')
  //   .trim()
  //   .not()
  //   .isEmpty()
  //   .withMessage('Grade can not be empty!')
  //   .bail()
  //   .isString()
  //   .withMessage('Grade should be a valid string!')
  //   .bail()
  //   .custom((value, { req }) => {
  //     return Grade.find({ "_id": value })
  //       .then(grade => {
  //         if (grade.length == 0) {
  //           return Promise.reject('Select A Valid Grade!');
  //         }
  //       })
  //   })
  //   .bail(), 
  body('student_ids')
  .exists()
  .withMessage('Student can not be empty!')
  .bail(),
  body('date')
    .trim()
    .not()
    .isEmpty()
    .withMessage('date can not be empty!')
    .bail()
    .isString()
    .withMessage('date should be a valid date!')
    .bail(),
  body('selected_contents')
    .isLength({ min: 1 })
    .withMessage('Please add content for the program.')
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();    
  },
];

module.exports = validateAssessment();