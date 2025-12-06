# Mobile Tab Bar Integration Examples

## Integration Method 1: Add to Layout File (Recommended)

Edit your `layout/theme.liquid` and add the mobile tab bar snippet near the end, before the closing `</body>` tag:

```liquid
<!-- Inside layout/theme.liquid -->
<!DOCTYPE html>
<html lang="{{ request.locale.iso_code }}">
  <head>
    {%- render 'stylesheets' -%}
    {%- render 'scripts' -%}
  </head>
  <body>
    <!-- Your existing header and content -->
    {% section 'header-group' %}
    
    <!-- Main content goes here -->
    
    <!-- Add mobile tab bar before closing body -->
    {% render 'mobile-tab-bar' %}
    
    <!-- Alternative: Icon version -->
    {%- comment -%} {% render 'mobile-tab-bar-icons' %} {%- endcomment -%}
    
    <!-- Scripts -->
    {{ 'mobile-tab-bar.js' | asset_url | script_tag }}
  </body>
</html>
```

## Integration Method 2: Add to Header Section

Edit your `sections/header.liquid` and add at the end:

```liquid
<!-- At the end of sections/header.liquid -->
{% render 'mobile-tab-bar' %}
{{ 'mobile-tab-bar.js' | asset_url | script_tag }}
```

## Integration Method 3: Create Header Group with Tab Bar

Create a new section `sections/header-mobile-group.liquid`:

```liquid
{% sections 'header-group' %}

<!-- Mobile tab bar only shows on mobile -->
{% render 'mobile-tab-bar' %}

{{ 'mobile-tab-bar.js' | asset_url | script_tag }}
```

## Integration Method 4: Conditional Rendering

Add to your template with device detection:

```liquid
{% if request.design_mode %}
  {%- comment -%}
    In theme editor, always show for preview
  {%- endcomment -%}
  {% render 'mobile-tab-bar' %}
{% else %}
  {%- comment -%}
    In live store, show mobile tab bar
  {%- endcomment -%}
  {% render 'mobile-tab-bar' %}
{% endif %}

{{ 'mobile-tab-bar.js' | asset_url | script_tag }}
```

## Complete Example: Header Section Update

Here's how to modify your header section to support the mobile tab bar:

```liquid
{%- comment -%}
  In sections/header.liquid, after the main header component
{%- endcomment -%}

<!-- Existing header content -->
<header-root class="header-wrapper">
  <!-- Your existing header markup -->
</header-root>

<!-- Add mobile tab bar navigation -->
<nav class="header-mobile-nav">
  {% render 'mobile-tab-bar' %}
</nav>

<!-- Load JavaScript -->
{{ 'mobile-tab-bar.js' | asset_url | script_tag }}
```

## Customization Examples

### Example 1: Limited Menu Items

Only show first 5 menu items on mobile:

```liquid
{%- capture mobile_menu -%}
  {% for link in section.settings.menu.links limit: 5 %}
    <a href="{{ link.url }}" class="mobile-tab-bar__item{% if link.active %} mobile-tab-bar__item--active{% endif %}">
      {{ link.title }}
    </a>
  {% endfor %}
{%- endcapture -%}

{% render 'mobile-tab-bar', custom_menu: mobile_menu %}
```

### Example 2: Custom Menu for Mobile

Create a separate mobile-specific menu:

```liquid
{%- comment -%}
  In your theme.json or section settings, add:
  {
    "type": "link_list",
    "id": "mobile_menu",
    "label": "Mobile Menu"
  }
{%- endcomment -%}

{% assign mobile_links = section.settings.mobile_menu.links %}

<nav class="mobile-tab-bar">
  <div class="mobile-tab-bar__container">
    {% for link in mobile_links %}
      <a 
        href="{{ link.url }}" 
        class="mobile-tab-bar__item{% if link.active %} mobile-tab-bar__item--active{% endif %}"
      >
        <span class="mobile-tab-bar__link-text">{{ link.title }}</span>
      </a>
    {% endfor %}
  </div>
</nav>
```

### Example 3: With Home and Cart Links

Add fixed home and cart links:

```liquid
<nav class="mobile-tab-bar">
  <div class="mobile-tab-bar__container">
    <!-- Home link -->
    <a href="/" class="mobile-tab-bar__item" title="Home">
      <span class="mobile-tab-bar__link-text">Home</span>
    </a>
    
    <!-- Menu items -->
    {% for link in section.settings.menu.links limit: 3 %}
      <a 
        href="{{ link.url }}" 
        class="mobile-tab-bar__item{% if link.active %} mobile-tab-bar__item--active{% endif %}"
      >
        <span class="mobile-tab-bar__link-text">{{ link.title }}</span>
      </a>
    {% endfor %}
    
    <!-- Cart link -->
    <a href="/cart" class="mobile-tab-bar__item" title="Cart">
      <span class="mobile-tab-bar__link-text">Cart</span>
    </a>
  </div>
</nav>
```

## CSS Customization

### Change Colors

Add to your theme's custom CSS:

```css
/* Change inactive text color */
.mobile-tab-bar__item {
  color: #333;
}

/* Change active state color and border */
.mobile-tab-bar__item--active {
  color: #1a73e8;
  border-bottom-color: #1a73e8;
}

/* Change background color */
.mobile-tab-bar {
  background-color: #f9f9f9;
}
```

### Change Height

```css
@media screen and (max-width: 749px) {
  .mobile-tab-bar__container {
    min-height: 64px; /* Increase from 56px */
  }
  
  body {
    padding-bottom: 68px;
  }
}
```

### Use Variant Styles

Add variant classes to the mobile tab bar:

```liquid
<!-- Solid background -->
<nav class="mobile-tab-bar mobile-tab-bar--solid">

<!-- Translucent with blur -->
<nav class="mobile-tab-bar mobile-tab-bar--translucent">

<!-- Minimal (no border/shadow) -->
<nav class="mobile-tab-bar mobile-tab-bar--minimal">

<!-- Elevated shadow -->
<nav class="mobile-tab-bar mobile-tab-bar--elevated">

<!-- Compact height -->
<nav class="mobile-tab-bar mobile-tab-bar--compact">

<!-- Spacious height -->
<nav class="mobile-tab-bar mobile-tab-bar--spacious">

<!-- With animation -->
<nav class="mobile-tab-bar mobile-tab-bar--animate-in">
```

## Testing Checklist

- [ ] Mobile tab bar appears on devices < 750px width
- [ ] Mobile tab bar hidden on tablets and desktop
- [ ] Active state shows correctly on current page
- [ ] Navigation links work properly
- [ ] Tab bar doesn't hide page content
- [ ] Safe area padding works on iPhone X+ (test on actual device)
- [ ] Responsive to orientation changes
- [ ] Keyboard navigation works
- [ ] Touch targets are at least 44x44px
- [ ] Styling matches your brand

## Troubleshooting

### Tab bar not showing
1. Check file exists: `snippets/mobile-tab-bar.liquid`
2. Verify it's being rendered in your layout
3. Check browser DevTools for CSS issues
4. Verify media query breakpoint (750px) is correct

### Content hidden behind tab bar
1. Verify body has `padding-bottom: 60px` applied
2. Check if custom CSS is overriding it
3. Ensure JavaScript loaded successfully

### Styling issues
1. Check CSS file loaded: `assets/mobile-tab-bar.js`
2. Verify theme variables are defined
3. Check for CSS conflicts with other stylesheets
4. Use browser DevTools to inspect computed styles

### JavaScript errors
1. Open browser console (F12)
2. Look for red errors in console
3. Verify `mobile-tab-bar.js` is loaded
4. Check for conflicts with other scripts
