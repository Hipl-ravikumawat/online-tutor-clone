const { body, validationResult } = require("express-validator");
var validateChallenge = () => [
  body("title")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Title can not be empty!")
    .bail()
    .isString()
    .withMessage("Title should be valid!")
    .bail(),
  body("duration")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Duration can not be empty!")
    .bail()
    .isString()
    .withMessage("Duration should be valid!")
    .bail(),
  body("type")
    .isString()
    .withMessage("Type should be valid!")
    .bail()
    .isIn(["multiplication"])
    .withMessage("Select type must be multiplication!"),
  body("multiplication_no")
    .not()
    .isEmpty()
    .withMessage("Number can not be empty!")
    .isInt({ min: 1 })
    .withMessage("Number must be an integer greater than zero!")
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateChallenge();
