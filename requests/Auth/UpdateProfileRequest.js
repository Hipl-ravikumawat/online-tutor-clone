const { body, validationResult } = require('express-validator');
const User = require('../../models/User');

var validateUser = () => [
  body('title')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Title can not be empty!')
    .bail()
    .isString()
    .withMessage('Title should be a valid string!')
    .bail(),
  body('first_name')
    .trim()
    .not()
    .isEmpty()
    .withMessage('First Name can not be empty!')
    .bail()
    .isString()
    .withMessage('First Name should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('First Name length is should be in a valid range!')
    .bail(),
  body('last_name')
    .trim()
    .not()
    .isEmpty()
    .withMessage('Last Name can not be empty!')
    .bail()
    .isString()
    .withMessage('Last Name should be a valid string!')
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Last Name length is should be in a valid range!')
    .bail(),
    body('phone')
    .if((value, { req }) => req.body.role != 3)
    .not().isEmpty()
    .isInt()
    .withMessage('Phone no. should be valid number.')
    .trim()
    .bail()
    .custom((value, { req }) => {
      if (!value) return true;
      return User.findOne({ "dial_code": req.body.dial_code, "phone": value, _id: { $ne: req.body.user_id } })
        .then(user => {
          if (user != null) {
            return Promise.reject('Phone no. is already in use!');
          }
        })
    }),
    body('email')
  .optional({ checkFalsy: true })
  .trim()
  .isEmail()
  .withMessage('Please enter a valid email!')
  .bail()
  .normalizeEmail()
  .custom((value, { req }) => {
    return User.findOne({
      email: value,
      _id: { $ne: req.body.user_id }
    }).then(user => {
      if (user) {
        return Promise.reject('Email is already in use!');
      }
      return true;
    });
  }),
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
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateUser();