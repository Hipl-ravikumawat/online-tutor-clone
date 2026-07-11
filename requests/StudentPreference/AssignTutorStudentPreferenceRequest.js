const { body, validationResult } = require('express-validator');
// const AssignedTutors = require('../../models/AssignedTutors');

var validateTutor = () => [
    body("tutor_id")
    // .if((value, { req }) => req.body.tutor_id !== tutor.id)
    .trim()
    .notEmpty()
    .withMessage("Please select a Tutor.")
    .bail()
    .isString()
    .withMessage("Tutor ID should be a valid string."),
  
  body("default_lesson_category")
    .trim()
    .notEmpty()
    .withMessage("Please select a Default lesson category"),

  body("default_duration")
    .notEmpty()
    .withMessage("Please enter default duration")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Duration must be a non-negative number."),

  body("price")
    .notEmpty()
    .withMessage("Please enter price")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number."),

  body("billing_list")
    .notEmpty()
    .withMessage("Please select a default billing option."),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({ errors: errors.array() });
        }
        next();
      },
];

module.exports = validateTutor();

