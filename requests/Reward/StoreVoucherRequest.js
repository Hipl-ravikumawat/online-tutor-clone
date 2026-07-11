const { body, validationResult } = require("express-validator");
const Voucher = require("../../models/Voucher");

const validateUser = () => [
  body("title")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Title can not be empty!")
    .bail()
    .isString()
    .matches(/^[a-zA-Z0-9-\s]+$/)
    .withMessage("Title should be a valid string!")
    .bail()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Title length should be in a valid range!")
    .bail(),
  body("required_points")
    .not()
    .isEmpty()
    .withMessage("Points can not be empty!")
    .bail()
    .isInt({ min: 0 })
    .withMessage("Points should be a non-negative integer!")
    .bail(),
  body("equivalent_amount")
    .not()
    .isEmpty()
    .withMessage("Amount can not be empty!")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("Amount should be a non-negative number!")
    .bail(),
  body()
    .custom(async (value, { req }) => {
      const { required_points, equivalent_amount, slug } = req.body;

      // Build the query
      const query = {
        required_points,
        equivalent_amount,
        isDeleted: false, // Ignore soft-deleted vouchers
      };

      // Exclude the current record if 'slug' is provided (update operation)
      if (slug) {
        query.slug = { $ne: slug }; // Exclude the current voucher by slug
      }

      // Check for an existing voucher
      const existingVoucher = await Voucher.findOne(query);

      if (existingVoucher) {
        throw new Error(
          `A voucher with required_points ${required_points} and equivalent_amount ${equivalent_amount} already exists!`
        );
      }
      return true;
    })
    .withMessage("Duplicate voucher not allowed!"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateUser();
