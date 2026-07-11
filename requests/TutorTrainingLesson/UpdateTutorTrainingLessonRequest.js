const { body, validationResult } = require('express-validator');
const TutorTrainingLesson = require('../../models/TutorTrainingLesson');


var validateUser = () => [
  body('title')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Lesson title can not be empty!')
    .bail()
    .isString()
    .withMessage('Lesson title should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Lesson title length is should be in a valid range!')
    .bail()
    .custom((value, { req }) => {
        return TutorTrainingLesson.findOne({ title: req.body.title, _id: {$ne: req.params.id}})
        .then(lesson => {
          if (lesson != null) {
            return Promise.reject('Lesson title is already in use!');
          }
        })
    })
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateUser();