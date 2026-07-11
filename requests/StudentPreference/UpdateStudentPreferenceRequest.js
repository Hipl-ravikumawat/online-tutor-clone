const { body, validationResult } = require("express-validator");
const User = require("../../models/User");

var validateUser = () => [
        body("first_name")
          .if((value, { req }) => req.body.contact_type === 'person')
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
          .if((value, { req }) => req.body.contact_type === 'person')
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
    body("company_name")
       .if((value, { req }) => req.body.contact_type === 'company')
        .trim()
        .not()
        .isEmpty()
        .withMessage("Company Name can not be empty!")
        .bail()
        .isString()
        .withMessage("Company Name should be a valid string!")
        .bail()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Company Name length is should be in a valid range!")
        .bail(),
    body("relationship")
        .trim()
        .not()
        .isEmpty()
        .withMessage("Relationship can not be empty!")
        .bail()
        .isString()
        .withMessage("Relationship should be a valid string!")
        .bail()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Relationship length is should be in a valid range!")
        .bail(),
    body("mobile_number")
        .if((value, { req }) => req.body.contact_type === 'person')
        .not()
        .isEmpty()
        .isInt()
        .withMessage("Phone no. should be valid number.")
        .trim()
        .bail()
        .custom((value, { req }) => {
            return User.find({
                dial_code: req.body.dial_code,
                phone: value,
                isDeleted: false,
            }).then((student) => {
                if (student.length) {
                    return Promise.reject("Phone no. is already in use!");
                }
            });
        })
        .bail(),
        body("home_number")
            .optional({ checkFalsy: true })
            .trim()
            .matches(/^[0-9]+$/)
            .withMessage("Home number must contain digits only!")
            .bail(),
        
          // work_number (optional but must be digits if provided)
          body("work_number")
            .optional({ checkFalsy: true })
            .trim()
            .matches(/^[0-9]+$/)
            .withMessage("Work number must contain digits only!")
            .bail(),
    body("email")
        .trim()
        .not()
        .isEmpty()
        .withMessage("Email can not be empty!")
        .bail()
        .isString()
        .withMessage("Email should be a valid string!")
        .bail()
        .isEmail()
        .withMessage("Input must be a valid email!")
        .bail(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = validateUser();
