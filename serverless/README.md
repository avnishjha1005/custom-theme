# Bookmarks App Proxy Setup

This serverless function handles bookmarks storage in customer metafields using Shopify's Admin API.

## Setup Steps

### 1. Create a Shopify App

1. Go to your Shopify Partners dashboard or Admin > Settings > Apps > Develop apps
2. Create a new app (or use an existing one)
3. Configure Admin API scopes:
   - `read_customers`
   - `write_customers`
4. Install the app on your store
5. Copy the **Admin API access token**

### 2. Deploy the Serverless Function

#### Option A: Vercel

1. Create a new Vercel project
2. Copy `api/bookmarks.js` to your project's `api/` folder
3. Add environment variables in Vercel dashboard:
   ```
   SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxx
   SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
   SHOPIFY_APP_SECRET=your-app-secret (optional)
   ```
4. Deploy: `vercel --prod`
5. Note your deployment URL (e.g., `https://your-app.vercel.app`)

#### Option B: Netlify

1. Create `netlify/functions/bookmarks.js` with the code from `bookmarks-proxy.js`
2. Add environment variables in Netlify dashboard
3. Deploy

### 3. Configure App Proxy in Shopify

1. Go to your app settings in Shopify Partners
2. Navigate to **App proxy**
3. Configure:
   - **Subpath prefix**: `apps`
   - **Subpath**: `bookmarks`
   - **Proxy URL**: `https://your-vercel-app.vercel.app/api/bookmarks`
4. Save

### 4. Test

Visit your store while logged in and try bookmarking an article. Check the browser console for any errors.

## How It Works

1. When a logged-in customer visits `/apps/bookmarks`, Shopify proxies the request to your serverless function
2. Shopify automatically appends `logged_in_customer_id` to the request
3. The function uses Admin API to read/write the customer's `custom.saved_articles` metafield
4. The response is returned to the browser

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_ADMIN_API_TOKEN` | Admin API access token (starts with `shpat_`) |
| `SHOPIFY_SHOP_DOMAIN` | Your myshopify.com domain |
| `SHOPIFY_APP_SECRET` | App secret for HMAC verification (optional but recommended) |

## Metafield Structure

Bookmarks are stored in:
- **Namespace**: `custom`
- **Key**: `saved_articles`
- **Type**: `list.single_line_text_field`
- **Value**: JSON array of article handles, e.g., `["article-1", "article-2"]`
