import invariant from "tiny-invariant";
import sendTwilioMessage from "../helpers/twilio";

export async function getAbondonedCarts(admin, session) {
  try {
    const response = await admin.rest.get({
      path: "/checkouts.json",
      limit: "1",
    });
    const checkouts = await response.json();
    console.log("checkout=================>", checkouts);
    invariant(checkouts, "Cart is empty");
    return checkouts;
  } catch (error) {
    console.error("Error fetching abandoned carts:", error);
    throw error;
  }
}

export async function sendSms(url, to) {
  try {
    const data = await sendTwilioMessage(url, to);
    return data;
  } catch (error) {
    console.log("Failed to send sms: ", error);
    return error;
  }
}
