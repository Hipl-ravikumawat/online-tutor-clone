const { body, validationResult } = require('express-validator');
const Topic = require('../../models/Topic');

var validateUser = () => [
  body('name')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Topic Name can not be empty!')
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage('Topic Name should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Topic Name length is should be in a valid range!')
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return Topic.find({ "name": regex, isDeleted: false })
        .then(topic => {
          if (topic.length) {
            return Promise.reject('Topic name is already in use!');
          }
        })
    })
    .bail(),
  body('note')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Note should be a valid string!')
    .bail(),
  body('status')
    .not()
    .isEmpty()
    .withMessage('The status can not be empty!')
    .bail()
    .isBoolean()
    .withMessage('Select a valid status!')
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateUser();
