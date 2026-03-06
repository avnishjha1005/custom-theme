# Bookmarks App Proxy

Serverless function for the `/apps/bookmarks` endpoint.

## Deploy to Vercel

1. Create a new Vercel project with this `api/` folder
2. Add environment variables:
   ```
   SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxx
   SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
   ```
3. Deploy: `vercel --prod`
4. Set your App Proxy URL to: `https://your-app.vercel.app/api/bookmarks`

## Get Admin API Token

In your Shopify app (Partners dashboard):
1. Go to **API access**
2. Under **Admin API access tokens**, click **Install app** (if not installed)
3. Copy the access token

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_ADMIN_API_TOKEN` | Yes | Starts with `shpat_` |
| `SHOPIFY_SHOP_DOMAIN` | Yes | e.g., `your-store.myshopify.com` |
| `SHOPIFY_APP_SECRET` | No | For HMAC verification |
