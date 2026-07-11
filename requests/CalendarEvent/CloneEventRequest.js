const { body, validationResult } = require('express-validator');
const Event = require('../../models/Event');

var validateCloneEvent = () => [
  body('start_date')
  .trim()
  .exists()
  .withMessage('Start date is required!')
  .isDate({ format: 'YYYY-MM-DD' })
  .withMessage('Start date must be valid date in YYYY-MM-DD format!')
  .custom((value, { req, res}) => {
    const formattedCurrentDate = new Date(); // Format current date
    const formattedStartDate = new Date(value); // Format start date
    // if (formattedStartDate < formattedCurrentDate) {
    //   throw new Error('Start date must be on future date!');
    // }
    return true;
  })
  .bail(),
  body('start_time')
  .trim()
  .exists()
  .withMessage('Start time is required!')
  .custom((value) => {
      if (value == '') {
        throw new Error('Start time field is required.');
      }
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]) (AM|PM)$/; // Adjust as needed
      if (value && !timeRegex.test(value)) {
        throw new Error('Start time must be in a valid format (e.g., HH:MM AM/PM)!');
      }
    return true;
  })
  .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateCloneEvent();