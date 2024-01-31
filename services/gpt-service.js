const EventEmitter = require("events");
const colors = require("colors");
const OpenAI = require("openai");
const functionsWebhookHandler = require("../functions/functions-webhook");
const speakToAgent = require("./speak-to-agent"); //see if this is first
const tools = require("../functions/function-manifest");

const availableFunctions = {};
tools.forEach((tool) => {
  functionName = tool.function.name;
  availableFunctions[functionName] = require(`../functions/${functionName}`);
});

class GptService extends EventEmitter {
  constructor(systemContext, initialGreeting, functionContext) {
    super();
    this.functionContext = functionContext;
    this.openai = new OpenAI();
    (this.userContext = [
      {
        role: "system",
        content: systemContext,
      },
      {
        role: "assistant",
        content: initialGreeting,
      },
    ]),
      (this.partialResponseIndex = 0);
  }

  async completion(text, interactionCount, role = "user", name = "user") {
    if (name != "user") {
      this.userContext.push({ role: role, name: name, content: text });
    } else {
      this.userContext.push({ role: role, content: text });
    }

    // Step 1: Send user transcription to Chat GPT
    const stream = await this.openai.chat.completions.create({
      // model: "gpt-4-1106-preview",
      model: "gpt-4",
      messages: this.userContext,
      tools: this.functionContext,
      stream: true,
    });

    let completeResponse = "";
    let partialResponse = "";
    let functionName = "";
    let functionArgs = "";
    let finishReason = "";

    for await (const chunk of stream) {
      let content = chunk.choices[0]?.delta?.content || "";
      let deltas = chunk.choices[0].delta;

      // Step 2: check if GPT wanted to call a function
      if (deltas.tool_calls) {
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
      finishReason = chunk.choices[0].finish_reason;

      // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === "tool_calls") {
        // parse JSON string of args into JSON object
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

        const functionToCall = availableFunctions[functionName];
        let functionResponse = functionToCall(functionArgs);

        console.log(functionResponse);

        const segmentTrack = await functionsWebhookHandler.makeSegmentTrack(
          functionArgs,
          functionName
        );

        if (functionName === "checkLanguage") {
          console.log("Language locale is".green, functionResponse.green);
          this.emit("localeChanged", functionResponse);
        }

        // Step 4: send the info on the function call and function response to GPT
        this.userContext.push({
          role: "function",
          name: functionName,
          content: functionResponse,
        });
        // extend conversation with function response

        // call the completion function again but pass in the function response to have OpenAI generate a new assistant response
        await this.completion(
          functionResponse,
          interactionCount,
          "function",
          functionName
        );
      } else {
        // We use completeResponse for userContext
        completeResponse += content;
        // We use partialResponse to provide a chunk for TTS
        partialResponse += content;
        // Emit last partial response and add complete response to userContext
        if (content.trim().slice(-1) === "•" || finishReason === "stop") {
          const gptReply = {
            partialResponseIndex: this.partialResponseIndex,
            partialResponse,
          };

          this.emit("gptreply", gptReply, interactionCount);
          this.partialResponseIndex++;
          partialResponse = "";
        }
      }
    }
    if (completeResponse.includes("available agent")) {
      await speakToAgent(callSID);
    }

    this.userContext.push({ role: "assistant", content: completeResponse });
    // console.log(`GPT -> user context length: ${this.userContext.length}`.green);
  }
}

module.exports = { GptService };
