const EventEmitter = require("events");
const colors = require("colors");
const OpenAI = require("openai");
const functionsWebhookHandler = require("../functions/functions-webhook");
const speakToAgent = require("./speak-to-agent");
const tools = require("../functions/function-manifest");
const conversationsHelper = require("./conversations-helper");

class GptMessagingService extends EventEmitter {
  constructor(
    systemContext,
    functionContext,
    callerId,
    conversationSid,
    conversationHistory
  ) {
    super();
    this.functionContext = functionContext;
    this.callerId = callerId;
    this.conversationSid = conversationSid;
    this.conversationHistory = conversationHistory;
    this.openai = new OpenAI();
    this.availableFunctions = {};
    this.functionContext.forEach((tool) => {
      var functionName = tool.function.name;
      var webhookURL = tool.function.webhookURL;
      this.availableFunctions[functionName] = webhookURL;
    });

    (this.userContext = [
      {
        role: "system",
        content: systemContext,
      },
    ]),
      (this.partialResponseIndex = 0);

    for (let i = 0; i < conversationHistory.length; i++) {
      this.userContext.push(conversationHistory.reverse()[i]);
    }
  }

  async completion(text, interactionCount, role = "user", name = "user") {
    if (name != "user") {
      this.userContext.push({ role: role, name: name, content: text });
    } else {
      this.userContext.push({ role: role, content: text });
    }

    // Step 1: Send user transcription to Chat GPT
    const stream = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: this.userContext,
      tools: this.functionContext,
      stream: false, // No stream required for SMS
    });

    let completeResponse = "";
    let functionName = "";
    let functionArgs = "";
    let finishReason = "";

    let content = stream.choices[0]?.delta?.content || "";
    let deltas = stream.choices[0]?.message;

    // Step 2: check if GPT wanted to call a function
    if (stream.choices[0].finish_reason === "tool_calls") {
      // if (deltas.tool_calls) {
      // Step 3: call the function
      let name = deltas.tool_calls[0]?.function?.name || "";
      if (name != "") {
        functionName = name;
      }
      let args = deltas.tool_calls[0]?.function?.arguments || "";
      if (args != "") {
        // args are streamed as JSON string so we need to concatenate all chunks
        functionArgs += args;
      }
    }
    // check to see if it is finished
    finishReason = stream.choices[0].finish_reason;

    // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
    if (finishReason === "tool_calls") {
      // parse JSON string of args into JSON object
      this.emit("functionCall", functionName);
      try {
        functionArgs = JSON.parse(functionArgs);
      } catch (error) {
        // was seeing an error where sometimes we have two sets of args
        if (functionArgs.indexOf("{") != functionArgs.lastIndexOf("{"))
          functionArgs = JSON.parse(
            functionArgs.substring(
              functionArgs.indexOf(""),
              functionArgs.indexOf("}") + 1
            )
          );
      }

      let webhook_url = this.availableFunctions[functionName];
      const functionWebhook = await functionsWebhookHandler.makeWebhookRequest(
        webhook_url,
        "POST",
        functionArgs,
        this.callSid
      );

      let functionResponse = JSON.stringify(functionWebhook);
      this.emit("functionResponse", functionResponse, functionArgs);

      const segmentTrack = await functionsWebhookHandler.makeSegmentTrack(
        functionArgs,
        functionName,
        this.callerId,
        "SMS AI IVR"
      );

      // Step 4: send the info on the function call and function response to GPT
      this.userContext.push({
        role: "function",
        name: functionName,
        content: functionResponse,
      });

      // call the completion function again but pass in the function response to have OpenAI generate a new assistant response
      await this.completion(
        functionResponse,
        interactionCount,
        "function",
        functionName
      );
    } else {
      completeResponse += deltas.content;
      const gptReply = {
        completeResponse: deltas.content,
      };
      this.emit("gptreply", gptReply, interactionCount);
    }

    const completeConditions = ["end", "conversation", "done", "complete"];

    if (completeConditions.some((el) => text.toLowerCase().includes(el))) {
      console.log("Closing conversation");
      await conversationsHelper.closeConversation(this.conversationSid);
    }

    const agentConditions = ["agent", "human", "real person"];

    if (agentConditions.some((el) => text.toLowerCase().includes(el))) {
      console.log("Transferring to agent");
      await speakToAgent.transferSMSToAgent(this.callerId);
    }

    this.userContext.push({ role: "assistant", content: completeResponse });
  }
}

module.exports = { GptMessagingService };
