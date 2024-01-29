const config = require("../config/config.js");
const router = config.router;
const client = config.client;
const axios = require("axios");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: config.apiKeyOpenAI,
});

let promptArray = [
  { role: "system", content: "You are a helpful assistant." },
  {
    role: "assistant",
    content:
      "Hello! I understand you're looking for a pair of AirPods, is that correct?",
  },
];

async function askGPT(prompt) {
  promptArray.push({ role: "user", content: prompt });
  console.log(promptArray);
  const completion = await openai.chat.completions.create({
    messages: promptArray,
    model: "gpt-3.5-turbo",
  });
  return completion.choices[0];
}

// Client requests ask gpt prompt
router.get("/ask-gpt/:prompt", async (req, res, next) => {
  //   let response = await askGPT(req.params.prompt);
  try {
    let response = await askGPT(req.params.prompt);
    console.log(response);
    return res.status(200).send(response.message.content);
  } catch (e) {
    console.log(e);
  }
});

let userContext = {};

// Sets user context
router.post("/set-user-context/", async (req, res, next) => {
  try {
    let greeting = req.body.greeting;
    let systemContext = req.body.context;
    let languageContext = req.body.languageContext;
    let functionContext = req.body.functionContext;
    userContext = {
      systemContext: systemContext,
      greeting: greeting,
      languageContext: languageContext,
      functionContext: functionContext
    };
    exports.userContext = userContext;
    console.log(userContext);
    return res.status(200).send("Updated context");
  } catch (e) {
    console.log(e);
  }
});

exports.router = router;
