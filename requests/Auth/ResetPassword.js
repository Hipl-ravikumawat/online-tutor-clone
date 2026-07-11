const { body, validationResult } = require("express-validator");
const User = require("../../models/User");

var validateUser = () => [
    body("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage(" Password can not be empty!")
    .bail(),
  body("confirm_password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Confirm password can not be empty!")
    .bail()
    .isLength({ min: 8, max: 16 })
    .withMessage("Password must be between 8 to 16 characters")
    .bail()
    .custom((value, { req }) => {
      if (req.body.password !== req.body.confirm_password) {
        throw new Error("Password confirmation does not match password");
      }
      // Indicates the success of this synchronous custom validator
      return true;
    })
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];
module.exports = validateUser();
