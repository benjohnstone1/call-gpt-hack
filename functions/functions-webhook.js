const axios = require("axios");
const { Analytics } = require("@segment/analytics-node");
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY });

// make callout to webhook
// To do, currently only accepts post requests - would need to update front-end as well
const makeWebhookRequest = async (webhook_url, method, functionArgs) => {
  functionArgs.callSID = global.callSID;

  console.log(functionArgs);

  try {
    if (method === "GET") {
      let response = await axios.get(webhook_url, {
        functionArgs,
        callSid: global.callSID,
      });
      return response.data;
    } else if (method === "POST") {
      let response = await axios.post(webhook_url, {
        functionArgs,
      });
      return response.data;
    }
  } catch (e) {
    console.log(e);
  }
};

const makeSegmentTrack = async (functionArgs, functionName) => {
  // Set properties for segment function
  let properties = { source: "Voice AI IVR" };
  let numParams = Object.keys(functionArgs).length;
  for (let i = 0; i < numParams; i++) {
    let key = Object.keys(functionArgs)[i];
    let value = functionArgs[key];
    properties[key] = value;
    console.log(properties);
  }
  // Send Track event to Segment
  analytics.track({
    userId: callerID,
    event: functionName,
    properties: properties,
  });
  console.log("Tracked in Segment");
};

exports.makeWebhookRequest = makeWebhookRequest;
exports.makeSegmentTrack = makeSegmentTrack;
