const OpenAI = require("openai");
const config = require("../config/config.js");
const client = config.client;
const server = config.server;
const openAIKey = config.openAIKey;
const twilioSyncServiceSid = config.transcriptServiceSid;
const mapSid = config.callSummaryMapSid;

function speakToAgent(callSid) {
  summarizeCall(callSid, twilioSyncServiceSid, client, mapSid);

  // time delayed function to update the call to URI for enqueuing the call.
  const sendToAgent = async (callSid) => {
    return await client
      .calls(callSid)
      .update({
        method: "POST",
        url: `https://${server}/speak-to-agent?`,
      })
      .then((ret) => {
        return;
      })
      .catch((err) => {
        console.log("err", err);
      });
  };
  setTimeout(() => sendToAgent(callSid), 5000);
}

function summarizeCall(callSid, twilioSyncServiceSid, client, mapSid) {
  const listUniqueName = "Transcript-" + callSid;
  //   console.log("Using Sync service with SID", twilioSyncServiceSid);
  //   console.log("List Unique ID", listUniqueName);

  try {
    // Check if list exists and update
    client.sync.v1
      .services(twilioSyncServiceSid)
      .syncLists(listUniqueName)
      .syncListItems.list({ limit: 50 })
      .then(async (syncListItems) => {
        // Create the transcript
        let transcript = "";
        syncListItems.forEach((item, index) => {
          transcript += `${item.data.speaker}: ${item.data.transcript}\n`;
        });

        const openai = new OpenAI({
          apiKey: openAIKey,
        });

        // Create a summary using GPT-3.5 Turbo
        const gptResponse = await openai.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `Summarize the following transcript win 3 sentences:\n${transcript}`,
            },
          ],
          model: "gpt-3.5-turbo",
        });

        const summary = gptResponse.choices[0].message.content;
        console.log("Summary:", summary);
        saveSummary(summary, callSID, twilioSyncServiceSid, mapSid, client);
      })
      .catch(async (error) => {
        console.log("Error getting list item: ");
      });
  } catch (err) {
    console.log("Oh shoot. Something went really wrong, check logs", err);
  }
}

function saveSummary(
  callSummary,
  callSid,
  twilioSyncServiceSid,
  mapSid,
  client
) {
  const mapKey = "Summary-" + callSid;
  try {
    // Check if map exists and update
    client.sync.v1
      .services(twilioSyncServiceSid)
      .syncMaps(mapSid)
      .syncMapItems(mapKey)
      .fetch()
      .then((map) => {
        // console.log("map item exists, key is", map.key);
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
            .syncMapItems.create({
              key: mapKey,
              data: {
                summary: callSummary,
              },
            })
            .then((map) => {
              //   console.log("Created map with key", map.key);
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
        client.sync.v1
          .services(twilioSyncServiceSid)
          .syncMaps(mapSid)
          .syncMapItems(mapKey)
          .update({
            data: {
              summary: callSummary,
            },
          })
          .then((map) =>
            console.log("Call Summary added to map with key: ", map.key)
          );
      });
  } catch (err) {
    console.log("Oh shoot. Something went really wrong, check logs", err);
  }
}

module.exports = speakToAgent;
