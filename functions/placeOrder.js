const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })


function placeOrder(functionArgs) {
  const { model, quantity } = functionArgs;
  console.log("GPT -> called placeOrder function");

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

  // generate a random order number that is 7 digits
  orderNum = Math.floor(Math.random() * (9999999 - 1000000 + 1) + 1000000);

  // check model and return the order number and price with 7.9% sales tax
  if (model?.toLowerCase().includes("pro")) {
    return JSON.stringify({
      orderNumber: orderNum,
      price: Math.floor(quantity * 249 * 1.079),
    });
  } else if (model?.toLowerCase().includes("max")) {
    return JSON.stringify({
      orderNumber: orderNum,
      price: Math.floor(quantity * 549 * 1.079),
    });
  }
  return JSON.stringify({
    orderNumber: orderNum,
    price: Math.floor(quantity * 179 * 1.079),
  });
}


module.exports = placeOrder;
