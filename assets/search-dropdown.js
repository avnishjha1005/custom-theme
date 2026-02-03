import { Component } from '@theme/component';
import { SearchDropdownOpenEvent, ThemeEvents } from '@theme/events';
import { DialogCloseEvent, DialogOpenEvent } from '@theme/dialog';

/**
 * A custom element that manages a search dropdown panel in the header,
 * matching the mega menu's positioning and animation style.
 *
 * Implements the same interface as DialogComponent (showDialog, closeDialog, toggleDialog)
 * so that predictive-search.js works without modification.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} dropdownPanel - The dropdown panel element.
 *
 * @extends {Component<Refs>}
 */
class SearchDropdownComponent extends Component {
  requiredRefs = ['dropdownPanel'];

  #isOpen = false;
  #abortController = null;

  get isOpen() {
    return this.#isOpen;
  }

  connectedCallback() {
    super.connectedCallback();

    // Close search dropdown when mega menu activates
    document.addEventListener(ThemeEvents.megaMenuHover, this.#handleMegaMenuHover);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(ThemeEvents.megaMenuHover, this.#handleMegaMenuHover);
    this.#abortController?.abort();
  }

  /**
   * Shows the search dropdown.
   * Named showDialog for interface compatibility with DialogComponent.
   */
  showDialog() {
    if (this.#isOpen) return;
    this.#isOpen = true;

    // Tell the mega menu to close
    document.dispatchEvent(new SearchDropdownOpenEvent());

    const { dropdownPanel } = this.refs;
    dropdownPanel.setAttribute('data-open', '');

    // Measure and animate the dropdown height
    requestAnimationFrame(() => {
      const panelHeight = dropdownPanel.scrollHeight;
      this.style.setProperty('--search-dropdown-height', `${panelHeight}px`);
      this.style.setProperty('--search-dropdown-opacity', '1');

      // Focus the search input
      const input = this.querySelector('.search-input');
      if (input instanceof HTMLElement) {
        input.focus();
      }
    });

    // Set up dismiss listeners
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    document.addEventListener('click', this.#handleClickOutside, { signal });
    document.addEventListener('keydown', this.#handleEscape, { signal });

    this.dispatchEvent(new DialogOpenEvent());
  }

  /**
   * Closes the search dropdown.
   * Named closeDialog for interface compatibility with DialogComponent.
   */
  closeDialog = () => {
    if (!this.#isOpen) return;
    this.#isOpen = false;

    this.style.setProperty('--search-dropdown-height', '0px');
    this.style.setProperty('--search-dropdown-opacity', '0');

    this.#abortController?.abort();
    this.#abortController = null;

    // Remove data-open after the clip-path animation completes
    const animationDuration = 200;
    setTimeout(() => {
      if (!this.#isOpen) {
        this.refs.dropdownPanel.removeAttribute('data-open');
      }
    }, animationDuration);

    this.dispatchEvent(new DialogCloseEvent());
  };

  /**
   * Toggles the search dropdown.
   */
  toggleDialog = () => {
    if (this.#isOpen) {
      this.closeDialog();
    } else {
      this.showDialog();
    }
  };

  /**
   * Close search when mega menu hover is detected.
   */
  #handleMegaMenuHover = () => {
    this.closeDialog();
  };

  /**
   * Close search when clicking outside the dropdown.
   * @param {MouseEvent} event
   */
  #handleClickOutside = (event) => {
    if (!(event.target instanceof Element)) return;

    // Don't close if clicking the search button itself (it will toggle)
    if (event.target.closest('search-button')) return;

    if (!this.contains(event.target)) {
      this.closeDialog();
    }
  };

  /**
   * Close search on Escape key press.
   * @param {KeyboardEvent} event
   */
  #handleEscape = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
    }
  };
}

if (!customElements.get('search-dropdown-component')) {
  customElements.define('search-dropdown-component', SearchDropdownComponent);
}
