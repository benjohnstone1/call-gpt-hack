const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })

function checkPrice(functionArgs) {
  console.log("GPT -> called checkPrice function");
  console.log("function trigger is named: ", arguments.callee.name);
  
  // Set properties for segment function
  let properties = { source: 'Voice AI IVR' }
  let numParams = Object.keys(functionArgs).length;
  for (let i=0; i<numParams; i++){
    let key = Object.keys(functionArgs)[i];
    let value = functionArgs[key];
    properties[key] = value;
    console.log(properties)
  }


  // Send Track event to Segment
  analytics.track({
    userId: callerID,
    event: arguments.callee.name,
    properties:
      properties
  });
  
  // Trigger Webhook
  if (functionArgs.webhookURL){
    return triggerWebhook(functionArgs);
  } else {
      if (model?.toLowerCase().includes("pro")) {
      return JSON.stringify({ price: 249 });
    } else if (model?.toLowerCase().includes("max")) {
      return JSON.stringify({ price: 549 });
    } else {
      return JSON.stringify({ price: 149 });
    }

  }
}

function triggerWebhook(functionArgs) {
  let webhookURL = functionArgs.webhookURL;
  let path = webhookURL+"?"
  let numParams = Object.keys(functionArgs).length;

  let key = ""
  for (let i=0; i<numParams; i++){
    key = Object.keys(functionArgs)[i];
    if (key != "webhookURL"){
      path += key+"="+functionArgs[key]+"&"
      path = encodeURI(path);
    }
  }

  try {
    const response = fetch(path, {
      method: "GET",
    }).then(response => {
      // handle response from webhook
    });

  } catch (error) {
    console.log(error);
    console.log(error.response.body);
  }
  return JSON.stringify({ price : 123, inventory: 10, ordernumber: 123456});
  
}

module.exports = checkPrice;