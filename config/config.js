const dotenv = require("dotenv");
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const apiKeyOpenAI = process.env.OPENAI_API_KEY;

(express = require("express")), (router = express.Router());

module.exports = {
  client: client,
  router: router,
  accountSid: accountSid,
  authToken: authToken,
  apiKeyOpenAI: apiKeyOpenAI,
};
