// // twilioHelper.js
import twilio from "twilio";

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;

async function sendTwilioMessage(url, to) {
  const client = twilio(accountSid, authToken);
  try {
    const message = await client.messages.create({
      body: url,
      from: process.env.senderPhone,
      to,
    });

    console.log(`Message sent with SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("Error sending message:", error.message);
    throw error;
  }
}

export default sendTwilioMessage;
