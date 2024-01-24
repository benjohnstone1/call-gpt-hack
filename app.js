require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const ExpressWs = require("express-ws");
const colors = require("colors");

const { GptService } = require("./services/gpt-service");
const { StreamService } = require("./services/stream-service");
const { TranscriptionService } = require("./services/transcription-service");
const { TextToSpeechService } = require("./services/tts-service");

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

const PORT = process.env.PORT || 3000;

app.post("/incoming", (req, res) => {
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

  const initialGreeting = hackathonRoute.userContext?.greeting ?? "Bonjour!";
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
    let newLocale = JSON.parse(response).locale;
    transcriptionService.closeConnection(); //close existing transcription service then create new instance
    checkNewInstance = false;
    locale = newLocale;
    const newTranscriptionService = new TranscriptionService(locale);
    transcriptionService = newTranscriptionService;
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

  // for some reason this is not being called on the new instance
  transcriptionService.on("transcription", async (text) => {
    console.log("text received from transcription is".red, text.red);
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

  gptService.on("gptreply", async (gptReply, icount) => {
    console.log(
      `Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`.green
    );
    ttsService.generate(gptReply, icount);
  });

  ttsService.on("speech", (responseIndex, audio, label, icount) => {
    console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);

    streamService.buffer(responseIndex, audio);
  });

  streamService.on("audiosent", (markLabel) => {
    marks.push(markLabel);
  });
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);
