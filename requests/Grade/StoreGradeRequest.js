const { body, validationResult } = require("express-validator");
const Grade = require("../../models/Grade");

var validateUser = () => [
  body("name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Grade Name can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("Grade Name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Grade Name length is should be in a valid range!")
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return Grade.find({ name: regex, isDeleted: false }).then((grade) => {
        if (grade.length) {
          return Promise.reject("Grade name is already in use!");
        }
      });
    })
    .bail(),
  body("status")
    .not()
    .isEmpty()
    .withMessage("The status can not be empty!")
    .bail()
    .isBoolean()
    .withMessage("Select a valid status!")
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateUser();
