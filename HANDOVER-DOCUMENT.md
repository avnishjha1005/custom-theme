# Store Customization Handover Document

This document outlines all the custom features added to your Shopify store theme. It's designed to help you (or your team) understand, maintain, and modify these features.

---

## Table of Contents

1. [WhatsApp Chat Button](#1-whatsapp-chat-button)
2. [Mobile Navigation Bar](#2-mobile-navigation-bar)
3. [Article Bookmarks System](#3-article-bookmarks-system)
4. [Wishlist Feature](#4-wishlist-feature)
5. [Product Bundles](#5-product-bundles)
6. [Promotional Popups](#6-promotional-popups)
7. [Sticky Information Bar](#7-sticky-information-bar)
8. [Expert/Team Section](#8-expertteam-section)
9. [Flexi Layout System](#9-flexi-layout-system)
10. [Social Sharing](#10-social-sharing)
11. [Important Settings & Configuration](#11-important-settings--configuration)

---

## 1. WhatsApp Chat Button

### What It Does
A floating WhatsApp button appears in the bottom-right corner of your store. When customers tap it, they can instantly message you on WhatsApp with a pre-filled message.

### How to Customize

**Change the phone number or message:**
1. Go to **Online Store → Themes → Customize**
2. Click **Theme Settings** (gear icon at bottom left)
3. Find the **WhatsApp** section
4. Update:
   - **Phone Number**: Your WhatsApp business number (include country code, e.g., 919972320665)
   - **Default Message**: The pre-filled message customers see
   - **Price Request Message**: Special message for price inquiries (use `{product_title}` to include the product name)

### Adding WhatsApp to Specific Pages
1. In the Theme Customizer, navigate to the page where you want the button
2. Click **Add Section**
3. Search for "WhatsApp FAB"
4. Position and style as needed

---

## 2. Mobile Navigation Bar

### What It Does
A sticky navigation bar at the bottom of the screen on mobile devices. It provides quick access to key areas: Home, Search, Categories, and Account.

### How to Customize

**Change navigation items:**
1. Go to **Online Store → Navigation**
2. Edit the menu assigned to the mobile tab bar
3. Add, remove, or reorder items

**Change icons:**
Each menu item can have a custom icon. To set an icon:
1. Go to **Online Store → Navigation**
2. Edit the menu item
3. In the **Icon** metafield, enter one of these values:
   - `home` - House icon
   - `search` - Magnifying glass
   - `categories` - Grid icon
   - `account` - Person icon
   - `cart` - Shopping bag
   - `wishlist` - Heart icon

**Enable/disable the tab bar:**
1. Go to **Online Store → Themes → Customize**
2. Select the Mobile Tab Bar section
3. Use the visibility settings to show/hide on specific pages

---

## 3. Article Bookmarks System

### What It Does
Allows logged-in customers to save blog articles for later reading. Their bookmarks sync across all their devices.

### How It Works
- Customers click the bookmark icon on any article
- If not logged in, they're prompted to log in
- Bookmarks are stored in their customer account
- They can view all bookmarks on the dedicated Bookmarks page (`/pages/bookmarks`)

### Managing the Bookmarks Page
1. Go to **Online Store → Pages**
2. Find the "Bookmarks" page
3. Ensure it uses the **page.bookmarks** template

### Important Technical Note
This feature requires a backend service (Vercel App Proxy) to work. If bookmarks stop working:
- Check that the Storefront API token is still valid in Theme Settings
- Contact your developer to verify the app proxy is running

---

## 4. Wishlist Feature

### What It Does
Customers can save products they're interested in by clicking a heart icon. Their wishlist persists even after leaving the site.

### How to Customize

**Enable/disable wishlist:**
1. Go to **Theme Settings**
2. Find the **Wishlist** section
3. Toggle **Enable Wishlist**

**Show/hide floating wishlist button:**
1. In the same Wishlist settings
2. Toggle **Show Floating Button**
3. Choose button position (bottom-left, bottom-right, etc.)

### Viewing Wishlists
Customers access their wishlist via:
- The heart icon in the header
- The floating wishlist button (if enabled)
- Direct link: `/pages/wishlist`

---

## 5. Product Bundles

### What It Does
Displays product bundles in an attractive 2-column grid with hover effects. Useful for showcasing product sets or collections.

### Adding a Bundle Section
1. In Theme Customizer, click **Add Section**
2. Search for "Bundle List"
3. Configure:
   - Select which products to display
   - Customize colors and spacing
   - Add overlay effects

### Bundle Size Selector
For products with size variants, a drawer appears allowing customers to select their size before adding to cart.

---

## 6. Promotional Popups

### What It Does
Display promotional messages, discount codes, or announcements in a popup overlay. Multiple styles available.

### Types of Popups
- **Promo Popup Split**: Two-column layout with image and text
- **Promo Popup Text**: Text-focused popup
- **Sticky Promo Popup**: Stays visible while scrolling

### How to Customize
1. Go to Theme Customizer
2. Click **Add Section**
3. Choose your popup type
4. Configure:
   - Headline and message text
   - Button text and link
   - When to show (page load, scroll, exit intent)
   - Background colors and images

---

## 7. Sticky Information Bar

### What It Does
A fixed bar at the bottom of the screen displaying important information (shipping notices, promotions, etc.).

### How to Customize
1. In Theme Customizer, find the "Sticky Info Bar" section
2. Configure:
   - **Left Text**: Main message
   - **Right Text**: Secondary info or CTA
   - **Button**: Action button with link
   - **Colors**: Background and text colors
   - **Show/Hide Toggle**: Allow users to collapse the bar

---

## 8. Expert/Team Section

### What It Does
A "Meet the Experts" or team showcase section with custom styling for highlighting team members or advisors.

### How to Add
1. In Theme Customizer, click **Add Section**
2. Search for "Expert Collage"
3. Configure:
   - Heading and subheading
   - Team member images
   - Bio text
   - Link to team page or profiles

---

## 9. Flexi Layout System

### What It Does
A powerful, flexible layout system that lets you build custom page layouts without code. Think of it as building blocks you can arrange in any way.

### Available Blocks
- **Headings & Text**: Various sizes and styles
- **Images**: With effects like parallax, overlays
- **Buttons**: Multiple styles (solid, outline, etc.)
- **Accordions**: Expandable FAQ-style content
- **Tabs**: Tabbed content sections
- **Icons & Logos**: Display brand logos or icons
- **Dividers**: Visual separators
- **Reviews**: Customer testimonials

### How to Use
1. In Theme Customizer, add a "Flexi Layout" section
2. Click to add blocks within the section
3. Arrange blocks by dragging
4. Each block has its own settings for:
   - Spacing (padding, margins)
   - Colors
   - Alignment
   - Mobile/desktop visibility

### Tips
- Use "Flexi Group" blocks to create columns
- Combine multiple blocks for complex layouts
- Preview on mobile to ensure responsive design

---

## 10. Social Sharing

### What It Does
Allows customers to share products and articles via social media, email, or copy the link.

### Available Sharing Options
- Copy link to clipboard
- Email
- Facebook
- Twitter/X
- WhatsApp
- Pinterest

### How to Customize
1. Navigate to the product or article template
2. Find the "Social Share" block
3. Enable/disable specific platforms
4. Choose icon style (filled, outline)

---

## 11. Important Settings & Configuration

### Theme Settings Location
All custom settings are in **Online Store → Themes → Customize → Theme Settings** (gear icon).

### Key Settings to Remember

| Setting | Location | Purpose |
|---------|----------|---------|
| WhatsApp Number | Theme Settings → WhatsApp | Your business WhatsApp number |
| Wishlist Toggle | Theme Settings → Wishlist | Enable/disable wishlist feature |
| Storefront API Token | Theme Settings → Article Bookmarks | Required for bookmarks to work |

### Pages You've Created

| Page | URL | Template | Purpose |
|------|-----|----------|---------|
| Bookmarks | /pages/bookmarks | page.bookmarks | Customer's saved articles |
| Wishlist | /pages/wishlist | page.wishlist | Customer's saved products |

---

## Maintenance Tips

### If Something Stops Working

1. **Clear browser cache** - Many issues are cached old versions
2. **Check Theme Settings** - Ensure features are still enabled
3. **Preview in Customizer** - Test changes before publishing
4. **Check mobile view** - Some features are mobile-only

### Before Making Changes

1. **Duplicate your theme** - Always keep a backup
2. **Document changes** - Note what you modified
3. **Test thoroughly** - Check desktop, tablet, and mobile

### Getting Help

If you need developer assistance:
- The bookmark system uses a Vercel backend service
- Custom CSS is in the `/assets` folder
- Custom JavaScript is in the `/assets` folder
- Section files are in the `/sections` folder

---

## Quick Reference: Section Names

When looking for sections in the Theme Customizer:

| Feature | Section Name |
|---------|-------------|
| WhatsApp Button | WhatsApp FAB |
| Mobile Navigation | Mobile Tab Bar |
| Bookmarks Page | Bookmarks List |
| Product Bundles | Bundle List |
| Promotions | Promo Popup Split, Promo Popup Text, Sticky Promo Popup |
| Information Bar | Sticky Info Bar |
| Team Section | Expert Collage |
| Flexible Layouts | Flexi Layout |

---

## Support Contacts

For technical support regarding these customizations, please contact:

**Developer**: [Add developer contact info]
**Agency**: [Add agency info if applicable]
**Emergency Contact**: [Add emergency contact]

---

*Document created: March 2026*
*Last updated: March 2026*
