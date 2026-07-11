const { body, validationResult } = require("express-validator");
const VoucherHistory = require('../../models/VoucherHistory');

var validateUser = () => [
  body('voucherRequestId')
    .trim()
    .not()
    .isEmpty()
    .withMessage('voucherRequestId is required!')
    .bail()
    .isString()
    .withMessage('voucherRequestId should be a valid string!')
    .bail()
    .custom((value, { req }) => {
      return VoucherHistory.find({ "_id": value })
        .then(voucherHistory => {
          if (voucherHistory.length == 0) {
            return Promise.reject('voucherRequestId is invalid!');
          }
        })
    })
    .bail(),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status cannot be empty!')
    .bail()
    .isIn(['Approved', 'Rejected'])
    .withMessage('Status must be either "Approved" or "Rejected"')
    .bail(),
  body('reason')
    .optional()
    .trim()
    .isString()
    .withMessage('Reason should be a valid string if provided!')
    .bail()
    .custom((value, { req }) => {
      if (req.body.status === 'Rejected' && !value) {
        return Promise.reject('Reason is required when status is "Rejected"');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ errors: errors.array() });
    next();
  },
];

module.exports = validateUser();