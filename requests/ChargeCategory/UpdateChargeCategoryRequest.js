const { body, validationResult } = require("express-validator");
const ChargeCategory = require("../../models/ChargeCategory");

var validateUser = () => [
  body("name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Name can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("Name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Name length is should be in a valid range!")
    .bail()
      .custom(async (value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i");
      const existing = await ChargeCategory.findOne({ name: regex, isDeleted: false });
      if (existing && existing._id.toString() !== req.body._id) {
        throw new Error("Name is already in use!");
      }
      return true;
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
