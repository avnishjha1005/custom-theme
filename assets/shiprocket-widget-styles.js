/**
 * Shiprocket Smart EDD Widget Style Injector
 * Injects custom styles into the Shiprocket widget when it loads
 */

const SHIPROCKET_WIDGET_STYLES = `
  .sr-delivery-widget {
    max-width: unset !important;
    box-shadow: unset !important;
  }
  .sr-title {
    font-family: unset !important;
  }
  .sr-pincode-input {
    font-family: unset !important;
  }
  .sr-delivery-container {
    padding: 0px !important;
    border-radius: 0px !important;
    border: 1px solid #D8d1c6 !important;
  }
`;

/**
 * Inject styles into the widget
 * @param {Element} container - The container element to inject styles into
 */
function injectStyles(container) {
  // Check if styles already injected
  if (container.querySelector('#custom-sr-styles')) {
    return;
  }

  const styleTag = document.createElement('style');
  styleTag.id = 'custom-sr-styles';
  styleTag.textContent = SHIPROCKET_WIDGET_STYLES;

  // Try to inject into shadow root if it exists
  if (container.shadowRoot) {
    container.shadowRoot.appendChild(styleTag);
    console.log('[Shiprocket] Styles injected into shadow DOM');
  } else {
    container.appendChild(styleTag);
    console.log('[Shiprocket] Styles injected into container');
  }
}

/**
 * Search for the Shiprocket widget and inject styles
 */
function initShiprocketStyling() {
  // Common selectors for Shiprocket widgets
  const selectors = [
    '.sr-delivery-widget',
    '.sr-delivery-container',
    '[class*="shiprocket"]',
    '[id*="shiprocket"]',
    'shiprocket-smart-edd', // Web component name (if any)
  ];

  // Try to find the widget
  for (const selector of selectors) {
    const widgets = document.querySelectorAll(selector);

    widgets.forEach(widget => {
      // Find the root container
      let container = widget;
      while (container.parentElement && !container.shadowRoot) {
        container = container.parentElement;
        if (container.tagName.toLowerCase().includes('shiprocket')) {
          break;
        }
      }

      injectStyles(container);

      // Also inject at widget level
      if (widget !== container) {
        injectStyles(widget);
      }
    });

    if (widgets.length > 0) {
      console.log(`[Shiprocket] Found ${widgets.length} widget(s) with selector: ${selector}`);
    }
  }
}

// Run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShiprocketStyling);
} else {
  initShiprocketStyling();
}

// Watch for dynamically added widgets using MutationObserver
const observer = new MutationObserver((mutations) => {
  let shouldReinject = false;

  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        const className = node.className || '';
        const id = node.id || '';

        // Check if the added node or its children contain Shiprocket widget
        if (
          className.includes('sr-') ||
          className.includes('shiprocket') ||
          id.includes('shiprocket') ||
          node.querySelector?.('[class*="sr-"]') ||
          node.querySelector?.('[class*="shiprocket"]')
        ) {
          shouldReinject = true;
        }
      }
    });
  });

  if (shouldReinject) {
    console.log('[Shiprocket] Widget detected, re-injecting styles');
    // Wait a bit for the widget to fully render
    setTimeout(initShiprocketStyling, 100);
    setTimeout(initShiprocketStyling, 500);
    setTimeout(initShiprocketStyling, 1000);
  }
});

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log('[Shiprocket] Style injector initialized');
