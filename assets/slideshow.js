import { Component } from '@theme/component';
import {
center,
closest,
clamp,
getVisibleElements,
mediaQueryLarge,
prefersReducedMotion,
preventDefault,
viewTransition,
scheduler,
} from '@theme/utilities';
import { Scroller, scrollIntoView } from '@theme/scrolling';
import { SlideshowSelectEvent } from '@theme/events';

// The threshold for determining visibility of slides.
const SLIDE_VISIBLITY_THRESHOLD = 0.7;

/**
* Slideshow custom element that allows sliding between content.
*
* @typedef {Object} Refs
* @property {HTMLElement} scroller
* @property {HTMLElement} slideshowContainer
* @property {HTMLElement[]} [slides]
* @property {HTMLElement} [current]
* @property {HTMLElement[]} [thumbnails]
* @property {HTMLElement[]} [dots]
* @property {HTMLButtonElement} [previous]
* @property {HTMLButtonElement} [next]
*
* @extends {Component<Refs>}
*/
export class Slideshow extends Component {
static get observedAttributes() {
return ['initial-slide'];
}

/**
  * @param {string} name
  * @param {string} oldValue
  * @param {string} newValue
  */
attributeChangedCallback(name, oldValue, newValue) {
// Collection page filtering will Morph slideshow galleries in place, updating
// the slideshow[initial-slide] and slideshow-slide[hidden] attributes.
// We need to re-select() the slide after the morph is complete, but not before
// slideshow-slide elements have their [hidden] attribute updated.
if (name === 'initial-slide' && oldValue !== newValue) {
queueMicrotask(() => {
// Only select if the component is connected and initialized
if (!this.isConnected || !this.#scroll || !this.refs.slides) return;
const index = parseInt(newValue, 10) || 0;
const slide_id = this.refs.slides[index]?.getAttribute('slide-id');
if (slide_id) {
this.select({ id: slide_id }, undefined, { animate: false });
}
});
}
}

requiredRefs = ['scroller'];

async connectedCallback() {
super.connectedCallback();

// Wait for any in-progress view transitions to finish
if (viewTransition.current) {
await viewTransition.current;
// It's possible that the slideshow was disconnected before the view transition finished
if (!this.isConnected) return;
}

const slideCount = this.slides?.length || 0;
slideCount <= 1 ? this.#setupSlideshowWithoutControls() : this.#setupSlideshow();
}

disconnectedCallback() {
super.disconnectedCallback();

if (this.#scroll) {
const { scroller } = this.refs;
scroller.removeEventListener('mousedown', this.#handleMouseDown);
this.#scroll.destroy();
}

    // Clean up mouse drag event listeners
    document.removeEventListener('mousemove', this.#handleMouseMove);
    document.removeEventListener('mouseup', this.#handleMouseUp);

const slideCount = this.slides?.length || 0;
if (slideCount > 1) {
this.removeEventListener('mouseenter', this.suspend);
@@ -569,6 +573,10 @@
};

#dragging = false;
  #mouseStartX = 0;
  #mouseStartY = 0;
  #scrollStartX = 0;
  #scrollStartY = 0;

/**
  * Handles the 'mousedown' event to start dragging slides.
@@ -597,11 +605,96 @@
if (outerCarousel && outerCarousel !== this) {
// Mark that this event should not propagate to parent slideshow
event.stopImmediatePropagation();
        return;
}
}

    // Only handle left mouse button
    if (event.button !== 0) return;

    // Don't start dragging if clicking on interactive elements
    const target = event.target;
    if (
      target instanceof HTMLAnchorElement ||
      target instanceof HTMLButtonElement ||
      target instanceof HTMLInputElement ||
      target.closest('a, button, input, [role="button"]')
    ) {
      return;
    }

event.preventDefault();
  }
    event.stopPropagation();

    const { scroller } = this.refs;
    if (!scroller) return;

    // Start dragging
    this.#dragging = true;
    this.#mouseStartX = event.clientX;
    this.#mouseStartY = event.clientY;
    this.#scrollStartX = scroller.scrollLeft;
    this.#scrollStartY = scroller.scrollTop;

    this.setAttribute('dragging', '');
    if (this.#scroll) {
      this.#scroll.snap = false;
    }

    // Add event listeners for mouse move and up
    document.addEventListener('mousemove', this.#handleMouseMove);
    document.addEventListener('mouseup', this.#handleMouseUp);
  };

  /**
   * Handles the 'mousemove' event while dragging.
   * @param {MouseEvent} event - The mousemove event.
   */
  #handleMouseMove = (event) => {
    if (!this.#dragging) return;

    const { scroller } = this.refs;
    if (!scroller) return;

    const deltaX = this.#mouseStartX - event.clientX;
    const deltaY = this.#mouseStartY - event.clientY;

    // Determine scroll axis
    const axis = this.#scroll?.axis || 'x';
    const isHorizontal = axis === 'x';

    // Calculate new scroll position
    const newScrollX = this.#scrollStartX + deltaX;
    const newScrollY = this.#scrollStartY + deltaY;

    // Update scroll position
    if (isHorizontal) {
      scroller.scrollLeft = newScrollX;
    } else {
      scroller.scrollTop = newScrollY;
    }

    event.preventDefault();
  };

  /**
   * Handles the 'mouseup' event to stop dragging.
   * @param {MouseEvent} event - The mouseup event.
   */
  #handleMouseUp = (event) => {
    if (!this.#dragging) return;

    this.#dragging = false;
    this.removeAttribute('dragging');
    if (this.#scroll) {
      this.#scroll.snap = true;
    }

    // Remove event listeners
    document.removeEventListener('mousemove', this.#handleMouseMove);
    document.removeEventListener('mouseup', this.#handleMouseUp);
    document.removeEventListener('mouseleave', this.#handleMouseUp);
  };

#handlePointerEnter = () => {
this.setAttribute('actioned', '');