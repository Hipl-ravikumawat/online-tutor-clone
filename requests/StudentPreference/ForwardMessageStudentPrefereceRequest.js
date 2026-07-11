const { body, validationResult } = require("express-validator");

const forwardMessageStudentPreferenceRequest = [
  body("from_mail")
    .notEmpty().withMessage("Sender email is required.")
    .isEmail().withMessage("Sender email must be a valid email."),
  body("to_mail")
    .isArray({ min: 1 }).withMessage("At least one recipient is required."),
  body("subject")
    .notEmpty().withMessage("Subject is required."),
  body("message")
    .notEmpty().withMessage("Message body is required."),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = forwardMessageStudentPreferenceRequest;
