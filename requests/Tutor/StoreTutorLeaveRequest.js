const { body, validationResult } = require("express-validator");
const TutorLeave = require("../../models/TutorLeave");

var validateUser = () => [
  body("start_date")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("Start date should be a valid date in YYYY-MM-DD format.")
    .bail()
    .custom(async (value, { req }) => {
      const tutor_id = req.res.locals.loggedUserInfo._id.toString();
      const { end_date, leave_request_id } = req.body;

      if (!end_date) return true; // wait until end_date exists

      const startDate = new Date(value);
      const endDate = new Date(end_date);

      // Overlap check
      const existingLeave = await TutorLeave.findOne({
        tutor_id: tutor_id,
        _id: { $ne: leave_request_id || null }, // ignore self when updating
        start_date: { $lte: endDate },
        end_date: { $gte: startDate },
        isApproved: { $in: [1, 2] },       
      });

      if (existingLeave) {
        throw new Error("You have already requested leave for this date or a selected date range overlaps with an existing leave.");
      }

      return true;
    }),

  body("end_date")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("End date should be a valid date in YYYY-MM-DD format.")
    .bail()
    .custom((value, { req }) => {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(value);

      if (endDate < startDate) {
        throw new Error("You have already requested leave for this date or a selected date range overlaps with an existing leave.");
      }

      return true;
    }),

  body("note")
  .trim()
  .notEmpty()
  .withMessage("Reason for leave is required.")
  .bail()
  .isLength({ min: 1, max: 500 })
  .withMessage("Reason for leave must be between 1 and 500 characters."),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateUser();