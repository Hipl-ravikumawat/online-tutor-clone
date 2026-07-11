const { body, validationResult } = require('express-validator');


const markAttendanceRequest = () => [
  body("event_id")
    .notEmpty()
    .withMessage("Event is required")
    .bail(),

  body("student_id")
    .notEmpty()
    .withMessage("Student is required")
    .bail(),

  body("attendance_status")
    .notEmpty()
    .withMessage("Attendance status is required")
    .bail(),

  body("lesson_price_paid_at_lesson")
    .if((value, { req }) => req.body.is_lesson_price_paid_at_lesson === 'true')
    .notEmpty()
    .withMessage("Paid at lesson is required")
    .bail()
    .isFloat({ gt: 0 })
    .withMessage("Paid at lesson must be greater than 0")
    .bail(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = markAttendanceRequest();
