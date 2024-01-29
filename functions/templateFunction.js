const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })
const path = require('path');


function templateFunction(functionArgs) {
    let functionName = path.basename(__filename);
    functionName = functionName.replace(".js", '');
    console.log(`GPT -> called ${functionName} function`);

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
    event: functionName,
    properties:
        properties
    });

    // Trigger Webhook
    if (functionArgs.webhookURL){
        return triggerWebhook(functionArgs);
    } else {
        return JSON.stringify({});
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
        return JSON.stringify({});
        
      }

}


module.exports = templateFunction;