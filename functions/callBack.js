const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })


function callBack(functionArgs) {
    console.log("GPT -> called callback function");

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

    const timeoutValue = functionArgs.seconds;
    console.log("triggered callback in ", timeoutValue, " seconds");

    //trigger callback 
    setTimeout(function(){
        client.calls
        .create({
            url: `https://${process.env.SERVER}/incoming`,
            to: process.env.TO_NUMBER,
            from: process.env.FROM_NUMBER
        })
        .then(call => {
            console.log(call.sid)
            return JSON.stringify({ success: "true" });
        });
    },timeoutValue*1000); //delay is in milliseconds 

    return JSON.stringify({ success: "true" });
    

}


module.exports = callBack;