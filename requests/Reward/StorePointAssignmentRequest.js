const { body, validationResult } = require("express-validator");
const Event = require('../../models/Event');

var validateUser = () => [
  body('eventId')
  .trim()
  .not()
  .isEmpty()
  .withMessage('eventId is required!')
  .bail()
  .isString()
  .withMessage('eventId should be a valid string!')
  .bail()
  .custom((value, { req }) => {
    return Event.find({ "_id": value, "isDeleted": false })
      .then(event => {
        if (event.length == 0) {
          return Promise.reject('Event Id is invalid!');
        }
      })
  })
 .bail(), 
  body('attendees')
    .exists()
    .withMessage('Students field can not be empty, Please select at lest one student!')
    .bail()
    .custom((value) => {
      if (!Array.isArray(value) && typeof value !== 'string') {
        throw new Error('Students must be an array or a valid student ID.');
      }
      return true;
    })
   .bail(), 
   body()
   .custom((value) => {
     const checkboxes = ['attendingClassOnTime', 'askingQuestions', 'homeworkSubmission', 'participatingClassActivities', 'bonusPoints'];
     const isAtLeastOneChecked = checkboxes.some((field) => value[field] === 'on');
     if (!isAtLeastOneChecked) {
       throw new Error('At least one checkbox must be selected.');
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

module.exports = validateUser();