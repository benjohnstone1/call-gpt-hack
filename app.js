const config = require("./config/config.js");
const workflowSid = config.workflowSid;
const server = config.server;
const segmentKey = config.segmentKey;

const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");

const ExpressWs = require("express-ws");
const colors = require("colors");

const { Analytics } = require("@segment/analytics-node");
const analytics = new Analytics({ writeKey: segmentKey });
const { GptService } = require("./services/gpt-service");
const { GptMessagingService } = require("./services/gpt-messaging-service");
const { StreamService } = require("./services/stream-service");
const { TranscriptionService } = require("./services/transcription-service");
const { TextToSpeechService } = require("./services/tts-service");
const writeTranscript = require("./services/write-transcripts");
const conversationsHelper = require("./services/conversations-helper.js");

// Declare voice response
const VoiceResponse = require("twilio").twiml.VoiceResponse;

const app = express();
ExpressWs(app);

const cors = require("cors");
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

const ioServer = http.createServer(app);
const io = socketIo(ioServer, {
  cors: {
    origin: "*",
  },
});

// Create connection for Virtual Agent logs
io.on("connection", (socket) => {
  console.log("New user connected");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Express Route
const hackathonRoute = require("./routes/hackathon.route");
const initialTools = require("./functions/function-manifest");

//Routes
app.use("/hackathon", hackathonRoute.router);

const PORT = process.env.PORT || 3000;

var callSid;
var callerId;
var locale;
var transcriptionService;

// Define default settings
const systemContext =
  hackathonRoute.userContext?.systemContext ??
  "You are an outbound sales representative selling Apple Airpods. You have a youthful and cheery personality. Keep your responses as brief as possible but make every attempt to keep the caller on the phone without being rude. Don't ask more than 1 question at a time. Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous. Speak out all prices to include the currency. Please help them decide between the airpods, airpods pro and airpods max by asking questions like 'Do you prefer headphones that go in your ear or over the ear?'. If they are trying to choose between the airpods and airpods pro try asking them if they need noise canceling. Once you know which model they would like ask them how many they would like to purchase and try to get them to place an order. If they ask to end the conversation thank them and wish them a good day.";

const languageContext =
  "You speak " + hackathonRoute.userContext?.languageContext ??
  "You speak English";

const agentIntent =
  " If they ask to speak to an Agent, respond with 'Please wait while I direct your call to an available agent.";

const functionContext =
  hackathonRoute.userContext?.functionContext ?? initialTools;

const initialGreeting = hackathonRoute.userContext?.greeting ?? "Hello!";

// Handle Incoming Call
app.post("/incoming", (req, res) => {
  callSid = req.body.CallSid;
  callerId = req.body.Caller;

  //Trigger Segment identity
  analytics.identify({
    userId: callerId,
    traits: {
      phone: callerId,
    },
  });

  res.status(200);
  res.type("text/xml");
  res.end(`
  <Response>
    <Connect>
      <Stream url="wss://${server}/connection" />
    </Connect>
  </Response>
  `);
});

// Handle Incoming Call Connection
app.ws("/connection", (ws, req) => {
  ws.on("error", console.error);
  // Filled in from start message
  let streamSid;

  const gptService = new GptService(
    systemContext + languageContext + agentIntent,
    initialGreeting,
    functionContext,
    callSid,
    callerId
  );

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
      let message = `Starting Media Stream for ${streamSid}`;
      console.log(message.red);
      io.emit("logs", message, "orange");
      ttsService.generate({
        partialResponseIndex: null,
        partialResponse: initialGreeting,
      });
    } else if (msg.event === "media") {
      transcriptionService.send(msg.media.payload);
    } else if (msg.event === "mark") {
      const label = msg.mark.name;
      let message =
        `Twilio -> Audio completed mark (${msg.sequenceNumber}): ${label}`.red;
      console.log(message);
      marks = marks.filter((m) => m !== msg.mark.name);
    } else if (msg.event === "stop") {
      let message = `Twilio -> Media stream ${streamSid} ended.`.underline.red;
      console.log(message);
    }
  });

  gptService.on("functionCall", async (functionName) => {
    let message = `Called ${functionName} function - tracked in Segment`;
    console.log(message.red);
    io.emit("logs", message, "red");
  });

  gptService.on("functionResponse", async (functionResponse, functionArgs) => {
    let message = `Arguments: ${JSON.stringify(
      functionArgs
    )} Response: ${functionResponse}`;
    console.log(message.red);
    io.emit("logs", message, "red");
  });

  // Update transcription service locale
  gptService.on("localeChanged", async (response) => {
    // When language is changed we need to close the existing deepgram instance and create a new instance with new locale
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
      console.log("text received from transcription is".red, text.red);
      writeTranscript.writeTranscriptToTwilio(text, "customer", callSid);
      if (!text) {
        return;
      }
      let message = `User: ${text}`;
      console.log(message.yellow);
      io.emit("logs", message);
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

  gptService.on("gptreply", async (gptReply, icount) => {
    let message = `Agent: ${gptReply.partialResponse}`;
    console.log(message.green);
    io.emit("logs", message, "green");
    ttsService.generate(gptReply, icount);
  });

  ttsService.on("speech", (responseIndex, audio, label, icount) => {
    console.log(`Interaction ${icount}: TTS -> TWILIO: ${label}`.blue);
    writeTranscript.writeTranscriptToTwilio(label, "agent", callSid);

    streamService.buffer(responseIndex, audio);
  });

  streamService.on("audiosent", (markLabel) => {
    marks.push(markLabel);
  });
});

let interactionCount = 0;

// Handle Incoming SMS
app.post("/incomingMessage", async (req, res) => {
  callerId = req.body.From;
  twilioNumber = req.body.To;
  const msg = req.body.Body;

  let message = `User: ${msg}`;
  console.log(message.green);
  io.emit("logs", message);

  const conversationSid =
    await conversationsHelper.checkActiveConversationExists(
      callerId,
      twilioNumber
    );

  const conversationHistory =
    await conversationsHelper.listConversationMessages(conversationSid);

  const gptMessagingService = new GptMessagingService(
    systemContext + languageContext + agentIntent,
    functionContext,
    callerId,
    conversationSid,
    conversationHistory
  );

  gptMessagingService.completion(msg, interactionCount);

  gptMessagingService.on("functionCall", async (functionName) => {
    let message = `Called ${functionName} function - tracked in Segment`;
    console.log(message.red);
    io.emit("logs", message, "red");
  });

  gptMessagingService.on(
    "functionResponse",
    async (functionResponse, functionArgs) => {
      let message = `Arguments: ${JSON.stringify(
        functionArgs
      )} Response: ${functionResponse}`;
      console.log(message.red);
      io.emit("logs", message, "red");
    }
  );

  gptMessagingService.on("gptreply", async (gptReply, icount) => {
    let message = `GPT Agent: ${gptReply.completeResponse}`;
    console.log(message.green);
    io.emit("logs", message, "green");
    interactionCount += 1;
    conversationsHelper.sendMessage(conversationSid, gptReply.completeResponse);
    res.status(200);
  });
});

// Send to Flex
app.post("/speak-to-agent", (req, res) => {
  const resp = new VoiceResponse();
  resp
    .enqueue({
      workflowSid: workflowSid,
    })
    .task({}, JSON.stringify({ action: "transfer to agent" }));
  res.setHeader("Content-Type", "application/xml");
  res.write(resp.toString());
  res.end();
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);

ioServer.listen(5001);
console.log(`Io Server running on port 5001`);
