const config = require("../config/config.js");
const router = config.router;
const client = config.client;
const axios = require("axios");
const fs = require('fs');

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
          },
          parameters: {
            type: "object",
            properties: {
              [functionContext[i].properties[j].name]: {
                type: functionContext[i].properties[j].type, //update in react to lower case
                enum: functionContext[i].properties[j].enum,
                description: functionContext[i].properties[j].desc,
              },
            },
            required: [functionContext[i].properties[j].name], //may need to adjust, making all props required
          },
          returns: {
            type: "object",
            properties: {
              [functionContext[i].returnObjProperties[j].name]: {
                type: functionContext[i].returnObjProperties[j].type,
                description: functionContext[i].returnObjProperties[j].desc,
              },
            },
          },
        };
      }
    }
    tools.push(toolsObj);
    
    //check if file name exists, create copy of templateFunctions.js
    let fileName = __dirname + '/../functions/' + functionContext[i].name + '.js'
    let templateFilePath = __dirname + '/../functions/templateFunction.js';
    console.log(fileName);
    
    fs.stat(fileName, function(err, stat) {
      console.log(err);
      if (err == null) {
        // file exists
        console.log("Function File Exists");
      } else {
        // file doesn't exist
        console.log("Function File doesn't exist");
        fs.copyFile(templateFilePath, fileName, (error) => {
          if (error) {
            console.log ("error Found:", error)
          } else {
            console.log(`Function File ${functionContext[i].name} has been created`);
          }
        })
      }
    });

  }
  return tools;
};

// Sets user context
router.post("/set-user-context/", async (req, res, next) => {
  try {
    let greeting = req.body.greeting;
    let systemContext = req.body.context;
    let languageContext = req.body.languageContext;
    let functionContext = req.body.functionContext;

    const tools = createTools(functionContext);
    console.log(tools[0]);

    userContext = {
      systemContext: systemContext,
      greeting: greeting,
      languageContext: languageContext,
      functionContext: tools,
    };
    exports.userContext = userContext; //how do we access this on submit?
    return res.status(200).send("Updated context");
  } catch (e) {
    console.log(e);
  }
});

exports.router = router;
