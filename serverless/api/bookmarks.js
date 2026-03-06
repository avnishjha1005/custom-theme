/**
 * Bookmarks App Proxy - Vercel Serverless Function
 *
 * Deploy to Vercel and configure App Proxy in Shopify:
 *   - Subpath prefix: /apps/bookmarks
 *   - Proxy URL: https://your-vercel-app.vercel.app/api/bookmarks
 *
 * Environment variables (set in Vercel dashboard):
 *   - SHOPIFY_ADMIN_API_TOKEN
 *   - SHOPIFY_SHOP_DOMAIN
 *   - SHOPIFY_APP_SECRET (optional, for HMAC verification)
 */

import crypto from 'crypto';

function verifyShopifyRequest(query, secret) {
  if (!secret) return true;
  const { signature, ...params } = query;
  if (!signature) return false;

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('');

  const calculated = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');

  try {
    return crypto.timingSafeEquals(Buffer.from(signature), Buffer.from(calculated));
  } catch {
    return false;
  }
}

async function adminGraphQL(query, variables) {
  const res = await fetch(
    `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  return res.json();
}

async function getBookmarks(customerId) {
  const { data } = await adminGraphQL(
    `query($id: ID!) {
      customer(id: $id) {
        metafield(namespace: "custom", key: "saved_articles") { value }
      }
    }`,
    { id: `gid://shopify/Customer/${customerId}` }
  );
  try {
    return JSON.parse(data?.customer?.metafield?.value || '[]');
  } catch {
    return [];
  }
}

async function saveBookmarks(customerId, bookmarks) {
  const result = await adminGraphQL(
    `mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message code }
      }
    }`,
    {
      metafields: [{
        ownerId: `gid://shopify/Customer/${customerId}`,
        namespace: 'custom',
        key: 'saved_articles',
        value: JSON.stringify(bookmarks),
        type: 'json',
      }],
    }
  );
  console.log('GraphQL result:', JSON.stringify(result, null, 2));
  const errors = result.data?.metafieldsSet?.userErrors;
  if (errors?.length) {
    console.error('Metafield save errors:', errors);
    return { success: false, errors };
  }
  return { success: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify Shopify signature (optional)
  if (process.env.SHOPIFY_APP_SECRET) {
    if (!verifyShopifyRequest(req.query, process.env.SHOPIFY_APP_SECRET)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const customerId = req.query.logged_in_customer_id;
  if (!customerId) {
    return res.status(401).json({ error: 'Not logged in', bookmarks: [] });
  }

  try {
    if (req.method === 'GET') {
      const bookmarks = await getBookmarks(customerId);
      return res.json({ bookmarks, success: true });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const result = await saveBookmarks(customerId, body.bookmarks || []);
      return res.json({
        success: result.success,
        bookmarks: body.bookmarks,
        errors: result.errors || null
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
