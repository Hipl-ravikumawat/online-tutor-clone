const { body, validationResult } = require("express-validator");
const Voucher = require("../../models/Voucher");

var validateUser = () => [
  body("attendingClassOnTime")
    .trim()
    .not()
    .isEmpty()
    .withMessage("attendingClassOnTime can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("attendingClassOnTime must be a non-zero positive integer!")
    .bail(),
  body("askingQuestions")
    .trim()
    .not()
    .isEmpty()
    .withMessage("askingQuestions can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("askingQuestions must be a non-zero positive integer!")
    .bail(),
  body("homeworkSubmission")
    .trim()
    .not()
    .isEmpty()
    .withMessage("homeworkSubmission can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("homeworkSubmission must be a non-zero positive integer!")
    .bail(),
  body("participatingClassActivities")
    .trim()
    .not()
    .isEmpty()
    .withMessage("participatingClassActivities can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("participatingClassActivities must be a non-zero positive integer!")
    .bail(),
  body("bonusPoints")
    .trim()
    .not()
    .isEmpty()
    .withMessage("bonusPoints can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("bonusPoints must be a non-zero positive integer!")
    .bail(),
  body("assignmentGapDuration")
    .trim()
    .not()
    .isEmpty()
    .withMessage("assignmentGapDuration can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("assignmentGapDuration must be a non-zero positive integer!")
    .bail(),
  body("redemptionGapDuration")
    .trim()
    .not()
    .isEmpty()
    .withMessage("redemptionGapDuration can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("redemptionGapDuration must be a non-zero positive integer!")
    .bail(),
  body("pointAssignmentModificationPeriod")
    .trim()
    .not()
    .isEmpty()
    .withMessage("pointAssignmentModificationPeriod can not be empty!")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("pointAssignmentModificationPeriod must be a non-zero positive integer!")
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateUser();