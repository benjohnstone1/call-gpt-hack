const config = require("../config/config.js");
const client = config.client;

const checkActiveConversationExists = async (phoneNumber, twilioNumber) => {
  const participantConversations =
    await client.conversations.v1.participantConversations.list({
      address: phoneNumber,
    });
  if (participantConversations?.length > 0) {
    const conversationSid = participantConversations[0].conversationSid;
    console.log("Conversation sid is", conversationSid);
    return conversationSid;
  } else {
    const conversationSid = await createConversation(phoneNumber, twilioNumber);
    console.log("Conversation sid is", conversationSid);
    return conversationSid;
  }
};

const createConversation = async (phoneNumber, twilioNumber) => {
  try {
    const conversation = await client.conversations.v1.conversations.create({
      friendlyName: "SMS AI IVR",
    });
    console.log("Created new conversation", conversation.sid);

    const participant = await client.conversations.v1
      .conversations(conversation.sid)
      .participants.create({
        "messagingBinding.address": phoneNumber,
        "messagingBinding.proxyAddress": twilioNumber,
      });

    return conversation.sid;
  } catch (e) {
    console.log(e);
  }
};

// createConversation("+16477782422", "+12492019235");

const sendMessage = async (conversationSid, body) => {
  const message = await client.conversations.v1
    .conversations(conversationSid)
    .messages.create({ body: body });
};

const listConversationMessages = async (conversationSid) => {
  const messages = await client.conversations.v1
    .conversations(conversationSid)
    .messages.list({ limit: 20, order: "desc" });
  let msgArray = [];
  messages.forEach((m) => {
    if (m.author === "system") {
      role = "assistant";
    } else {
      role = "user";
    }
    msgArray.push({ role: role, content: m.body });
  });
  return msgArray;
};

// When interaction is over, remove participant to close the conversation
const removeConversationParticipant = async (
  conversationSid,
  participantSid
) => {
  const conversation = await client.conversations.v1
    .conversations(conversationSid)
    .participants(participantSid)
    .remove();
  console.log("Conversation closed", conversationSid);
};

const checkConversationParticipants = async (conversationSid) => {
  const participants = await client.conversations.v1
    .conversations(conversationSid)
    .participants.list({ limit: 1 }); //we are only returning the single participant
  console.log(participants[0].sid);
  return participants[0].sid;
};

const closeConversation = async (conversationSid) => {
  participantSid = await checkConversationParticipants(conversationSid);
  removeConversationParticipant(conversationSid, participantSid);
};

exports.checkActiveConversationExists = checkActiveConversationExists;
exports.listConversationMessages = listConversationMessages;
exports.sendMessage = sendMessage;
exports.closeConversation = closeConversation;
