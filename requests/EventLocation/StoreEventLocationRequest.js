const { body, validationResult } = require("express-validator");
const EventLocation = require("../../models/EventLocation");

var validateUser = () => [
  body("name")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Location Name can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9_\-\s]+$/)
    .withMessage("Location Name should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Location Name length is should be in a valid range!")
    .bail()
    .custom((value, { req }) => {
      if (req.body.location_id != ''){
        const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
        return EventLocation.findOne({
          name: regex,
          isDeleted: false,
          _id: { $ne: req.body.location_id },
        }).then((eventLocation) => {
          if (eventLocation != null) {
            return Promise.reject("Location name is already in use!");
          }
        });        
      }else{
        const regex = new RegExp("^" + value + "$", "i"); // Case-insensitive matching
        return EventLocation.find({ name: regex, isDeleted: false }).then((eventLocation) => {
          if (eventLocation.length) {
            return Promise.reject("Location name is already in use!");
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

module.exports = validateUser();
