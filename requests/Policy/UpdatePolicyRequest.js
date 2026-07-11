const { body, validationResult } = require("express-validator");
const fs = require("fs");
const Policy = require("../../models/Policy");

var validateUser = () => [
  body("title")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Policy title can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("Policy title should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Policy title length is should be in a valid range!")
    .bail()
    .custom((value, { req }) => {
      const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
      return Policy.findOne({
        title: regex,
        isDeleted: false,
        _id: { $ne: req.body.policy_id },
      }).then((policy) => {
        if (policy != null) {
          return Promise.reject("Policy title is already in use!");
        }
      });
    })
    .bail(),
  body("policy_attachment")
    .custom((value, { req }) => {
      if (req.body.is_remove === "1" && req.file === undefined) {
        throw new Error("Policy attachment can not be empty!");
      }
      return true;
    })
    .withMessage("Policy attachment can not be empty!")
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file != undefined) {
        // console.log(req.file);
        fs.unlinkSync(req.file.path, { recursive: true, force: true });
        // console.log(`successfully deleted ${req.file.path}`);
      }
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = validateUser();
