const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })


function checkLanguage(functionArgs) {
  const language = functionArgs.language;
  console.log("GPT -> called checkLanguage function");

  sendToSegment(functionArgs);

  if (language?.toLowerCase().includes("english")) {
    return JSON.stringify({ locale: "en" });
  } else if (language?.toLowerCase().includes("french")) {
    return JSON.stringify({ locale: "fr" });
  } else if (language?.toLowerCase().includes("spanish")) {
    return JSON.stringify({ locale: "es" });
  } else if (language?.toLowerCase().includes("italian")) {
    return JSON.stringify({ locale: "it" });
  } else {
    return JSON.stringify({ locale: "en" });
  }
}


function sendToSegment (functionArgs) {
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
}

module.exports = checkLanguage;
