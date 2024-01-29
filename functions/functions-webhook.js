const axios = require("axios");

// make callout to webhook
// To do, currently only accepts post requests - would need to update front-end as well
const makeWebhookRequest = async (webhook_url, method, functionArgs) => {
  console.log(functionArgs);
  try {
    if (method === "GET") {
      let response = await axios.get(webhook_url, { functionArgs });
      return response.data;
    } else if (method === "POST") {
      let response = await axios.post(webhook_url, { functionArgs });
      return response.data;
    }
  } catch (e) {
    console.log(e);
  }
};

exports.makeWebhookRequest = makeWebhookRequest;
