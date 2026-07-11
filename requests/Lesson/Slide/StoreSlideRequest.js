const { body, validationResult } = require('express-validator');
const Lesson = require('../../../models/Lesson');
const Slide = require('../../../models/Slide');

const fs = require("fs");

var validateUser = () => [
  body('title')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Slide title can not be empty!')
    .bail()
    .isString()
    .withMessage('Slide title should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Slide title length is should be in a valid range!')
    .bail(),
    // .custom((value, { req }) => {
    //   if (req.body.slide_id != '') {
    //     return Lesson.findById(req.body.lesson_id, { "slide_ids": 1 }).populate([{
    //       path: 'slide_ids',
    //       model: 'slides',
    //       match: { "title": value, _id: { $ne: req.body.slide_id } }
    //     }]).then(data => {
    //       if (data.slide_ids.length) {
    //         return Promise.reject('Slide title is already in use!');
    //       }
    //     })
    //   } else {
    //     return Lesson.findById(req.body.lesson_id, { "slide_ids": 1 }).populate([{
    //       path: 'slide_ids',
    //       model: 'slides',
    //       match: { "title": value }
    //     }]).then(data => {
    //       if (data.slide_ids.length) {
    //         return Promise.reject('Slide title is already in use!');
    //       }
    //     })
    //   }
    // })
    //.bail(),
  body('duration')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Slide duration can not be empty!')
    .bail()
    .isString()
    .withMessage('Slide duration should be valid!')
    .bail(),
  body('description')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Slide description can not be empty!')
    .bail()
    .isString()
    .withMessage('Slide description should be valid!')
    .bail(),
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



