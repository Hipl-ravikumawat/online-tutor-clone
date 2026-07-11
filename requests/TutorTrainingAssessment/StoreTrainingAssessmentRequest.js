const { body, validationResult } = require('express-validator');
const TutorTrainingAssessment = require('../../models/TutorTrainingAssessment');

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
    .isLength({ min: 1, max: 255 })
    .withMessage('Assessment Name length is should be in a valid range!')
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return TutorTrainingAssessment.find({ "name": regex })
        .then(assessment => {
          if (assessment.length) {
            return Promise.reject('Assessment name is already in use!');
          }
        })
    })
    .bail(),
  body('tutor_ids')
  .exists()
  .withMessage('Please select at least one tutor!')
  .bail(),
  body('selected_contents')
    .isLength({ min: 1 })
    .withMessage('Please add content for the assessment.')
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();    
  },
];

module.exports = validateAssessment();