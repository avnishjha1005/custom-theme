import { Component } from '@theme/component';
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
      
      // Initial Setup
      initialSlide: parseInt(this.getAttribute('initial-slide'), 10) || 0,
      loop: this.hasAttribute('infinite'),
      speed: 400,
      
      // Handle Nested Sliders
      nested: this.isNested,
      
      // Autoplay
      autoplay: autoplayOptions,
      //draggable
      allowTouchMove : true,

      // Navigation Refs
      navigation: {
        nextEl: this.refs.next?.[0] || this.refs.next || null,
        prevEl: this.refs.previous?.[0] || this.refs.previous || null,
      },

      // Events
      on: {
        slideChange: () => {
          if (!this.swiper) return;
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
  if (!this.swiper) return;
  const index = this.swiper.realIndex ?? this.swiper.activeIndex ?? 0;
  const activeSlide = this.swiper.slides?.[this.swiper.activeIndex];
  if (!activeSlide) return;

  this.dispatchEvent(
    new CustomEvent('slideshow:select', {
      detail: {
        index,
        slide: activeSlide,
        id: activeSlide.getAttribute('slide-id'),
      },
    })
  );

  this.#syncThumbnails(index);
}

  #syncThumbnails(index) {
  // Fallback: If this.refs.thumbnails is empty, query the DOM manually within the component
  const dots = this.refs.thumbnails || this.querySelectorAll('.dot-indicator');
  
  if (dots) {
    dots.forEach((thumb, i) => {
      // Use index0 comparison
      const isSelected = i === index;
      thumb.setAttribute('aria-selected', isSelected);
      
      // Also toggle a class for styling if aria-selected isn't enough for your CSS
      thumb.classList.toggle('is-active', isSelected);
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
  select(index, event = null) {
  if (event) event.preventDefault();
  const targetIndex = typeof index === 'string' ? parseInt(index, 10) : index;
  
  if (this.swiper) {
    // If infinite loop is on, use slideToLoop to handle virtual indexes
    this.hasAttribute('infinite') 
      ? this.swiper.slideToLoop(targetIndex) 
      : this.swiper.slideTo(targetIndex);
  }
}
}

if (!customElements.get('slideshow-component')) {
  customElements.define('slideshow-component', Slideshow);
}