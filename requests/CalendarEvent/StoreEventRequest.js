const { body, validationResult } = require('express-validator');
const User = require('../../models/User');
const EventCategory = require('../../models/EventCategory');
const EventLocation = require('../../models/EventLocation');
const globalConstants = require("../../_helper/GlobalConstants");

var validateEvent = () => [
  body('tutor_id')
  .trim()
  .not()
  .isEmpty()
  .withMessage('Tutor is required!')
  .bail()
  .custom((value, { req }) => {
    return User.find({ "_id": value, "isDeleted": false, role: 2 })
      .then(tutor => {
        if (tutor.length == 0) {
          return Promise.reject('Select a valid tutor!');
        }
      })
  })
  .bail(),
  body('substitute_tutor_id')
    .custom((value, { req }) => {
      if (req.body.is_substitute_tutor === '1' && !value) {
        throw new Error('Substitute tutor is required when is substitute tutor is checked!');
      }
      if (req.body.is_substitute_tutor === '1' && req.body.tutor_id != '' && req.body.tutor_id == value) {
        throw new Error('A substitute tutor should differ from the main tutor!');
      }
      return true;
    })
    .bail(),
  body('student_ids')
  .trim()
  .not()
  .isEmpty()
  .withMessage('Attendees are required!')
  .bail()
  .custom((value, { req }) => {
    let studentIds = JSON.parse(value);
    req.body.attendees = studentIds;
    return User.find({
      _id: { $in: req.body.attendees },
      isDeleted: false,
      role: 3,
    })
      .then(students => {
        if (students.length == 0) {
          return Promise.reject('Attendees valid students!');
        }
      })
  })
  .bail(),
  // body('courses')
  // .custom((value) => {
  //   // Parse the JSON string to an array of objects
  //   const courses = JSON.parse(value);
  //   if (courses.length == 0) {
  //     throw new Error('Select at lest one study content from class or additional lessons!');
  //   }
  //   return true;
  // })
  body('courses')
  .custom((value) => {
    // Make it optional - accept empty or undefined
    if (!value || value === '' || value === '[]') {
      return true; // Accept empty
    }
    
    try {
      const courses = JSON.parse(value);
      return true; // Accept if valid JSON
    } catch (error) {
      throw new Error('Courses must be valid JSON');
    }
  })
  .bail(),
  body('event_category_id')
  .trim()
  .not()
  .isEmpty()
  .withMessage('Event Category is required!')
  .bail()
  .custom((value, { req }) => {
    return EventCategory.find({ "_id": value, "isDeleted": false})
      .then(eventCategory => {
        if (eventCategory.length == 0) {
          return Promise.reject('Select a valid event category!');
        }
      })
  })
  .bail(),
  body('event_location_id')
  .trim()
  .not()
  .isEmpty()
  .withMessage('Event Location is required!')
  .bail()
  .custom((value, { req }) => {
    return EventLocation.find({ "_id": value, "isDeleted": false})
      .then(eventLocation => {
        if (eventLocation.length == 0) {
          return Promise.reject('Select a valid event location!');
        }
      })
  })
  .bail(),
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
      throw new Error('Start time must be in a valid format (e.g., HH:MM AM/PM)!');
    }
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9]) (AM|PM)$/;
    if (!timeRegex.test(value)) {
      throw new Error('Start time must be in a valid format (e.g., HH:MM AM/PM)!');
    }
    return true;
  })
  .bail(),
  body('duration')
  .trim()
  .not()
  .isEmpty()
  .withMessage('Duration is required')
  .bail(),
  body('will_repeat')
  .optional({ nullable: true })
  .isString()
  .withMessage('Will repeat must be a string (if provided)')
  .bail(),
  body('recurring_type')
  .custom((value, { req }) => {
    if (req.body.will_repeat === '1' && !value) {
      throw new Error('Recurring type is required when will repeat is set to true!');
    }
    if (req.body.will_repeat === '1' && !['weekly', 'fortnightly'].includes(value)) {
      throw new Error('Invalid recurring type. Must be weekly or fortnightly!');
    }
    return true;
  })
  .bail(),
  body('no_of_week')
  .custom((value, { req }) => {
    if (req.body.will_repeat == 1 && req.body.recurring_type === 'weekly' && value < 2 && !req.body.repeat_indefinitely) {
      throw new Error('No of weeks must be greater than 1.');
    }

    if (req.body.will_repeat == 1 && req.body.recurring_type === 'weekly' && value > globalConstants.numberOfRecurringEvents && !req.body.repeat_indefinitely) {
      throw new Error(`A maximum of ${globalConstants.numberOfRecurringEvents} weeks is allowed!`);
    }
    return true;
  })
  .bail(),
  body('no_of_fortnightly')
  .custom((value, { req }) => {
    if (req.body.will_repeat == 1 && req.body.recurring_type === 'fortnightly' && value < 2 && !req.body.repeat_indefinitely) {
      throw new Error('No of fortnightly must be greater than 1.');
    }

    if (req.body.will_repeat == 1 && req.body.recurring_type === 'fortnightly' && value > globalConstants.numberOfRecurringEvents && !req.body.repeat_indefinitely) {
      throw new Error(`A maximum of ${globalConstants.numberOfRecurringEvents} fortnightly is allowed!`);
    }
    return true;
  })
  .bail(),
  body('student_pricing_option')
  .optional({ nullable: true })
  .isString()
  .withMessage('Pricing must be a string (if provided)')
  .bail(),
  body('per_std_lesson_price')
  .custom((value, { req }) => {
    if (req.body.student_pricing_option === 'std_price_specify' && value == 0 ) {
      throw new Error('Per student lesson price is required when student pricing option is set to specify price per student!');
    }
     // Check if value is a number
    if (!/^[-+]?\d*\.?\d+$/.test(value)) {
      throw new Error('Per student lesson price must be a valid number!');
    }
    return true;
  })
  .bail(),
  body('public_note')
  .optional({ nullable: true }) // Marks the field as optional, allowing null or undefined
  .isString()
  .withMessage('Public note must be a string (if provided)')
  .bail(),
  body('private_note')
  .optional({ nullable: true }) // Marks the field as optional, allowing null or undefined
  .isString()
  .withMessage('Private note must be a string (if provided)')
  .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateEvent();