require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const ExpressWs = require("express-ws");
const colors = require("colors");



const { Analytics } = require('@segment/analytics-node')
const analytics = new Analytics({ writeKey: process.env.SEGMENT_API_KEY })
const { GptService } = require("./services/gpt-service");
const { StreamService } = require("./services/stream-service");
const { TranscriptionService } = require("./services/transcription-service");
const { TextToSpeechService } = require("./services/tts-service");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const twilioSyncServiceSid = process.env.TRANSCRIPT_SYNC_SERVICE_SID;

const app = express();
ExpressWs(app);

const cors = require("cors");
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Express Route
const hackathonRoute = require("./routes/hackathon.route");

//Routes
app.use("/hackathon", hackathonRoute.router);

app.get("/basicWebhook",function(request, response){
  console.log("Test Webhook Triggered with URL: ", request.url);
  response.writeHead(200, {"Content-Type": "application/json"});
});


const PORT = process.env.PORT || 3000;

app.post("/incoming", (req, res) => {
  //set call SID as global variable
  global.callSID = req.body.CallSid;
  global.callerID = req.body.Caller;
  
  //Trigger Segment identity
  analytics.identify({
    userId: callerID,
    traits: {
      phone: callerID
    }
  });

  //Start media stream to app's Chat GPT service
  res.status(200);
  res.type("text/xml");
  res.end(`
  <Response>
    <Connect>
      <Stream url="wss://${process.env.SERVER}/connection" />
    </Connect>
  </Response>
  `);
});

var locale;
var transcriptionService;

app.ws("/connection", (ws, req) => {
  ws.on("error", console.error);
  // Filled in from start message
  let streamSid;

  const systemContext =
    hackathonRoute.userContext?.systemContext ??
    "You are an outbound sales representative selling Apple Airpods. You speak english and french. You have a youthful and cheery personality. Keep your responses as brief as possible but make every attempt to keep the caller on the phone without being rude. Don't ask more than 1 question at a time. Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous. Speak out all prices to include the currency. Please help them decide between the airpods, airpods pro and airpods max by asking questions like 'Do you prefer headphones that go in your ear or over the ear?'. If they are trying to choose between the airpods and airpods pro try asking them if they need noise canceling. Once you know which model they would like ask them how many they would like to purchase and try to get them to place an order. You must add a '•' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech.";

  const initialGreeting = hackathonRoute.userContext?.greeting ?? "Hello!";
  // "Hello! I understand you're looking for a pair of AirPods, is that correct?";

  const gptService = new GptService(systemContext, initialGreeting);

  const streamService = new StreamService(ws);

  var checkNewInstance = true;
  if (checkNewInstance === true) {
    locale = "en"; // e.g. en, fr, it, es
    transcriptionService = new TranscriptionService(locale);
  }

  const ttsService = new TextToSpeechService({});

  let marks = [];
  let interactionCount = 0;

  // Incoming from MediaStream
  ws.on("message", function message(data) {
    const msg = JSON.parse(data);
    if (msg.event === "start") {
      streamSid = msg.start.streamSid;
      streamService.setStreamSid(streamSid);
      console.log(
        `Twilio -> Starting Media Stream for ${streamSid}`.underline.red
      );
      ttsService.generate({
        partialResponseIndex: null,
        partialResponse: initialGreeting,
      });
    } else if (msg.event === "media") {
      transcriptionService.send(msg.media.payload);
    } else if (msg.event === "mark") {
      const label = msg.mark.name;
      console.log(
        `Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red
      );
      marks = marks.filter((m) => m !== msg.mark.name);
    } else if (msg.event === "stop") {
      console.log(`Twilio -> Media stream ${streamSid} ended.`.underline.red);
    }
  });

  // Update transcription service locale
  gptService.on("localeChanged", async (response) => {
    //When language is changed we need to close the existing deepgram instance and create a new one
    let newLocale = JSON.parse(response).locale;
    transcriptionService.closeConnection();
    checkNewInstance = false;
    locale = newLocale;
    const newTranscriptionService = new TranscriptionService(locale);
    transcriptionService = newTranscriptionService;
    transcriptionEventListener(transcriptionService);
  });

  function transcriptionEventListener(transcriptionService) {
    transcriptionService.on("transcription", async (text) => {
      console.log("text received from transcription is".red, text.red); //this is what the human says
      writeTranscriptToTwilio(text, "customer");

      if (!text) {
        return;
      }
      console.log(
        `Interaction ${interactionCount} – STT -> GPT: ${text}`.yellow,
        locale.yellow
      );
      gptService.completion(text, interactionCount);
      interactionCount += 1;
    });

    transcriptionService.on("utterance", async (text) => {
      // This is a bit of a hack to filter out empty utterances
      if (marks.length > 0 && text?.length > 5) {
        console.log("Twilio -> Interruption, Clearing stream".red);
        ws.send(
          JSON.stringify({
            streamSid,
            event: "clear",
          })
        );
      }
    });
  }
  transcriptionEventListener(transcriptionService);


  function writeTranscriptToTwilio (transcript, speaker) {
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
            .syncListItems.create({data: {speaker, transcript}})
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

  gptService.on("gptreply", async (gptReply, icount) => {
    console.log(
      `Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green
    );
    ttsService.generate(gptReply, icount);
  });

  ttsService.on("speech", (responseIndex, audio, label, icount) => {
    console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue); //This is what the virtual agent says
    writeTranscriptToTwilio(label, "agent");

    streamService.buffer(responseIndex, audio);
  });

  streamService.on("audiosent", (markLabel) => {
    marks.push(markLabel);
  });
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);
