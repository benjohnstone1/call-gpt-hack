const config = require("../config/config.js");
const router = config.router;
const client = config.client;
const axios = require("axios");
// const OpenAI = require("openai");

// const openai = new OpenAI({
//   apiKey: config.apiKeyOpenAI,
// });

// Client requests ask gpt prompt
// router.get("/ask-gpt/:prompt", async (req, res, next) => {
//   //   let response = await askGPT(req.params.prompt);
//   try {
//     let response = await askGPT(req.params.prompt);
//     console.log(response);
//     return res.status(200).send(response.message.content);
//   } catch (e) {
//     console.log(e);
//   }
// });

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
      functionContext: functionContext,
    };
    exports.userContext = userContext; //how do we access this on submit?
    console.log(userContext);
    return res.status(200).send("Updated context");
  } catch (e) {
    console.log(e);
  }
});

exports.router = router;
