import { Component } from '@theme/component';
import { debounce } from '@theme/utilities';
import { ThemeEvents } from '@theme/events';

const PINCODE_STORAGE_KEY = 'user_delivery_pincode';
const PINCODE_LENGTH = 6;
const SHIPROCKET_API_URL = 'https://apiv2.shiprocket.in/v1/external/courier/serviceability/';

/**
 * @typedef {Object} EstimatedDeliveryRefs
 * @property {HTMLElement} deliveryDate - The delivery date value element
 * @property {HTMLInputElement} pincodeInput - The pincode input field
 * @property {HTMLButtonElement} changeButton - The change button
 * @property {HTMLElement} errorMessage - The error message container
 */

/**
 * Component for displaying estimated delivery dates based on pincode
 * Uses Shiprocket API directly with provided auth token
 * @extends {Component<EstimatedDeliveryRefs>}
 */
class EstimatedDeliveryComponent extends Component {
  requiredRefs = ['deliveryDate', 'pincodeInput', 'changeButton'];

  /** @type {AbortController | null} */
  #activeFetch = null;

  /** @type {AbortController} */
  #eventController = new AbortController();

  /** @type {ReturnType<typeof debounce> | null} */
  #debouncedFetch = null;

  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#eventController;
    const closestSection = this.closest('.shopify-section, dialog, product-card');

