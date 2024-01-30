//config
const accountSid = process.env.TWILIO_ACCOUNT_SID_FLEX;
const authToken = process.env.TWILIO_AUTH_TOKEN_FLEX;
const client = require("twilio")(accountSid, authToken);
const twilioSyncServiceSid = process.env.TRANSCRIPT_SYNC_SERVICE_SID;

function writeTranscriptToTwilio(transcript, speaker) {
  console.log("Incoming event to store document");
  if (!callSID || !transcript) {
    const error = "Missing CallSid or transcript data";
    response.setBody({ message: error });
    response.setStatusCode(400);
  }

  const listUniqueName = "Transcript-" + callSID;
  console.log("Using Sync service with SID", twilioSyncServiceSid);
  console.log("List Unique ID", listUniqueName);
  let listSid = undefined;

  try {
    // Check if list exists and update
    client.sync.v1
      .services(twilioSyncServiceSid)
      .syncLists(listUniqueName)
      .fetch()
      .then((list) => {
        console.log("List exists, SID", list.sid);
        listSid = list.sid;
        needToCreate = false;
      })
      .catch(async (error) => {
        // Need to create document
        if (error.code && error.code == 20404) {
          console.log("List doesn't exist, creating");
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
            console.log(
              `Items inserted to list ${item.listSid} at index ${item.index}`
            );
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
