const gtmID = "GTM-XXXXXXX";
const enableUserData = true;
const enableDebugger = false;
const defaultCurrency = "EUR";
const storeCountryCode = "DE";

// https://shopify.dev/docs/api/web-pixels-api/standard-events/

// Google Consent Mode
let customerPrivacyStatus = init.customerPrivacy;
window.dataLayer = window.dataLayer || [];
window.gtag = function () {
  window.dataLayer.push(arguments);
};
window.gtag("consent", "default", {
  ad_storage: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
  analytics_storage: customerPrivacyStatus.analyticsProcessingAllowed ? "granted" : "denied",
  ad_user_data: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
  ad_personalization: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
  wait_for_update: 500,
});

// Bing Consent Mode
window.uetq = window.uetq || [];
window.uetq.push("consent", "default", {
  ad_storage: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
});

// Use the customerPrivacy Standard API to subscribe to consent collected events and update the status
api.customerPrivacy.subscribe("visitorConsentCollected", (event) => {
  customerPrivacyStatus = event.customerPrivacy;

  // Google Consent Mode
  window.gtag("consent", "update", {
    ad_storage: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
    analytics_storage: customerPrivacyStatus.analyticsProcessingAllowed ? "granted" : "denied",
    ad_user_data: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
    ad_personalization: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
  });

  // Bing Consent Mode
  window.uetq.push("consent", "update", {
    ad_storage: customerPrivacyStatus.marketingAllowed ? "granted" : "denied",
  });
});

// GTM
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", gtmID);

// Shopify Events
function pushGenericData(eventName, srcEvent, data) {
  const doc = srcEvent.context.document;

  const eventParams = {
    event: eventName,
    timestamp: srcEvent.timestamp,
    event_id: srcEvent.id,
    client_id: srcEvent.clientId,
    page_location: doc.location.href,
    page_pathname: doc.location.pathname,
    page_title: doc.title,
    page_referrer: doc.referrer,
    ...data,
  };

  enableDebugger && console.log("Shopify Event:", srcEvent.name);
  enableDebugger && console.log(srcEvent);
  enableDebugger && console.log(eventParams);

  window.dataLayer.push(eventParams);
}

function getUserData(srcEvent) {
  if (!enableUserData) {
    return null;
  }

  const checkout = srcEvent?.data?.checkout;
  if (!checkout) return null;

  const userData = {
    email: checkout?.email,
    phone_number: checkout?.shippingAddress?.phone || checkout?.phone,
    address: {
      first_name: checkout?.shippingAddress?.firstName,
      last_name: checkout?.shippingAddress?.lastName,
      street: checkout?.shippingAddress?.address1,
      city: checkout?.shippingAddress?.city,
      region: checkout?.shippingAddress?.province,
      postal_code: checkout?.shippingAddress?.zip,
      country: checkout?.shippingAddress?.country_code,
    },
  };

  return userData;
}

function pushEcommerceData(eventName, srcEvent, ecommerceData) {
  window.dataLayer.push({ ecommerce: null });

  let userData = getUserData(srcEvent);

  pushGenericData(eventName, srcEvent, {
    ecommerce: ecommerceData,
    ...(userData ? { user_data: userData } : {}),
  });

  enableDebugger && console.log("Items:", ecommerceData?.items?.length ?? 0);
  enableDebugger && console.log(ecommerceData?.items);
}

function itemFromVariant(variant) {
  const product = variant?.product;

  return {
    item_id: "shopify_" + storeCountryCode + "_" + (product?.id || "") + "_" + (variant?.id || ""),
    product_id: product?.id,
    variant_id: variant?.id,
    sku: variant?.sku,
    item_name: product?.title, // untranslatedTitle
    item_brand: product?.vendor,
    item_category: product?.type,
    price: variant?.price?.amount,
  };
}

function itemFromCheckoutLineItem(lineItem) {
  const variant = lineItem?.variant;
  const discountAllocation = lineItem?.discountAllocations?.[0];
  const quantity = lineItem?.quantity ?? 1;
  const perItemDiscount = (discountAllocation?.amount?.amount ?? 0) / quantity;

  return {
    ...itemFromVariant(variant),
    price: variant?.price?.amount - perItemDiscount,
    quantity,
    coupon: discountAllocation?.discountApplication?.title,
    discount: perItemDiscount,
  };
}

