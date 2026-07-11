const { body, validationResult } = require("express-validator");

const validateUser = () => [
  body("transaction_type")
    .notEmpty()
    .withMessage("Transaction type is required")
    .bail(),
  body("payment_tutor_id")
    .if(body("transaction_type").isIn(["Payment", "Refund"]))
    .notEmpty()
    .withMessage("Staff cannot be empty!")
     .bail(),
  body("charge_tutor_id")
    .if(body("transaction_type").isIn(["Charge", "Discount"]))
    .notEmpty()
    .withMessage("Staff cannot be empty!")
     .bail(),
  body("payment_refund_date")
    .if(body("transaction_type").isIn(["Payment", "Refund"]))
    .notEmpty()
    .withMessage("Date is required")
     .bail(),
  body("payment_method")
    .if(body("transaction_type").isIn(["Payment", "Refund"]))
    .notEmpty()
    .withMessage("Payment method is required")
     .bail(),
  body("payment_refund_amount")
    .if(body("transaction_type").isIn(["Payment", "Refund"]))
    .notEmpty()
    .withMessage("Amount is required")
    .bail()
    .isFloat({ min: 0.01, max: 1000000 }) // ✅ amount range
    .withMessage("Amount must be between 0.01 and 1,000,000")
    .bail(),
  body("charges_discount_amount")
    .if(body("transaction_type").isIn(["Charge", "Discount"]))
    .notEmpty()
     .withMessage("Amount is required")
     .bail()
    .isFloat({ min: 0.01, max: 1000000 }) // amount range
    .withMessage("Amount must be between 0.01 and 1,000,000")
    .bail(),
  body("charges_discount_date")
    .if(body("transaction_type").isIn(["Charge", "Discount"]))
    .notEmpty()
    .withMessage("Date is required")
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
