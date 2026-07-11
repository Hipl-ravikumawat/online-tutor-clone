const { body, validationResult } = require("express-validator");

const saveInvoiceSettingsRequest = [
  // Basic fields
  body("uniqueId")
    .notEmpty().withMessage("Business setting ID is required.")
    .isMongoId().withMessage("Invalid business setting ID."),

  body("currentTab")
    .notEmpty().withMessage("Current tab is required."),

  body("payment_fee_type")
    .notEmpty().withMessage("Payment fee type is required.")
    .isIn(["1", "2", "3"]).withMessage("Invalid payment fee type."),

  // Fixed fee (type 2) validations
  body("late_fee_amount")
    .if(body("payment_fee_type").equals("2"))
    .notEmpty().withMessage("Late fee amount is required for fixed fee.").bail()
    .isInt({ min: 1 }).withMessage("Late fee amount must be a positive integer."),

  body("number_of_days")
    .if(body("payment_fee_type").equals("2"))
    .notEmpty().withMessage("Number of days is required for fixed fee.").bail()
    .isInt({ min: 1 }).withMessage("Number of days must be a positive integer."),

  // Percentage fee (type 3) validations
  body("late_fee_percentage")
    .if(body("payment_fee_type").equals("3"))
    .notEmpty().withMessage("Late fee percentage is required.").bail()
    .isFloat({ min: 0 }).withMessage("Late fee percentage must be a positive number."),

  body("percentage_number_of_days")
    .if(body("payment_fee_type").equals("3"))
    .notEmpty().withMessage("Number of days is required for percentage fee.").bail()
    .isInt({ min: 1 }).withMessage("Number of days must be a positive integer."),

  
  // Scheduling validations

  body("overdue_reminder_day")
    .if(body("scheduling").custom(value => Array.isArray(value) && value.includes("2")))
    .notEmpty().withMessage("Overdue reminder day is required when scheduling includes '2'.").bail()
    .isInt({ min: 1 }).withMessage("Overdue reminder day must be a positive integer."),

  body("email_time_frame")
    .notEmpty().withMessage("Email time frame is required."),

  // Scheduling validations
  body("scheduling")
    .notEmpty().withMessage("Notifications & Reminders are required.").bail() 
    .isArray().withMessage("Notifications & Reminders must be an array.").bail()
    .custom((value) => {
      const validOptions = ["1", "2", "3"];
      const invalidOptions = value.filter(v => !validOptions.includes(v));
      if (invalidOptions.length > 0) {
        throw new Error(`Invalid Notifications & Reminders option(s): ${invalidOptions.join(", ")}`);
      }
      return true;
    }),

  // Final middleware to return errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = saveInvoiceSettingsRequest;
