const { body, validationResult } = require('express-validator');
const Lesson = require('../../models/Lesson');
const fs = require("fs");

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
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return Lesson.find({ title: regex, isDeleted: false }).then((lesson) => {
        if (lesson.length) {
          return Promise.reject("Lesson title is already in use!");
        }
      });
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



