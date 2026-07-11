const { body, validationResult } = require("express-validator");
const TutorAvailability = require("../../models/TutorAvailability");

var validateUser = () => [
  body("days")
    .isArray()
    .withMessage("Days should be an array.")
    .bail()
    .custom((value) => {
      if (value.every((day) => ["0", "1", "2", "3", "4", "5", "6"].includes(day))) {
        return true;
      }
      throw new Error("Days should contain valid numbers between 0 and 6.");
    })
    .bail(),
  body("start_date")
    .isDate({ format: "DD-MM-YYYY" })
    .withMessage("Start date should be a valid date in DD-MM-YYYY format.")
    .bail(),
  body("end_date")
    .isDate({ format: "DD-MM-YYYY" })
    .withMessage("End date should be a valid date in DD-MM-YYYY format.")
    .bail(),
  body("start_time")
    .matches(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s?(AM|PM)$/i)
    .withMessage("Start time should be a valid time in 12-hour format (e.g., 02:00 PM).")
    .bail(),
  body("end_time")
    .matches(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s?(AM|PM)$/i)
    .withMessage("End time should be a valid time in 12-hour format (e.g., 05:00 PM).")
    .bail(),
  body("note")
    .optional().
    isString().
    withMessage("Note should be a valid string."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateUser();