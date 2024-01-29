const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const OpenAI = require('openai');
const twilioSyncServiceSid = process.env.TRANSCRIPT_SYNC_SERVICE_SID;
const mapSid = process.env.CALLSUMMARY_MAP_SID;
const fetch = require('node-fetch');
const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })


function sendToFlex(functionArgs) {
    console.log("GPT -> called sendToFlex function");
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
 
    summarizeCall();
    client.calls(callSID)
        .update({twiml: '<Response><Pause length="2"/><Say>Connecting you to an agent</Say><Enqueue workflowSid="WW2e4131c9a391b7f8bfdcdbe9eaff6856" /><Stop><Stream/></Stop></Response>'})
        .then(call => console.log(call.to));
    return JSON.stringify({});

}

function summarizeCall(){

    const listUniqueName = "Transcript-" + callSID;
    console.log("Using Sync service with SID", twilioSyncServiceSid);
    console.log("List Unique ID", listUniqueName);

    try {
        // Check if list exists and update
        client.sync.v1
        .services(twilioSyncServiceSid)
        .syncLists(listUniqueName)
        .syncListItems.list({ limit: 50 })
        .then(async (syncListItems) => {
          // Create the transcript
          let transcript = '';
          syncListItems.forEach((item, index) => {
            transcript += `${item.data.speaker}: ${item.data.transcript}\n`;
          });

            const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            });

            // Create a summary using GPT-3.5 Turbo
            const gptResponse = await openai.chat.completions.create({
                messages: [
                    { role: 'user', content: `Summarize the following transcript win 3 sentences:\n${transcript}` }
                ],
                model: 'gpt-3.5-turbo',
            });

            const summary = gptResponse.choices[0].message.content;
            console.log("Summary:", summary);
            saveSummary(summary);


          })
          .catch(async (error) => {
            console.log("Error getting list item: ");
          });
      } catch (err) {
        console.log("Oh shoot. Something went really wrong, check logs", err);
      }
}

function saveSummary(callSummary) {
    const mapKey = "Summary-" + callSID;
    try {
        // Check if map exists and update
        client.sync.v1.services(twilioSyncServiceSid)
            .syncMaps(mapSid)
            .syncMapItems(mapKey)
            .fetch()
            .then(map => {
            console.log("map item exists, key is", map.key);
            docSid = map.key;
            needToCreate = false;
        })
        .catch(async (error) => {
            // Need to create map
            if (error.code && error.code == 20404) {
              console.log("map doesn't exist, creating");
              await client.sync.v1
                .services(twilioSyncServiceSid)
                .syncMaps(mapSid)
                .syncMapItems
                .create({key: mapKey, data: {
                    summary: callSummary
                  }})
                .then((map) => {
                  console.log("Created map with key", map.key);
                })
                .catch((error) => {
                  console.error(
                    "Oh shoot. Something went really wrong creating the map:",
                    error.message
                  );
                });
            } else {
              console.error("Oh shoot. Error fetching document");
              console.error(error);
            }
          })
          .then(() => {
            // We have a map key at this point - update map with new summary
            client.sync.v1.services(twilioSyncServiceSid)
              .syncMaps(mapSid)
              .syncMapItems(mapKey)
              .update({data: {
                 summary: callSummary
               }})
              .then(map => console.log('Call Summary added to map with key: ', map.key));
          });
      } catch (err) {
        console.log("Oh shoot. Something went really wrong, check logs", err);
      }

}

module.exports = sendToFlex;
