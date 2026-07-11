var nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

let transporter  = nodemailer.createTransport({
  host: process.env.APP_HOST,
  port: process.env.APP_PORT,
  secure: false,
  auth: {
    user: process.env.APP_USER,
    pass: process.env.APP_PASSWORD
  }
});

let renderTemplate = (token,relativePath) => {
  let mailHTML;
  ejs.renderFile(
      path.join(__dirname, '../views/mailer', relativePath),
      token,
      function(err, template){
          if (err){console.log('error in rendering template',err); return}
          mailHTML = template;
      }
  )
  return mailHTML;
}

module.exports = {
    transporter: transporter,
    renderTemplate: renderTemplate
}