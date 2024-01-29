const axios = require("axios");
// const config = require("../config/config.js");
// const accSid = config.accountSid;
// const authToken = config.authToken;

// make callout to webhook
const makeWebhookRequest = async (webhook_url, method, functionArgs) => {
  console.log(functionArgs);
  try {
    if (method === "GET") {
      console.log("making GET Request at", webhook_url);
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

// const testWebhookRequest = async () => {
//   let url = "https://hackathon-open-ai-7695.twil.io/hackathon";
//   //   let url = "https://api.github.com/users/mapbox";
//   const response = await makeWebhookRequest(url, "GET");
//   console.log(response.data);
// };

// testWebhookRequest();

exports.makeWebhookRequest = makeWebhookRequest;

// function checkPrice(functionArgs) {
//   let model = functionArgs.model;
//   console.log("GPT -> called checkPrice function");
//   if (model?.toLowerCase().includes("pro")) {
//     return JSON.stringify({ price: 249 });
//   } else if (model?.toLowerCase().includes("max")) {
//     return JSON.stringify({ price: 549 });
//   } else {
//     return JSON.stringify({ price: 149 });
//   }
// }
