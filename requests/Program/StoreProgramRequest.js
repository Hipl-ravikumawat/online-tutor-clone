const { body, validationResult } = require('express-validator');
const Grade = require('../../models/Grade');
const User = require('../../models/User');
const Program = require('../../models/Program');

var validateProgram = () => [
  body('name')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Class Name can not be empty!')
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage('Class Name should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Class Name length is should be in a valid range!')
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return Program.find({ "name": regex })
        .then(program => {
          if (program.length) {
            return Promise.reject('Class name is already in use!');
          }
        })
    })
    .bail(),
  body('selected_contents')
    .isLength({ min: 1 })
    .withMessage('Please add content for the class.')
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateProgram();