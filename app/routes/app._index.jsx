import { useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  IndexTable,
  EmptyState,
  Toast,
  Frame,
} from "@shopify/polaris";
import { CartDownFilledMajor } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getAbondonedCarts, sendSms } from "../models/Cart.server";
import formatDistanceToNow from "date-fns/formatDistanceToNow";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const data = await getAbondonedCarts(admin, session);
  return json({ carts: data?.checkouts });
};

export async function action({ request, params }) {
  const abandonedCartData = { ...Object.fromEntries(await request.formData()) };
  const data = await sendSms(
    abandonedCartData.messageContent,
    abandonedCartData.phone
  );
  redirect("/app");
  return json(data);
}

const EmptyCartState = () => (
  <EmptyState heading="Abondoned checkout item" image={CartDownFilledMajor}>
    <p>AThere is no abondoned checkout item.</p>
  </EmptyState>
);

const CartTable = ({ carts, loadingState, handleLoadingState }) => (
  <IndexTable
    resourceName={{
      singular: "Cart",
      plural: "Carts",
    }}
    itemCount={carts?.length || 0}
    headings={[
      { title: "Customer Details" },
      { title: "Product Details" },
      { title: "Cart Value" },
      { title: "Cart Creation" },
      { title: "Action" },
    ]}
    selectable={false}
  >
    {carts?.map((cart) => (
      <CartTableRow
        key={cart.id}
        cart={cart}
        loadingState={loadingState}
        handleLoadingState={handleLoadingState}
      />
    ))}
  </IndexTable>
);

const CartTableRow = ({ cart, loadingState, handleLoadingState }) => {
  const submit = useSubmit();
  async function handleSave(cart) {
    try {
      const messageContent = `Hi ${cart.customer?.first_name} ${cart.customer?.last_name}, 
      Something was left in your cart! Come on back and grab it before it’s gone. 
      ${cart.abandoned_checkout_url}`;

      handleLoadingState(cart.id);
      const data = {
        messageContent,
        phone: cart.customer?.phone,
      };
      await submit(data, { method: "post" });
    } catch (error) {
      console.log("error===>", error);
    }
  }
  return (
    <>
      <IndexTable.Row id={cart.id} position={cart.id}>
        <IndexTable.Cell>
          {cart.customer?.first_name} {cart.customer?.last_name}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {cart.line_items?.map((item) => item?.title)}
        </IndexTable.Cell>
        <IndexTable.Cell>{cart.total_price}</IndexTable.Cell>
        <IndexTable.Cell>
          {formatDistanceToNow(new Date(cart.created_at), { addSuffix: true })}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {cart.customer.phone && (
            <Button
              loading={loadingState === cart.id}
              disabled={loadingState !== null && loadingState !== cart.id}
              onClick={() => handleSave(cart)}
              variant="primary"
              tone="success"
            >
              Send Url
            </Button>
          )}
        </IndexTable.Cell>
      </IndexTable.Row>
    </>
  );
};

export default function Index() {
  const { carts } = useLoaderData();

  const [loadingState, setLoadingState] = useState(null);
  const [toastContent, setToastContent] = useState(null);
  let actionData = useActionData();

  useEffect(() => {
    if (actionData) {
      setLoadingState(null);
      const smsStatus = actionData.status;
      if (smsStatus === "queued" || smsStatus === "sent") {
        setToastContent("Message sent successfully");
      } else {
        setToastContent("Error sending message");
      }
    }
  }, [actionData]);

  const showToast = () => {
    if (toastContent) {
      return (
        <Toast content={toastContent} onDismiss={() => setToastContent(null)} />
      );
    }
    return null;
  };

  const handleLoadingState = (value) => {
    setLoadingState(value);
  };

  return (
    <Frame>
      {showToast()}
      <Page>
        <ui-title-bar title="Abondoned Cart"></ui-title-bar>

        <Layout>
          <Layout.Section>
            <Card title="Abandoned Carts" padding="0">
              {carts?.length === 0 ? (
                <EmptyCartState />
              ) : (
                <CartTable
                  carts={carts}
                  loadingState={loadingState}
                  handleLoadingState={handleLoadingState}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
