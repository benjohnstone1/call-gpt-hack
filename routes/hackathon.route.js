const config = require("../config/config.js");
const router = config.router;
const client = config.client;
const axios = require("axios");

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
