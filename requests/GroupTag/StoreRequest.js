const { body, validationResult } = require("express-validator");
const GroupTag = require("../../models/GroupTag");

var validateRequest = () => [
  body("name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Group tag Name can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("Group tag Name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Group tag Name length is should be in a valid range!")
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return GroupTag.find({ name: regex, isDeleted: false }).then((grade) => {
        if (grade.length) {
          return Promise.reject("Group tag name is already in use!");
        }
      });
    })
    .bail(),
  body("color")
    .not()
    .isEmpty()
    .withMessage("The color can not be empty!")
    .bail(),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateRequest();
