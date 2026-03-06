/**
 * Bookmarks App Proxy - Serverless Function
 *
 * Deploy this to Vercel, Netlify, or any serverless platform.
 * Configure as an App Proxy in your Shopify app:
 *   - Subpath prefix: /apps/bookmarks
 *   - Proxy URL: https://your-function-url.vercel.app/api/bookmarks
 *
 * Environment variables required:
 *   - SHOPIFY_ADMIN_API_TOKEN: Admin API access token with customer read/write scope
 *   - SHOPIFY_SHOP_DOMAIN: Your shop domain (e.g., your-store.myshopify.com)
 *   - SHOPIFY_APP_SECRET: Your app's secret key (for HMAC verification)
 */

const crypto = require('crypto');

// Verify request is from Shopify using HMAC
function verifyShopifyRequest(query, secret) {
  const { signature, ...params } = query;
  if (!signature) return false;

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('');

  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');

  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

// GraphQL query to get customer metafield
const GET_BOOKMARKS_QUERY = `
  query getCustomerBookmarks($customerId: ID!) {
    customer(id: $customerId) {
      metafield(namespace: "custom", key: "saved_articles") {
        id
        value
      }
    }
  }
`;

// GraphQL mutation to set customer metafield
const SET_BOOKMARKS_MUTATION = `
  mutation setCustomerBookmarks($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function shopifyAdminRequest(query, variables) {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  const response = await fetch(
    `https://${shopDomain}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  return response.json();
}

async function getBookmarks(customerId) {
  const data = await shopifyAdminRequest(GET_BOOKMARKS_QUERY, {
    customerId: `gid://shopify/Customer/${customerId}`,
  });

  const metafieldValue = data?.data?.customer?.metafield?.value;
  if (metafieldValue) {
    try {
      return JSON.parse(metafieldValue);
    } catch (e) {
      console.error('Failed to parse bookmarks:', e);
    }
  }
  return [];
}

async function saveBookmarks(customerId, bookmarks) {
  const data = await shopifyAdminRequest(SET_BOOKMARKS_MUTATION, {
    input: {
      id: `gid://shopify/Customer/${customerId}`,
      metafields: [
        {
          namespace: 'custom',
          key: 'saved_articles',
          value: JSON.stringify(bookmarks),
          type: 'list.single_line_text_field',
        },
      ],
    },
  });

  if (data?.data?.customerUpdate?.userErrors?.length > 0) {
    console.error('Save errors:', data.data.customerUpdate.userErrors);
    return false;
  }

  return !!data?.data?.customerUpdate?.customer;
}

// Main handler - works with Vercel, Netlify, etc.
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify request is from Shopify (optional but recommended)
  const appSecret = process.env.SHOPIFY_APP_SECRET;
  if (appSecret && !verifyShopifyRequest(req.query, appSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get customer ID from Shopify's logged_in_customer_id parameter
  const customerId = req.query.logged_in_customer_id;

  if (!customerId) {
    return res.status(401).json({ error: 'Not logged in', bookmarks: [] });
  }

  try {
    if (req.method === 'GET') {
      // Fetch bookmarks
      const bookmarks = await getBookmarks(customerId);
      return res.status(200).json({ bookmarks, success: true });
    }

    if (req.method === 'POST') {
      // Save bookmarks
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      const bookmarks = body.bookmarks || [];
      const success = await saveBookmarks(customerId, bookmarks);
      return res.status(200).json({ success, bookmarks });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Export for different serverless platforms
module.exports.handler = module.exports; // AWS Lambda
module.exports.default = module.exports; // Vercel
