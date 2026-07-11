const { body, validationResult } = require("express-validator");
const EventCategory = require("../../models/EventCategory");

var validateEventCategory = () => [
  body("name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Category Name can not be empty!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Category Name length is should be in a valid range!")
    .bail()
    .custom((value, { req }) => {
      if (req.body.category_id != ''){
        const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
        return EventCategory.findOne({
          name: regex,
          isDeleted: false,
          _id: { $ne: req.body.category_id },
        }).then((eventCategory) => {
          if (eventCategory != null) {
            return Promise.reject("Category name is already in use!");
          }
        });        
      }else{
        const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
        return EventCategory.find({ name: regex, isDeleted: false }).then((eventCategory) => {
          if (eventCategory.length) {
            return Promise.reject("Category name is already in use!");
          }
        });
      }
    })
    .bail(),
  body("color")
    .not()
    .isEmpty()
    .withMessage("The color can not be empty!")
    .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateEventCategory();
