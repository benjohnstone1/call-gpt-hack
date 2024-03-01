//config
const config = require("../config/config.js");
const accountSid = config.accountSid;
const authToken = config.authToken;
const client = config.client;
const twilioSyncServiceSid = config.transcriptServiceSid;

function writeTranscriptToTwilio(transcript, speaker, callSid) {
  if (!callSid || !transcript) {
    const error = "Missing callSid or transcript data";
    response.setBody({ message: error });
    response.setStatusCode(400);
  }

  const listUniqueName = "Transcript-" + callSid;
  let listSid = undefined; //see if needing updated

  try {
    // Check if list exists and update
    client.sync.v1
      .services(twilioSyncServiceSid)
      .syncLists(listUniqueName)
      .fetch()
      .then((list) => {
        listSid = list.sid;
        needToCreate = false;
      })
      .catch(async (error) => {
        // Need to create document
        if (error.code && error.code == 20404) {
          await client.sync.v1
            .services(twilioSyncServiceSid)
            .syncLists.create({ uniqueName: listUniqueName })
            .then((list) => {
              console.log("Created sync list with SID", list.sid);
              listSid = list.sid;
            })
            .catch((error) => {
              console.error(
                "Oh shoot. Something went really wrong creating the list:",
                error.message
              );
            });
        } else {
          console.error("Oh shoot. Error fetching list");
          console.error(error);
        }
      })
      .then(() => {
        // We have a listSid at this point - Add items to list
        client.sync.v1
          .services(twilioSyncServiceSid)
          .syncLists(listSid)
          .syncListItems.create({ data: { speaker, transcript } })
          .then((item) => {
            // console.log(
            //   `Items inserted to list ${item.listSid} at index ${item.index}`
            // );
          })
          .catch((error) => {
            console.error("Error insert items to list", error.message);
          });
      });
  } catch (err) {
    console.log("Oh shoot. Something went really wrong, check logs", err);
  }
}

exports.writeTranscriptToTwilio = writeTranscriptToTwilio;
