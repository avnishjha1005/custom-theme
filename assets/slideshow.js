import { Component } from '@theme/component';
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

/**
 * Slideshow custom element powered by SwiperJS
 * @extends {Component}
 */
export class Slideshow extends Component {
  static get observedAttributes() {
    return ['initial-slide'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'initial-slide' && oldValue !== newValue && this.swiper) {
      this.swiper.slideTo(parseInt(newValue, 10));
    }
  }

  requiredRefs = ['scroller'];
  swiper = null;

  async connectedCallback() {
    super.connectedCallback();
    this.initSwiper();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.swiper) {
      this.swiper.destroy();
    }
  }

  /**
   * Check if this is a nested slideshow to prevent 
   * event interference or adjust Swiper settings.
   */
  get isNested() {
    return !!this.parentElement?.closest('slideshow-component');
  }

  initSwiper() {
    const { scroller, previous, next, dots } = this.refs;
    
    // Determine autoplay settings
    const autoplayInterval = parseInt(this.getAttribute('autoplay'), 10);
    const autoplayOptions = autoplayInterval 
      ? { delay: autoplayInterval * 1000, disableOnInteraction: true } 
      : false;

    this.swiper = new Swiper(scroller, {
      modules: [Navigation, Pagination, Autoplay],
      
      // Initial Setup
      initialSlide: parseInt(this.getAttribute('initial-slide'), 10) || 0,
      loop: this.hasAttribute('infinite'),
      speed: 400,
      
      // Handle Nested Sliders
      nested: this.isNested,
      
      // Autoplay
      autoplay: autoplayOptions,

      // Navigation Refs
      navigation: {
        nextEl: next || null,
        prevEl: previous || null,
      },

      // Pagination (Dots)
      pagination: {
        el: this.querySelector('[ref="dotsContainer"]') || null, // Assuming a wrapper for dots
        clickable: true,
      },

      // Events
      on: {
        slideChange: () => {
          this.#handleSlideChange();
        },
        init: (s) => {
          // Update initial ARIA and states
          this.#updateAria(s);
        }
      },
      
      // Responsiveness / Logic from old component
      observer: true,
      observeParents: true,
      threshold: 5, // Prevents accidental slides on slight touch
    });
  }

  #handleSlideChange() {
    const index = this.swiper.realIndex;
    const activeSlide = this.swiper.slides[this.swiper.activeIndex];

    // Emit custom event to maintain compatibility with your theme
    this.dispatchEvent(
      new CustomEvent('slideshow:select', {
        detail: {
          index,
          slide: activeSlide,
          id: activeSlide.getAttribute('slide-id'),
        },
      })
    );
    
    // Sync external thumbnails if they exist
    this.#syncThumbnails(index);
  }

  #syncThumbnails(index) {
    if (this.refs.thumbnails) {
      this.refs.thumbnails.forEach((thumb, i) => {
        thumb.setAttribute('aria-selected', i === index);
      });
    }
  }

  #updateAria(s) {
    // Mimic the "auto-hide-controls" logic
    if (this.hasAttribute('auto-hide-controls') && this.refs.slideshowControls) {
      this.refs.slideshowControls.hidden = s.slides.length <= 1;
    }
  }

  // API Methods to keep existing code working
  next() { this.swiper?.slideNext(); }
  previous() { this.swiper?.slidePrev(); }
  pause() { this.swiper?.autoplay.stop(); }
  play() { this.swiper?.autoplay.start(); }
}

if (!customElements.get('slideshow-component')) {
  customElements.define('slideshow-component', Slideshow);
}