const { body, validationResult } = require("express-validator");
const User = require('../../models/User'); 

const sendEmailInvoicesRequest = [
  (req, res, next) => {
    if (req.body.to_mail && !Array.isArray(req.body.to_mail)) {
      req.body.to_mail = [req.body.to_mail];
    }
    next();
  },

  body("from_mail")
    .notEmpty().withMessage("Sender email is required.").bail()
    .isMongoId().withMessage("Sender must be a valid user ID."),
  
  body("to_mail")
    .isArray({ min: 1 }).withMessage("At least one recipient is required."),
  
  body("to_mail.*")
    .isMongoId().withMessage("Each recipient must be a valid user ID."),

  body("subject")
    .notEmpty().withMessage("Subject is required."),
  
  body("message")
    .notEmpty().withMessage("Message body is required."),

  // async middleware to fetch emails
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const sender = await User.findById(req.body.from_mail).select("email").lean();
      if (!sender) {
        return res.status(400).json({ errors: [{ msg: "Sender not found" }] });
      }

      const recipients = await User.find({ _id: { $in: req.body.to_mail } })
        .select("email")
        .lean();

      if (!recipients.length) {
        return res.status(400).json({ errors: [{ msg: "No valid recipients found" }] });
      }
      
      req.emailData = {
        from: sender.email,
        to: recipients.map(r => r.email),
        subject: req.body.subject,
        message: req.body.message
      };

      next();
    } catch (err) {
      console.error("Error fetching emails:", err);
      return res.status(500).json({ errors: [{ msg: "Server error while fetching emails" }] });
    }
  }
];

module.exports = sendEmailInvoicesRequest;
