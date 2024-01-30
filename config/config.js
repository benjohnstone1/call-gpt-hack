const dotenv = require("dotenv");
dotenv.config();

// console.log(process.env);

const accountSid = process.env.TWILIO_ACCOUNT_SID_FLEX; //updated as have saved env vars that are overwriting .env file
const authToken = process.env.TWILIO_AUTH_TOKEN_FLEX;
const client = require("twilio")(accountSid, authToken);
const apiKeyOpenAI = process.env.OPENAI_API_KEY;
const defaultWebhook = process.env.DEFAULT_WEBHOOK;
const transcriptServiceSid = process.env.TRANSCRIPT_SYNC_SERVICE_SID;

(express = require("express")), (router = express.Router());

module.exports = {
  client: client,
  router: router,
  accountSid: accountSid,
  authToken: authToken,
  apiKeyOpenAI: apiKeyOpenAI,
  defaultWebhook: defaultWebhook,
  transcriptServiceSid: transcriptServiceSid,
};
