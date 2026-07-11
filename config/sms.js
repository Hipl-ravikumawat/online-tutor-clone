const twilio = require('twilio');
const ejs = require('ejs');
const path = require('path');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error('Twilio creds missing: set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
}
if (!TWILIO_FROM) {
  throw new Error('Set TWILIO_FROM (your Twilio phone number in E.164 format, e.g., +1234567890)');
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Render SMS body from an EJS template in /views/sms/<relativePath>.
 */
function renderSMSTemplate(data, relativePath) {
  const filePath = path.join(__dirname, '../views/sms', relativePath);
  return ejs.renderFile(filePath, data, { async: true });
}

/**
 * Send a single SMS.
 */
async function sendSMS({ to, body, template, templateData = {} }) {
  if (!to) throw new Error('Missing "to"');

  const messageBody = template
    ? (await renderSMSTemplate(templateData, template)).trim()
    : (body || '').trim();

  if (!messageBody) throw new Error('SMS body is empty');

  const res = await client.messages.create({
    to,
    from: TWILIO_FROM,
    body: messageBody
  });

  return res; 
}

module.exports = {
  smsClient: client,
  renderSMSTemplate,
  sendSMS,
};
