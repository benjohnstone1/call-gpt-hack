const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

function callBack(functionArgs) {
    console.log("GPT -> called callback function");
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