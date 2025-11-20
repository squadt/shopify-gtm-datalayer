# Shopify Custom GTM Pixel + dataLayer

This repository contains a custom Google Tag Manager (GTM) pixel script for Shopify.  
It includes GTM, dataLayer, consent modes (Google & Bing/MS Advertising), and various [Shopify events](https://shopify.dev/docs/api/web-pixels-api/standard-events/) using the [GA4 standard](https://developers.google.com/analytics/devguides/collection/ga4/reference/events).

## Script Overview

### Functions

- **GTM Integration**
- **dataLayer**: Shopify E-Commerce events
- **Consent Modes**: Google and Bing consent modes based on Shopify customer privacy settings

## Create a Shopify Custom Pixel

1. Open Shopify shop settings (bottom left gear icon)
2. Go to "Customer events"
3. Click "Add custom pixel", name it "Google Tag Manager", click "Add pixel"
4. - a) If you only want to load the script/gtm, when the user has accepted cookies, check "Marketing" and "Analytics" in "Customer privacy">"Permission"
   - b) If you want to make use of advanced consent mode, uncheck both
5. Paste the entire js file into the code window
6. Modify the variables (GTM ID, ... see below)
7. Click Save and connect the Pixel.

## Variables

- **gtmID**: Replace `GTM-XXXXXXX` with your actual GTM ID.
- **enableUserData**: Set to `true` to push user data with checkout events, `false` to disable.
- **enableDebugger**: Set to `true` to enable console logging for debugging, `false` to disable.
- **defaultCurrency**: Set the default currency code (e.g., `"EUR"`).
- **storeCountryCode**: Set the store's country code (e.g., `"DE"`).
- **storeIncludesTax**: Set to `true` if the store is configured to use tax-inclusive pricing, `false` if tax is excluded.
- **taxRate**: Set the general tax rate (e.g. `0.19` for 19% VAT). Mixed tax rates are not supported.

## Customizing GA4

- Create a GA4 Config Tag (Google-Tag)
  - If you are already using the Shopify GA4 App, set `send_page_view` to `false` in the paramaters.
  - Set the trigger to `page_view`
- Since the gtm code is sandboxed in an iFrame, create global event data to set the correct page infos: `{{xxx}}` are dataLayer variables.
  - `page_location` -> `{{page_location}}`
  - `page_referrer` -> `{{page_referrer}}`
  - `page_title` -> `{{page_title}}`
- Set up the other GA4 events as you normally would.
  - Check "Send E-Commerce data"
  - Include global event data
  - These events are already sent via the [Shopify App](https://help.shopify.com/en/manual/reports-and-analytics/google-analytics/tracking-ecommerce-events-using-analytics): `page_view`, `search`, `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info`, `purchase`
- You can include user data via `user_data` dataLayer variable, or use them directly:
  - `user_data.email`, `user_data.phone_number`, `user_data.address.first_name`, ...
- `ecommerce.items.0.item_id` uses the Shopify GA4 standard (`"shopify_storeCountryCode_productId_variantId"`)
  - Alternatively you can use `product_id`, `variant_id`, or `sku`
- In the purchase event, there are three values available:
  - `ecommerce.value` - subtotal price: price before duties, shipping, and taxes (only if VAT not included)
  - `ecommerce.value_gross` - total price: sum of all the prices of all the items, including duties, taxes, and discounts
  - `ecommerce.value_net` - subtotal price without taxes (value - taxRate)
