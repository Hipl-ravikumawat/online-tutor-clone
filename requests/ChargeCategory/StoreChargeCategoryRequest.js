const { body, validationResult } = require("express-validator");
const ChargeCategory = require("../../models/ChargeCategory");

var validateUser = () => [
  body("name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Category name can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("Category name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Category name length is should be in a valid range!")
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i");
      return ChargeCategory.find({ name: regex, deleted_at: null }).then((name) => {
        if (name.length) {
          return Promise.reject("This category name is already in use!");
        }
      });
    })
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
