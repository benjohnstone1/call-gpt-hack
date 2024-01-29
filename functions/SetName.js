const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })


function setName(functionArgs) {
    console.log("GPT -> called setName function");

    //Trigger Segment identity
    analytics.identify({
        userId: callerID,
        traits: {
        phone: callerID,
        name: functionArgs.name
        }
    });

    return JSON.stringify({ success: "true" });
    

}


module.exports = setName;