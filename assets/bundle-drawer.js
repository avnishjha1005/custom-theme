/**
 * Bundle Size Drawer - Handles size selection for bundle products
 * Allows users to select sizes for each product in a bundle before adding to cart
 */

class BundleSizeDrawer extends HTMLElement {
  constructor() {
    super();
    this.overlay = null;
    this.closeBtn = null;
    this.confirmBtn = null;
    this.items = [];
    this.isLoading = false;
  }

  connectedCallback() {
    this.overlay = this.querySelector('.bundle-drawer__overlay');
    this.closeBtn = this.querySelector('.bundle-drawer__close');
    this.confirmBtn = this.querySelector('[data-bundle-add-all]');
    this.items = this.querySelectorAll('.bundle-item');

    this.setupEventListeners();
    this.setupSizeSelectors();
  }

  setupEventListeners() {
    // Close on overlay click
    this.overlay?.addEventListener('click', () => this.close());

    // Close button
    this.closeBtn?.addEventListener('click', () => this.close());

    // Confirm button - add all to cart
    this.confirmBtn?.addEventListener('click', () => this.addAllToCart());

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('bundle-size-drawer--active')) {
        this.close();
      }
    });
  }

  setupSizeSelectors() {
    // Handle size selection changes
    this.items.forEach((item) => {
      const sizeInputs = item.querySelectorAll('input[type="radio"]');
      const selectedSizeSpan = item.querySelector('.bundle-item__selected-size');

      sizeInputs.forEach((input) => {
        input.addEventListener('change', (e) => {
          if (selectedSizeSpan) {
            selectedSizeSpan.textContent = e.target.value;
          }
        });
      });
    });
  }

  open() {
    this.classList.add('bundle-size-drawer--active');
    document.body.style.overflow = 'hidden';

    // Focus the first size option for accessibility
    const firstInput = this.querySelector('.bundle-size-option input:not(:disabled)');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  close() {
    this.classList.remove('bundle-size-drawer--active');
    document.body.style.overflow = '';
  }

  getSelectedVariants() {
    const variants = [];

    this.items.forEach((item) => {
      const productId = item.dataset.productId;
      const selectedInput = item.querySelector('input[type="radio"]:checked');

      if (selectedInput) {
        const variantId = selectedInput.dataset.variantId;
        if (variantId) {
          variants.push({
            productId,
            variantId,
            quantity: 1
          });
        }
      }
    });

    return variants;
  }

  validateSelections() {
    let isValid = true;
    const errors = [];

    this.items.forEach((item, index) => {
      const productTitle = item.querySelector('.bundle-item__title')?.textContent || `Item ${index + 1}`;
      const sizeOptions = item.querySelector('.bundle-item__sizes');

      // If the product has size options, check if one is selected
      if (sizeOptions) {
        const selectedInput = item.querySelector('input[type="radio"]:checked');
        if (!selectedInput) {
          isValid = false;
          errors.push(`Please select a size for ${productTitle}`);
          // Highlight the item that needs attention
          item.classList.add('bundle-item--error');
        } else {
          item.classList.remove('bundle-item--error');
        }
      }
    });

    return { isValid, errors };
  }

  setLoading(loading) {
    this.isLoading = loading;

    if (this.confirmBtn) {
      this.confirmBtn.disabled = loading;
      const textSpan = this.confirmBtn.querySelector('.bundle-drawer__confirm-text');
      const loadingSpan = this.confirmBtn.querySelector('.bundle-drawer__confirm-loading');

      if (textSpan && loadingSpan) {
        textSpan.style.display = loading ? 'none' : '';
        loadingSpan.style.display = loading ? 'inline-flex' : 'none';
      }
    }
  }

  async addAllToCart() {
    if (this.isLoading) return;

    const validation = this.validateSelections();
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    const variants = this.getSelectedVariants();
    if (variants.length === 0) {
      console.error('No variants selected');
      return;
    }

    this.setLoading(true);

    try {
      // Prepare items for the cart API
      const items = variants.map((v) => ({
        id: parseInt(v.variantId, 10),
        quantity: v.quantity
      }));

      // Use Shopify's cart add API with multiple items
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ items })
      });

      const result = await response.json();

      if (response.ok) {
        // Successfully added to cart
        this.close();

        // Dispatch cart add event to update cart drawer/icon
        document.dispatchEvent(
          new CustomEvent('cart:add', {
            detail: {
              items: result.items,
              source: 'bundle-drawer'
            },
            bubbles: true
          })
        );

        // Try to open the cart drawer if it exists
        const cartDrawer = document.querySelector('cart-drawer-component');
        if (cartDrawer && typeof cartDrawer.open === 'function') {
          cartDrawer.open();
        } else {
          // Update cart icon count
          this.updateCartCount();
        }
      } else {
        // Handle error
        const errorMessage = result.message || result.description || 'Failed to add items to cart';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();

      // Update cart icon count
      const cartCountElements = document.querySelectorAll('.cart-count-bubble, [data-cart-count]');
      cartCountElements.forEach((el) => {
        el.textContent = cart.item_count;
        el.classList.toggle('hidden', cart.item_count === 0);
      });
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }
}

// Register the custom element
if (!customElements.get('bundle-size-drawer')) {
  customElements.define('bundle-size-drawer', BundleSizeDrawer);
}

// Global function to open bundle drawer (can be called from buy buttons)
window.openBundleSizeDrawer = function () {
  const drawer = document.querySelector('bundle-size-drawer');
  if (drawer) {
    drawer.open();
  }
};
