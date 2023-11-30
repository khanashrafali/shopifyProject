import invariant from "tiny-invariant";
import sendTwilioMessage from "../helpers/twilio";
import db from "../db.server";

export async function getAbondonedCarts(admin, session,days, query) {
  try {
    const queryParams = {

    };
console.log('dayssss===========>', days)
    // Conditionally add the created_at_min parameter if days is provided
    if (days) {
      queryParams.created_at_min = daysAgo(days);
    }
    const response = await admin.rest.get({
      path: "/checkouts.json",
      limit: "1",
      query: queryParams
    });
    const checkouts = await response.json();
    // console.log("checkout=================>", checkouts.checkouts[0].customer);
    // invariant(checkouts, "Cart is empty");
    // return checkouts;
    const prismaData = await db.CheckoutUrlHistoryData.groupBy({
      by: ["customerId", "checkoutId"],
      _count: { id: true },
      _max: { sentAt: true },
    });
    console.log("groupedData========>", prismaData);
    // Combine the data
    const combinedData = checkouts.checkouts.map((checkout) => {
      const prismaRecord = prismaData.find(
        (record) =>
          record.customerId.toString() === checkout.customer.id.toString() &&
          record.checkoutId.toString() === checkout.id.toString()
      );

      return {
        ...checkout,
        urlSentCount: prismaRecord?._count?.id || 0,
        lastSentDate: prismaRecord?._max?.sentAt || null,
      };
    });

    invariant(checkouts, "Cart is empty");
    console.log("cartnewData=======================>", combinedData);
    return combinedData;
  } catch (error) {
    console.error("Error fetching abandoned carts:", error);
    throw error;
  }
}

function daysAgo(days) {
  const today = new Date();
  const daysAgoDate = new Date(today);
  daysAgoDate.setDate(today.getDate() - days);
  return daysAgoDate.toISOString();
}

export async function sendSms(url, to, checkoutData) {
  try {
    invariant(checkoutData, "Customer ID is missing");
    const data = await sendTwilioMessage(url, to);
    console.log("daaaaa=========>", checkoutData);
    const createUrlSentEvent = await db.CheckoutUrlHistoryData.create({
      data: {
        customerId: checkoutData.customerId,
        checkoutId: checkoutData.checkoutId,
      },
    });
    return data;
  } catch (error) {
    console.log("Failed to send sms: ", error);
    return error;
  }
}
