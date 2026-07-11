const { body, validationResult } = require('express-validator');

var validateGroupNotesAndAttachments = () => [
  body('event_note')
  .trim()
  .not()
  .isEmpty()
  .withMessage('Note is required!')
  .bail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateGroupNotesAndAttachments();