const dotenv = require("dotenv");
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID_FLEX;
const authToken = process.env.TWILIO_AUTH_TOKEN_FLEX;
const client = require("twilio")(accountSid, authToken);
const apiKeyOpenAI = process.env.OPENAI_API_KEY;
const defaultWebhook = process.env.DEFAULT_WEBHOOK;
const transcriptServiceSid = process.env.TRANSCRIPT_SYNC_SERVICE_SID;
const workflowSid = process.env.WORKFLOW_SID;
const callSummaryMapSid = process.env.CALLSUMMARY_MAP_SID;
const server = process.env.SERVER;
const openAIKey = process.env.OPENAI_API_KEY;
const segmentKey = process.env.SEGMENT_API_KEY;

(express = require("express")), (router = express.Router());

module.exports = {
  client: client,
  router: router,
  accountSid: accountSid,
  authToken: authToken,
  apiKeyOpenAI: apiKeyOpenAI,
  defaultWebhook: defaultWebhook,
  transcriptServiceSid: transcriptServiceSid,
  workflowSid: workflowSid,
  callSummaryMapSid: callSummaryMapSid,
  server: server,
  openAIKey: openAIKey,
  segmentKey: segmentKey,
};
