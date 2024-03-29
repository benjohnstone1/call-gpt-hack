const config = require("../config/config.js");
const router = config.router;

let userContext = {};

const createTools = (functionContext) => {
  const tools = [];
  for (let i = 0; i < functionContext.length; i++) {
    for (let j = 0; j < functionContext[i].properties.length; j++) {
      for (let k = 0; k < functionContext[i].returnObjProperties.length; k++) {
        var toolsObj = {
          type: "function",
          function: {
            name: functionContext[i].name,
            description: functionContext[i].desc,
            webhookURL: functionContext[i].webhookURL,
          },
          parameters: {
            type: "object",
            properties: {
              [functionContext[i].properties[j].name]: {
                type: functionContext[i].properties[j].type,
                enum: functionContext[i].properties[j].enum,
                description: functionContext[i].properties[j].desc,
              },
            },
            required: [functionContext[i].properties[j].name],
          },
          returns: {
            type: "object",
            properties: {
              [functionContext[i].returnObjProperties[k].name]: {
                type: functionContext[i].returnObjProperties[k].type,
                description: functionContext[i].returnObjProperties[k].desc,
              },
            },
          },
        };
      }
    }
    tools.push(toolsObj);
  }
  console.dir(tools[0], { depth: null }); //print full object
  return tools;
};

// Sets user context
router.post("/set-user-context/", async (req, res, next) => {
  try {
    let greeting = req.body.greeting;
    let systemContext = req.body.context;
    // let languageContext = req.body.languageContext;
    let functionContext = req.body.functionContext;
    let initialLanguage = req.body.initialLanguage;
    let initialVoice = req.body.initialVoice;

    const tools = createTools(functionContext);

    console.log("initial voice is", initialVoice);
    console.log("initial greeting is", greeting);
    if (!tools) {
      console.log("No tools sent");
    }

    userContext = {
      systemContext: systemContext,
      greeting: greeting,
      // languageContext: languageContext,
      initialLanguage: initialLanguage,
      initialVoice: initialVoice,
      functionContext: tools,
    };
    exports.userContext = userContext;
    return res.status(200).send("Updated virtual agent context");
  } catch (e) {
    console.log(e);
  }
});

exports.router = router;