function itemFromCartLine(lineItem) {
  const variant = lineItem?.merchandise;

  return {
    ...itemFromVariant(variant),
    price: variant?.price?.amount,
    quantity: lineItem?.quantity ?? 1,
  };
}

analytics.subscribe("page_viewed", (event) => {
  pushGenericData("page_view", event, {});
});

analytics.subscribe("product_viewed", (event) => {
  const variant = event.data.productVariant;

  pushEcommerceData("view_item", event, {
    currency: variant?.price?.currencyCode || defaultCurrency,
    value: variant?.price?.amount,
    items: [
      {
        ...itemFromVariant(variant),
        quantity: 1,
      },
    ],
  });
});

analytics.subscribe("product_added_to_cart", (event) => {
  const cartLine = event.data?.cartLine;
  const variant = cartLine?.merchandise;

  pushEcommerceData("add_to_cart", event, {
    currency: cartLine?.cost?.totalAmount?.currencyCode || defaultCurrency,
    value: cartLine?.cost?.totalAmount?.amount,
    items: [
      {
        ...itemFromVariant(variant),
        quantity: cartLine?.quantity,
      },
    ],
  });
});

analytics.subscribe("product_removed_from_cart", (event) => {
  const cartLine = event.data?.cartLine;
  const variant = cartLine?.merchandise;

  pushEcommerceData("remove_from_cart", event, {
    currency: cartLine?.cost?.totalAmount?.currencyCode || defaultCurrency,
    value: cartLine?.cost?.totalAmount?.amount,
    items: [
      {
        ...itemFromVariant(variant),
        quantity: cartLine?.quantity,
      },
    ],
  });
});

analytics.subscribe("checkout_started", (event) => {
  const checkout = event.data?.checkout;

  pushEcommerceData("begin_checkout", event, {
    currency: checkout?.currencyCode || defaultCurrency,
    value: checkout?.totalPrice?.amount,
    coupon: checkout?.discountApplications?.map((x) => x.title).join(", "),
    items: checkout?.lineItems?.map(itemFromCheckoutLineItem),
  });
});

analytics.subscribe("checkout_completed", (event) => {
  const checkout = event.data?.checkout;

  pushEcommerceData("purchase", event, {
    transaction_id: checkout?.order?.id,
    value: checkout?.subtotalPrice?.amount,
    value_gross: checkout?.totalPrice?.amount,
    value_net: checkout?.subtotalPrice?.amount - checkout?.totalTax?.amount,
    currency: checkout?.currencyCode || defaultCurrency,
    coupon: checkout?.discountApplications?.map((x) => x.title).join(", "),
    shipping: checkout?.shippingLine?.price?.amount,
    tax: checkout?.totalTax?.amount,
    items: checkout?.lineItems?.map(itemFromCheckoutLineItem),
  });
});

analytics.subscribe("cart_viewed", (event) => {
  const cart = event.data?.cart;

  pushEcommerceData("view_cart", event, {
    currency: cart?.cost?.totalAmount?.currencyCode || defaultCurrency,
    value: cart?.cost?.totalAmount?.amount,
    items: cart?.lines?.map(itemFromCartLine),
  });
});

analytics.subscribe("collection_viewed", (event) => {
  const collection = event.data?.collection;

  pushEcommerceData("view_item_list", event, {
    item_list_id: collection?.id,
    item_list_name: collection?.title,
    items: collection?.productVariants?.map(itemFromVariant),
  });
});

analytics.subscribe("search_submitted", (event) => {
  const searchResult = event.data?.searchResult;

  pushEcommerceData("search", event, {
    search_term: searchResult?.query,
  });
});

analytics.subscribe("checkout_shipping_info_submitted", (event) => {
  const checkout = event.data?.checkout;
  const shippingLine = checkout?.shippingLine;

  pushEcommerceData("add_shipping_info", event, {
    currency: shippingLine?.price?.currencyCode || defaultCurrency,
    value: shippingLine?.price?.amount,
    coupon: checkout?.discountApplications?.map((x) => x.title).join(", "),
    items: checkout?.lineItems?.map(itemFromCheckoutLineItem),
  });
});

analytics.subscribe("payment_info_submitted", (event) => {
  const checkout = event.data?.checkout;

  pushEcommerceData("add_payment_info", event, {
    currency: checkout?.currencyCode || defaultCurrency,
    value: checkout?.totalPrice?.amount,
    coupon: checkout?.discountApplications?.map((x) => x.title).join(", "),
    items: checkout?.lineItems.map(itemFromCheckoutLineItem),
  });
});
