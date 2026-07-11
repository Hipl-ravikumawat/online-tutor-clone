const { body, validationResult } = require("express-validator");

const validateUser = () => [
   body("families")
        .custom((value, { req }) => {
            // Handle case where families might be undefined, null, or empty array
            const families = value || [];
            const familiesArray = Array.isArray(families) ? families : [families];

            if (familiesArray.length === 0) {
                throw new Error("Select at least one family");
            }

            // Additional check for empty values in the array
            const validFamilies = familiesArray.filter(family => 
                family && family.trim() !== '' && family !== 'undefined'
            );

            if (validFamilies.length === 0) {
                throw new Error("Select at least one family");
            }

            return true;
        }),
    body("invoice_date")
    .notEmpty()
    .withMessage("Date is required")
    .bail(),
    body("start_date")
    .notEmpty()
    .withMessage("Start date is required")
    .bail(),
    body("end_date")
    .notEmpty()
    .withMessage("End date is required")
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
