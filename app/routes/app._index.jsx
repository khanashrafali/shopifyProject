import { useCallback, useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  IndexTable,
  EmptyState,
  Toast,
  Frame,
  Stack,
  InlineStack,
  ButtonGroup,
  Filters,
  ChoiceList,
} from "@shopify/polaris";
import { CartDownFilledMajor } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getAbondonedCarts, sendSms } from "../models/Cart.server";
import formatDistanceToNow from "date-fns/formatDistanceToNow";

// export const loader = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);
//   const data = await getAbondonedCarts(admin, session);
//   console.log('searchhh====>', request)
//   return json({ carts: data?.checkouts });
// };

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const days = url.searchParams.get('days');
  const query = url.searchParams.get('query');
  console.log("querryr=========", request)
  const data = await getAbondonedCarts(admin, session, days, query);
  return json({ carts: data });
};

export async function action({ request, params }) {
  const abandonedCartData = { ...Object.fromEntries(await request.formData()) };
  const checkoutData = {
    customerId: abandonedCartData.customerId,
    checkoutId: abandonedCartData.checkoutId,
  };
  const data = await sendSms(
    abandonedCartData.messageContent,
    abandonedCartData.phone,
    checkoutData
  );
  redirect("/app");
  return json(data);
}

export const fetch = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { days, query } = JSON.parse(request.body.toString());
  const data = await getAbondonedCarts(admin, session, { days, query });
  return json({ checkouts: data.checkouts });
};

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
      { title: "Sent Count" },
      { title: "Last Sent Date" },
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
        customerId: cart.customer.id,
        checkoutId: cart.id,
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
        <IndexTable.Cell>{cart.urlSentCount}</IndexTable.Cell>
        <IndexTable.Cell>
          {cart.lastSentDate
            ? formatDistanceToNow(new Date(cart.lastSentDate), {
                addSuffix: true,
              })
            : "Not Sent Yet"}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
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
            
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    </>
  );
};

export default function Index({request}) {
  const { carts } = useLoaderData();

  const [loadingState, setLoadingState] = useState(null);
  const [toastContent, setToastContent] = useState(null);
  const [queryValue, setQueryValue] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const navigate = useNavigate()
  let actionData = useActionData();
  useEffect(() => {
    // Parse URL parameters
    
    const url = new URL(window.location.href);
    const days = url.searchParams.get('days');
    const query = url.searchParams.get('query');
  
    // Update state only if URL parameters are present
    if (days !== null) {
      setDateFilter(days);
    }
  
    if (query !== null) {
      setQueryValue(query);
    }
  }, []);

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

  const handleDateFilterChange = useCallback(
    (value) => setDateFilter(value),
    [],
  );
  const handleFiltersQueryChange = useCallback(
    (value) => setQueryValue(value),
    [],
  );
  const handleDateFilterRemove = useCallback(() => setDateFilter(''), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);

  const handleFiltersClearAll = useCallback(() => {
    handleDateFilterRemove();
    handleQueryValueRemove();
  }, [
    handleDateFilterRemove,
    handleQueryValueRemove,
  ]);

  useEffect(() => {
    navigate(`/app?days=${dateFilter}&query=${queryValue}`);
  }, [dateFilter, queryValue]);

  function isEmpty(value) {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === '' || value == null;
    }
  }

  const filerLabel = (value) => {
    switch (value) {
      case '7': return '1 Week';
      case '14': return '2 Week';
      case '30': return '1 Month';
      case '90': return '3 Month';
      default: return ''
    }
  }

  const appliedFilters = [];
  if (!isEmpty(dateFilter)) {
    const key = 'Date';
    appliedFilters.push({
      key,
      label: filerLabel(dateFilter.toString()),
      onRemove: handleDateFilterRemove,
    });
  }
  const filters = [
    {
      key: 'Date',
      label: 'Date Fielters',
      filter: (
        <ChoiceList
          title="Date Fielters"
          titleHidden
          choices={[
            {label: '1 Week', value: '7'},
            {label: '2 Week', value: '14'},
            {label: '1 month', value: '30'},
            {label: '3 month', value: '90'},
          ]}
          selected={dateFilter || ''}
          onChange={handleDateFilterChange}
          // allowMultiple
        />
      ),
      shortcut: true,
    }
  ]

  return (
    <Frame>
      {showToast()}
      <Page>
        <ui-title-bar title="Abondoned Cart"></ui-title-bar>

        <Layout>
          <Layout.Section>
          <Filters
          // queryValue={queryValue}
          // queryPlaceholder="Search items"
          hideQueryField={true}
          filters={filters}
          appliedFilters={appliedFilters}
          onQueryChange={handleFiltersQueryChange}
          onQueryClear={handleQueryValueRemove}
          onClearAll={handleFiltersClearAll}
        />
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
