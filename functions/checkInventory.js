const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })


function checkInventory(functionArgs) {
  const model = functionArgs.model;
  console.log("GPT -> called checkInventory function");

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
  
  if (model?.toLowerCase().includes("pro")) {
    return JSON.stringify({ stock: 10 });
  } else if (model?.toLowerCase().includes("max")) {
    return JSON.stringify({ stock: 0 });
  } else {
    return JSON.stringify({ stock: 100 });
  }
}

module.exports = checkInventory;