    // Listen for variant changes
    closestSection?.addEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate, { signal });

    // Initialize debounced fetch
    this.#debouncedFetch = debounce((pincode) => {
      this.#fetchDeliveryEstimate(pincode);
    }, 500);

    // Set up input listener
    this.refs.pincodeInput.addEventListener('input', this.#onPincodeInput, { signal });

    // Initialize with stored pincode or show placeholder
    this.#initializePincode();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#eventController.abort();
    this.#activeFetch?.abort();
    this.#debouncedFetch?.cancel();
  }

  /**
   * Initialize pincode from localStorage or show placeholder
   */
  #initializePincode() {
    const storedPincode = this.#getStoredPincode();

    if (storedPincode && this.#isValidPincode(storedPincode)) {
      this.refs.pincodeInput.value = storedPincode;
      this.#fetchDeliveryEstimate(storedPincode);
    } else {
      // Show placeholder state
      this.refs.deliveryDate.textContent = '--';
    }
  }

  /**
   * Handle pincode input changes
   * @param {Event} event
   */
  #onPincodeInput = (event) => {
    // Only allow digits
    const pincode = this.refs.pincodeInput.value.replace(/\D/g, '');
    this.refs.pincodeInput.value = pincode;

    this.#hideError();

    if (this.#isValidPincode(pincode)) {
      this.#storePincode(pincode);
      this.#debouncedFetch?.(pincode);
    } else if (pincode.length === PINCODE_LENGTH) {
      // Invalid pincode format
      this.#showError();
    }
  };

  /**
   * Handle keydown events for Enter key (declarative event binding)
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const pincode = this.refs.pincodeInput.value;
      if (this.#isValidPincode(pincode)) {
        this.#debouncedFetch?.cancel();
        this.#storePincode(pincode);
        this.#fetchDeliveryEstimate(pincode);
      } else {
        this.#showError();
      }
    }
  }

  /**
   * Handle change button click (declarative event binding)
   * @param {MouseEvent} event
   */
  handlePincodeChange(event) {
    this.refs.pincodeInput.select();
    this.refs.pincodeInput.focus();
  }

  /**
   * Handle variant updates from variant picker
   * @param {CustomEvent} event
   */
  #onVariantUpdate = (event) => {
    // Update variant ID if needed
    if (event.detail?.resource?.id) {
      this.dataset.variantId = event.detail.resource.id;
    }

    // Refetch delivery estimate when variant changes
    const pincode = this.refs.pincodeInput.value;
    if (this.#isValidPincode(pincode)) {
      this.#fetchDeliveryEstimate(pincode);
    }
  };

  /**
   * Fetch delivery estimate from Shiprocket API
   * @param {string} pincode
   */
  async #fetchDeliveryEstimate(pincode) {
    const token = this.dataset.shiprocketToken;

    if (!token) {
      console.warn('EDD: Shiprocket token not configured');
      this.#showError();
      return;
    }

    this.#activeFetch?.abort();
    this.#activeFetch = new AbortController();

    this.#showLoading();
    this.#hideError();

    const originPincode = this.dataset.originPincode;
    const makingTime = parseInt(this.dataset.makingTime, 10) || 0;

    try {
      // Build URL with query parameters
      const url = new URL(SHIPROCKET_API_URL);
      url.searchParams.set('pickup_postcode', originPincode);
      url.searchParams.set('delivery_postcode', pincode);
      url.searchParams.set('cod', '0');
      url.searchParams.set('weight', '0.5');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: this.#activeFetch.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Calculate EDD = making time + courier estimate
      const courierDays = this.#extractDeliveryDays(data);
      if (courierDays === null) {
        throw new Error('No delivery available');
      }

      const totalDays = courierDays + makingTime;
      const deliveryDate = this.#calculateDeliveryDate(totalDays);

      this.#updateDeliveryDisplay(deliveryDate);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('EDD fetch error:', error);
      this.#showError();
      this.refs.deliveryDate.textContent = '--';
    } finally {
      this.#hideLoading();
    }
  }

  /**
   * Extract delivery days from Shiprocket API response
   * @param {Object} data - API response data
   * @returns {number | null} - Estimated delivery days or null if not available
   */
  #extractDeliveryDays(data) {
    try {
      // Check for courier companies response
      if (data?.data?.available_courier_companies?.length > 0) {
        const courier = data.data.available_courier_companies[0];

        // ETD could be a date string "2024-12-21" or number of days
        if (courier.etd) {
          if (typeof courier.etd === 'string' && courier.etd.includes('-')) {
            const etdDate = new Date(courier.etd);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = etdDate.getTime() - today.getTime();
            return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
          return parseInt(courier.etd, 10) || null;
        }

        // Check for estimated_delivery_days in courier object
        if (courier.estimated_delivery_days) {
          return parseInt(courier.estimated_delivery_days, 10);
        }
      }

      // Check for direct estimated_delivery_days
      if (data?.data?.estimated_delivery_days) {
        return parseInt(data.data.estimated_delivery_days, 10);
      }

      if (data?.estimated_delivery_days) {
        return parseInt(data.estimated_delivery_days, 10);
      }

      // Fallback
      return null;
    } catch (e) {
      console.error('Error parsing delivery days:', e);
      return null;
    }
  }

  /**
   * Calculate delivery date from today + days
   * @param {number} days
   * @returns {string}
   */
  #calculateDeliveryDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);

    // Format: "21st December"
    const day = date.getDate();
    const suffix = this.#getOrdinalSuffix(day);

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
    }).replace(/\d+/, `${day}${suffix}`);
  }

  /**
   * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
   * @param {number} n
   * @returns {string}
   */
  #getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /**
   * Update the delivery date display
   * @param {string} dateString
   */
  #updateDeliveryDisplay(dateString) {
    this.refs.deliveryDate.textContent = dateString;
  }

  // LocalStorage helpers
  #getStoredPincode() {
    try {
      return localStorage.getItem(PINCODE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  #storePincode(pincode) {
    try {
      localStorage.setItem(PINCODE_STORAGE_KEY, pincode);
    } catch {
      // localStorage not available (private browsing, etc.)
    }
  }

  /**
   * Validate pincode format (6-digit Indian pincode)
   * @param {string} pincode
   * @returns {boolean}
   */
  #isValidPincode(pincode) {
    return pincode && pincode.length === PINCODE_LENGTH && /^\d{6}$/.test(pincode);
  }

  // UI state helpers
  #showLoading() {
    this.refs.deliveryDate?.setAttribute('data-loading', 'true');
  }

  #hideLoading() {
    this.refs.deliveryDate?.removeAttribute('data-loading');
  }

  #showError() {
    this.refs.errorMessage?.classList.remove('hidden');
  }

  #hideError() {
    this.refs.errorMessage?.classList.add('hidden');
  }
}

if (!customElements.get('estimated-delivery-component')) {
  customElements.define('estimated-delivery-component', EstimatedDeliveryComponent);
}
