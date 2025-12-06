# Mobile Tab Bar Navigation - Implementation Guide

## Overview

The Mobile Tab Bar Navigation is a modern, mobile-first navigation pattern inspired by apps like Loewe. It provides a sticky bottom navigation bar that appears only on mobile devices, with the desktop header navigation remaining unchanged.

### Features

- **Responsive Design**: Desktop/Tablet shows regular top navigation, Mobile shows bottom tab bar
- **Sticky Positioning**: Anchored at the bottom of the screen on mobile devices
- **Safe Area Support**: Compatible with notched devices (iPhone X+, Android notches)
- **Active State Indicator**: Visual indicator for the current page
- **Smooth Transitions**: CSS animations for better UX
- **Touch-Friendly**: Optimized tap targets and touch feedback
- **Icon Support**: Optional icon variant with SVG icons

## Files Created

### 1. **snippets/mobile-tab-bar.liquid**
- Basic mobile tab bar without icons
- Minimal, text-only navigation
- Best for sites with short menu labels

### 2. **snippets/mobile-tab-bar-icons.liquid**
- Enhanced version with icon support
- Icons displayed above text
- Better for e-commerce and app-like experiences

### 3. **assets/mobile-tab-bar.js**
- JavaScript controller for enhanced functionality
- Handles safe area adjustments
- Manages active state updates
- Ensures proper padding on page content

## Implementation

### Step 1: Include the Snippet in Your Layout

Add one of these lines to your `layout/theme.liquid` or appropriate layout file, right before the closing `</body>` tag:

```liquid
{% render 'mobile-tab-bar' %}
```

Or for the icon version:

```liquid
{% render 'mobile-tab-bar-icons' %}
```

### Step 2: Include the JavaScript File

Add this to your `layout/theme.liquid` in the `<head>` section or before closing `</body>`:

```liquid
{{ 'mobile-tab-bar.js' | asset_url | script_tag }}
```

### Step 3: Configure Menu

The mobile tab bar uses the same menu configured in your header section. It automatically pulls from `section.settings.menu`.

**Note**: Make sure your header section has a menu configured in the theme settings.

## Customization

### CSS Variables

The mobile tab bar uses your theme's existing CSS variables:

- `--color-background`: Background color
- `--color-foreground`: Text color
- `--color-button`: Active state color
- `--color-foreground-rgb`: For rgba color mixing

### Styling Options

You can override styles by adding custom CSS:

```css
/* Change tab bar height */
@media screen and (max-width: 749px) {
  .mobile-tab-bar__container {
    min-height: 64px;
  }
}

/* Customize active state color */
.mobile-tab-bar__item--active {
  color: #your-color;
  border-bottom-color: #your-color;
}

/* Add background color */
.mobile-tab-bar {
  background-color: #f5f5f5;
}
```

### Limiting Menu Items

If you have many menu items, consider limiting them in the menu configuration:

```liquid
{% for link in menu.links limit: 5 %}
  {# Items here #}
{% endfor %}
```

## Responsive Breakpoints

- **Mobile** (< 750px): Shows bottom tab bar
- **Tablet** (≥ 750px): Hides tab bar, uses desktop header
- **Desktop** (≥ 990px): Full desktop navigation

## Browser Support

- iOS Safari 11+
- Chrome Mobile
- Firefox Mobile
- Samsung Internet
- All modern Android browsers

### Special Cases

**Safe Area Inset (Notched Devices)**:
- Automatically adjusts for iPhone X, iPhone 11 Pro, etc.
- Uses `env(safe-area-inset-bottom)` for proper notch spacing

## Accessibility Features

- Semantic HTML (`<nav>`, `<a>` tags)
- ARIA labels and current page indicators
- Keyboard navigation support
- High contrast support
- Touch target size: 44x44px minimum

## Performance Considerations

- Lightweight: ~3KB (minified JS + CSS combined)
- No external dependencies
- CSS-first approach for minimal JavaScript
- Hardware-accelerated transitions
- Efficient resize event handling (debounced)

## Troubleshooting

### Tab bar not appearing on mobile
1. Verify the snippet is being rendered
2. Check that CSS media query breakpoint (750px) matches your theme
3. Ensure JavaScript file is loaded: check browser console for errors

### Content being hidden
- The body gets `padding-bottom` automatically applied
- If using custom layout, ensure padding is applied to main content area

### Safe area not working
- Only applies on devices with notches
- Test on actual device or simulator
- Check iOS version (11+) or Android version

### Active state not updating
1. Check menu links have correct `href` attributes
2. Verify `window.location.pathname` matches link URLs
3. Check browser console for JavaScript errors

## Advanced Usage

### Programmatic Active State

The `MobileTabBar` class can be accessed and controlled:

```javascript
// Get instance reference
const mobileTabBar = window.mobileTabBar || new MobileTabBar();

// Manually update active state
mobileTabBar.updateActiveState();

// Force safe area adjustment
mobileTabBar.adjustForSafeArea();
```

### Event Handling

Listen for navigation events:

```javascript
const tabBar = document.querySelector('.mobile-tab-bar');
const items = tabBar.querySelectorAll('.mobile-tab-bar__item');

items.forEach(item => {
  item.addEventListener('click', (e) => {
    console.log('Navigating to:', item.getAttribute('href'));
  });
});
```

## Design Inspiration

This implementation is inspired by:
- **Loewe** (loewe.com): Minimalist bottom navigation
- **Shopify Mobile**: Clean tab bar design
- **Apple iOS**: Native safe area handling
- **Material Design**: Touch-friendly spacing

## SEO Considerations

- Navigation remains semantic and crawlable
- All links are direct anchor tags (not JavaScript-only)
- No impact on SEO from JavaScript enhancements

## Future Enhancements

Potential additions:
- Badge support (notification counts)
- Animation variants
- Customizable colors per item
- Icon-only mode
- Slide animation options
- Swipe navigation support

## Support

For issues or questions:
1. Check browser console for errors
2. Verify files are in correct locations
3. Ensure menu is configured in theme settings
4. Test on actual mobile device (not just browser DevTools)
