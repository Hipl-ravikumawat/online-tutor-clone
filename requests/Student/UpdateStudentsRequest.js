const { body, validationResult } = require("express-validator");
const User = require("../../models/User");
const Grade = require("../../models/Grade");
const School = require("../../models/School");

var validateUser = () => [
  body("first_name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("First Name can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("First Name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("First Name length is should be in a valid range!")
    .bail(),
  body("last_name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Last Name can not be empty!")
    .bail()
    .isString()
    .withMessage("Last Name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Last Name length is should be in a valid range!")
    .bail(),
  body("time_zone")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Time Zone can not be empty!")
    .bail()
    .isString()
    .withMessage("Time Zone should be a valid string!")
    .bail(),
  body("email")
    .optional({ checkFalsy: true }) 
    .trim()
    .isString()
    .withMessage("Email should be a valid string!")
    .bail()
    .isEmail()
    .withMessage("Input must be a valid email!")
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return User.findOne({
        email: regex,
        isDeleted: false,
        _id: { $ne: req.body.student_id },
      }).then((student) => {
        if (student != null) {
          return Promise.reject("Email is already in use!");
        }
      });
    })
    .bail(),
    body('password')
    .optional({ checkFalsy: true })
    .not()
    .isEmpty() 
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .bail()
    .custom((value) => {
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecialChar = /[@$!%*?&]/.test(value);
      const hasNoWhitespace = /\s/.test(value);
  
      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar || hasNoWhitespace) {
        throw new Error('Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character, and no whitespace.');
      }
      return true;
    })
    .withMessage('Password must contain at least 1 uppercase, 1 lowercase, 1 number, 1 special character, and no whitespace.')
    .bail(),
  body("phone")
    .optional({ checkFalsy: true }) 
    .isInt()
    .withMessage("Phone no. should be valid number.")
    .trim()
    .bail()
    .custom((value, { req }) => {
      return User.findOne({
        dial_code: req.body.dial_code,
        phone: value,
        isDeleted: false,
        _id: { $ne: req.body.student_id },
      }).then((student) => {
        if (student != null) {
          return Promise.reject("Phone no. is already in use!");
        }
      });
    })
    .bail(),
    body("ndis_number")
    .optional({ checkFalsy: true }) 
    .trim()
    .custom((value, { req }) => {
      return User.findOne({
        ndis_number: value,
        isDeleted: false,
        _id: { $ne: req.body.student_id },
      }).then((student) => {
        if (student != null) {
          return Promise.reject("NDIS no. is already in use!");
        }
      });
    })
    .bail(),
  body("gender")
    .not()
    .isEmpty()
    .withMessage("The gender can not be empty!")
    .bail()
    .isBoolean()
    .withMessage("Select a valid gender!")
    .bail(),
  body("grade_id")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Grade can not be empty!")
    .bail()
    .isString()
    .withMessage("Grade should be a valid string!")
    .bail()
    .custom((value, { req }) => {
      return Grade.find({ _id: value }).then((grade) => {
        if (grade.length == 0) {
          return Promise.reject("Select A Valid Grade!");
        }
      });
    })
    .bail(),
  body("school_id")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("School should be a valid string!")
    .bail()
    .custom((value, { req }) => {
      return School.find({ _id: value }).then((school) => {
        if (school.length == 0) {
          return Promise.reject("Select A Valid School!");
        }
      });
    })
    .bail(),
  body("note")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Note should be a valid string!")
    .bail(),
    body("status")
    .not()
    .isEmpty()
    .withMessage("The status can not be empty!")
    .bail()
    .isInt()
    .withMessage("Select a valid status!")
    .bail()
    .isIn([0, 1, 2, 3])
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
