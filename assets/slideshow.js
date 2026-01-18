import { Component } from '@theme/component';
import {
  center,
  closest,
  clamp,
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
  static #id = 0;
  #debugId = ++Slideshow.#id;
  static get observedAttributes() {
    return ['initial-slide'];
  }
  #log(...args) {
  console.log(`[Slideshow ${this.#debugId}]`, ...args);
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
      scroller.removeEventListener('pointerdown', this.#handleMouseDown);
      if ('ontouchstart' in window) {
        scroller.removeEventListener('touchstart', this.#handleMouseDown);
      }
      this.#scroll.destroy();
    }

    const slideCount = this.slides?.length || 0;
    if (slideCount > 1) {
      this.removeEventListener('mouseenter', this.suspend);
      this.removeEventListener('mouseleave', this.resume);
      this.removeEventListener('pointerenter', this.#handlePointerEnter);
      document.removeEventListener('visibilitychange', this.#handleVisibilityChange);
    }

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
    }

    if (this.#intersectionObserver) {
      this.#intersectionObserver.disconnect();
      this.#intersectionObserver = null;
    }
  }

  /** Indicates whether the slideshow is nested inside another slideshow. */
  get isNested() {
    return this.parentElement?.closest('slideshow-component') !== null;
  }

  get initialSlide() {
    return this.refs.slides?.[this.initialSlideIndex];
  }

  /**
   * Selects a slide based on the input index.
   * @param {number|string|{id: string}} input - The index or id of the slide to select.
   * @param {Event} [event] - The event that triggered the selection.
   * @param {Object} [options] - The options for the selection.
   * @param {boolean} [options.animate=true] - Whether to animate the selection.
   */
  async select(input, event, options = {}) {
    if (this.#disabled || !this.refs.slides?.length) return;
    if (!this.#scroll) return;

    // Store the actual current slide before any mutations
    const currentSlide = this.slides?.[this.current];

    for (const slide of this.refs.slides) {
      if (slide.hasAttribute('reveal')) {
        slide.removeAttribute('reveal');
        slide.setAttribute('aria-hidden', 'true');
      }
    }

    // Figure out the raw desired index (could be -1 if user is on first slide and clicks prev)
    let requestedIndex = (() => {
      if (typeof input === 'number') return input;
      if (typeof input === 'string') return parseInt(input, 10);
      if ('id' in input) {
        const requestedSlide = this.refs.slides.find((slide) => slide.getAttribute('slide-id') == input.id);

        if (!requestedSlide || !this.slides) return;

        // Force the slide to be revealed if it is hidden
        if (requestedSlide.hasAttribute('hidden')) {
          requestedSlide.setAttribute('reveal', '');
          requestedSlide.setAttribute('aria-hidden', 'false');
        }

        return this.slides.indexOf(requestedSlide);
      }
    })();

    const { current } = this;
    const { slides } = this;

    // Guard checks: no slides, invalid index, or selecting the same slide
    if (!slides?.length || requestedIndex === undefined || isNaN(requestedIndex)) return;

    const requestedSlideElement = slides?.[requestedIndex];
    if (currentSlide === requestedSlideElement) return;

    if (!this.infinite) requestedIndex = clamp(requestedIndex, 0, slides.length - 1);

    event?.preventDefault();

    const { animate = true } = options;
    const lastIndex = slides.length - 1;

    // Decide the actual target index (clamp for infinite loop)
    let index = requestedIndex;
    if (requestedIndex < 0) index = lastIndex;
    else if (requestedIndex > lastIndex) index = 0;

    const isAdjacentSlide = Math.abs(index - current) <= 1 && requestedIndex >= 0 && requestedIndex <= lastIndex;
    const { visibleSlides } = this;
    const instant = prefersReducedMotion() || !animate;

    // If jump is more than 1 or we looped, do the placeholder + reorder trick
    if (!instant && !isAdjacentSlide && visibleSlides.length === 1) {
      this.#disabled = true;
      await this.#scroll.finished; // ensure we're not mid-scroll

      const targetSlide = slides[index];
      if (!targetSlide || !currentSlide) return;

      // Create a placeholder in the original DOM position of targetSlide
      const placeholder = document.createElement('slideshow-slide');
      targetSlide.before(placeholder);

      // Decide whether targetSlide goes before or after currentSlide
      // so that we scroll a short distance in the correct direction
      if (requestedIndex < current) {
        currentSlide.before(targetSlide);
      } else {
        currentSlide.after(targetSlide);
      }

      if (current === 0) this.#scroll.to(currentSlide, { instant: true });

      // Once that scroll finishes, restore the DOM
      queueMicrotask(async () => {
        await this.#scroll.finished;
        this.#disabled = false;

        // Restore the slide back to its original position. This triggers a scroll event.
        placeholder.replaceWith(targetSlide);

        // Instantly scroll to the target slide as its position will have changed
        this.#scroll.to(targetSlide, { instant: true });
      });
    }

    const slide = slides[index];
    if (!slide) return;

    const previousIndex = this.current;

    slide.setAttribute('aria-hidden', 'false');

    if (this.#scroll) {
      this.#scroll.to(slide, { instant });
    }

    this.current = this.slides?.indexOf(slide) || 0;

    this.#centerSelectedThumbnail(index, instant ? 'instant' : 'smooth');

    this.dispatchEvent(
      new SlideshowSelectEvent({
        index,
        previousIndex,
        userInitiated: event != null,
        trigger: 'select',
        slide,
        id: slide.getAttribute('slide-id'),
      })
    );
  }

  /**
   * Advances to the next slide.
   * @param {Event} [event] - The event that triggered the next slide.
   * @param {Object} [options] - The options for the next slide.
   * @param {boolean} [options.animate=true] - Whether to animate the next slide.
   */
  next(event, options) {
    event?.preventDefault();
    this.select(this.nextIndex, event, options);
  }

  /**
   * Goes back to the previous slide.
   * @param {Event} [event] - The event that triggered the previous slide.
   * @param {Object} [options] - The options for the previous slide.
   * @param {boolean} [options.animate=true] - Whether to animate the previous slide.
   */
  previous(event, options) {
    event?.preventDefault();
    this.select(this.previousIndex, event, options);
  }

  /**
   * Starts automatic slide playback.
   * @param {number} [interval] - The time interval in seconds between slides.
   */
  play(interval = this.autoplayInterval) {
    if (this.#interval) return;

    this.paused = false;

    this.#interval = setInterval(() => {
      if (this.matches(':hover') || document.hidden) return;

      this.next();
    }, interval);
  }

  /**
   * Pauses automatic slide playback.
   */
  pause() {
    this.paused = true;
    this.suspend();
  }

  get paused() {
    return this.hasAttribute('paused');
  }

  set paused(value) {
    if (value) {
      this.setAttribute('paused', '');
    } else {
      this.removeAttribute('paused');
    }
  }

  /**
   * Suspends automatic slide playback.
   */
  suspend() {
    clearInterval(this.#interval);
    this.#interval = undefined;
  }

  /**
   * Resumes automatic slide playback if autoplay is enabled.
   */
  resume() {
    if (!this.autoplay || this.paused) return;

    this.pause();
    this.play();
  }

  get autoplay() {
    return Boolean(this.autoplayInterval);
  }

  get autoplayInterval() {
    const interval = this.getAttribute('autoplay');
    const value = parseInt(`${interval}`, 10);

    if (Number.isNaN(value)) return undefined;

    return value * 1000;
  }

  /**
   * The current slide index.
   * @type {number}
   */
  #current = 0;

  get current() {
    return this.#current;
  }

  /**
   * Sets the current slide index and update the DOM
   * @type {number}
   */
  set current(value) {
    const { current, thumbnails, dots, slides, previous, next } = this.refs;

    this.#current = value;

    if (current) current.textContent = `${value + 1}`;

    for (const controls of [thumbnails, dots]) {
      controls?.forEach((el, i) => el.setAttribute('aria-selected', `${i === value}`));
    }

    if (previous) previous.disabled = Boolean(!this.infinite && value === 0);
    if (next) next.disabled = Boolean(!this.infinite && slides && this.nextIndex >= slides.length);
  }

  get infinite() {
    return this.getAttribute('infinite') != null;
  }

  get visibleSlides() {
    return this.#visibleSlides;
  }

  get previousIndex() {
    const { current, visibleSlides } = this;
    const modifier = visibleSlides.length > 1 ? visibleSlides.length : 1;

    return current - modifier;
  }

  get nextIndex() {
    const { current, visibleSlides } = this;
    const modifier = visibleSlides.length > 1 ? visibleSlides.length : 1;

    return current + modifier;
  }

  get atStart() {
    const { current, slides } = this;

    return slides?.length ? current === 0 : false;
  }

  get atEnd() {
    const { current, slides } = this;

    return slides?.length ? current === slides.length - 1 : false;
  }

  /**
   * Sets the disabled attribute.
   * @param {boolean} value - The value to set the disabled attribute to.
   */
  set disabled(value) {
    this.setAttribute('disabled', String(value));
  }
  /**
   * Whether the slideshow is disabled.
   * @type {boolean}
   */
  get disabled() {
    return (
      this.getAttribute('disabled') === 'true' || (this.hasAttribute('mobile-disabled') && !mediaQueryLarge.matches)
    );
  }

  /**
   * Indicates whether the slideshow is temporarily disabled (e.g., during infinite loop transition).
   * @type {boolean}
   */
  #disabled = false;

  /**
   * The interval ID for automatic playback.
   * @type {number|undefined}
   */
  #interval = undefined;

  /**
   * The Scroller instance that manages scrolling.
   * @type {Scroller}
   */
  #scroll;

  /**
   * The ResizeObserver instance for monitoring scroller size changes
   * @type {ResizeObserver}
   */
  #resizeObserver;

  /**
   * IntersectionObserver for efficient visibility tracking of slides
   * @type {IntersectionObserver | null}
   */
  #intersectionObserver = null;

  /**
   * Cached visible slides result from IntersectionObserver
   * @type {HTMLElement[]}
   */
  #visibleSlides = [];

  /**
   * Setup the slideshow without controls for zero or one slides
   */
  #setupSlideshowWithoutControls() {
    this.current = 0;
    if (this.hasAttribute('auto-hide-controls')) {
      const { slideshowControls } = this.refs;
      if (slideshowControls instanceof HTMLElement) {
        slideshowControls.hidden = true;
      }
    }

    if (this.refs.slides?.[0]) {
      this.refs.slides[0].setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Setup the slideshow with controls for when there are multiple slides
   */
  #setupSlideshow() {
    // Setup IntersectionObserver first for efficient visibility tracking
    this.#setupIntersectionObserver();

    // Setup the scroll instance
    const { scroller } = this.refs;
    this.#scroll = new Scroller(scroller, {
      onScroll: this.#handleScroll,
      onScrollStart: this.#onTransitionInit,
      onScrollEnd: this.#onTransitionEnd,
    });

    // Listen for both mouse and pointer events for better touch support
    scroller.addEventListener('mousedown', this.#handleMouseDown);
    scroller.addEventListener('pointerdown', this.#handleMouseDown,{ capture: true });
    if ('ontouchstart' in window) {
      scroller.addEventListener('touchstart', this.#handleMouseDown, { passive: false });
    }

    this.addEventListener('mouseenter', this.suspend);
    this.addEventListener('mouseleave', this.resume);
    this.addEventListener('pointerenter', this.#handlePointerEnter);
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);

    this.#updateControlsVisibility();

    this.disabled = this.disabled;

    this.resume();

    this.current = this.initialSlideIndex;

    // Batch reads and writes to the DOM
    scheduler.schedule(() => {
      let visibleSlidesAmount = 0;
      const initialSlideId = this.initialSlide?.getAttribute('slide-id');

      // Wait for next frame to ensure layout is fully calculated before setting initial scroll position
      // This prevents race conditions on Safari mobile when section_width is 'full-width'
      requestAnimationFrame(() => {
        if (this.initialSlideIndex !== 0 && initialSlideId) {
          this.select({ id: initialSlideId }, undefined, { animate: false });
          visibleSlidesAmount = 1;
        } else {
          visibleSlidesAmount = this.#updateVisibleSlides();
          if (visibleSlidesAmount === 0) {
            this.select(0, undefined, { animate: false });
            visibleSlidesAmount = 1;
          }
        }
      });

      this.#resizeObserver = new ResizeObserver(async () => {
        if (viewTransition.current) await viewTransition.current;

        if (visibleSlidesAmount > 1) {
          this.#updateVisibleSlides();
        }

        if (this.hasAttribute('auto-hide-controls')) {
          this.#updateControlsVisibility();
        }
      });

      this.#resizeObserver.observe(this.refs.slideshowContainer);
    });
  }

  /**
   * Callback invoked on user initiated scroll to sync the current slide index
   * and emit a slide change event if the index has changed.
   */
  #handleScroll = () => {
    const previousIndex = this.#current;
    const index = this.#sync();

    if (index === previousIndex) return;

    const slide = this.slides?.[index];
    if (!slide) return;

    this.dispatchEvent(
      new SlideshowSelectEvent({
        index,
        previousIndex,
        userInitiated: true,
        trigger: 'scroll',
        slide,
        id: slide.getAttribute('slide-id'),
      })
    );
  };

  #onTransitionInit = () => {
    this.setAttribute('transitioning', '');
  };

  #onTransitionEnd = () => {
    this.#updateVisibleSlides();
    this.removeAttribute('transitioning');
  };

  /**
   * Synchronizes the scroll position and updates the current slide index.
   * @returns {number} The index of the current slide.
   */
  #sync = () => {
    const { slides } = this;
    if (!slides) return (this.current = 0);

    if (!this.#scroll) return (this.current = 0);

    const visibleSlides = this.visibleSlides;

    if (!visibleSlides.length) return this.current;

    const { axis } = this.#scroll;
    const { scroller } = this.refs;
    const centers = visibleSlides.map((slide) => center(slide, axis));
    const referencePoint = visibleSlides.length > 1 ? scroller.getBoundingClientRect()[axis] : center(scroller, axis);
    const closestCenter = closest(centers, referencePoint);
    const closestVisibleSlide = visibleSlides[centers.indexOf(closestCenter)];

    if (!closestVisibleSlide) return (this.current = 0);

    const index = slides.indexOf(closestVisibleSlide);

    return (this.current = index);
  };

  #dragging = false;

  /**
   * Touch/swipe detection thresholds (inspired by Swiper.js)
   * @constant {number}
   */
  #SWIPE_THRESHOLD = 5; // Minimum distance in pixels to start a swipe
  #VELOCITY_THRESHOLD = 300; // Minimum velocity (px/s) to trigger slide change
  #DISTANCE_THRESHOLD = 50; // Minimum distance (px) to trigger slide change

  /**
   * Finds nested slideshow components within this slideshow.
   * @returns {Slideshow[]} Array of nested slideshow components
   */
  #getNestedSlideshows() {
    const nested = [];
    const allSlideshows = this.querySelectorAll('slideshow-component');
    
    for (const slideshow of allSlideshows) {
      if (slideshow instanceof Slideshow && slideshow !== this) {
        nested.push(slideshow);
      }
    }
    
    return nested;
  }

  /**
   * Checks if a point (x, y) is within the bounds of a nested slideshow.
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {Slideshow} nestedSlideshow - The nested slideshow to check
   * @returns {boolean} True if the point is within the nested slideshow bounds
   */
  #isPointInNestedSlideshow(x, y, nestedSlideshow) {
    const rect = nestedSlideshow.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  /**
   * Finds the nested slideshow that contains the given point, if any.
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Slideshow | null} The nested slideshow containing the point, or null
   */
  #getNestedSlideshowAtPoint(x, y) {
    const nested = this.#getNestedSlideshows();
    
    for (const slideshow of nested) {
      if (this.#isPointInNestedSlideshow(x, y, slideshow)) {
        return slideshow;
      }
    }
    
    return null;
  }

  /**
   * Handles the 'mousedown' event to start dragging slides (works for both mouse and touch).
   * Updated to ensure nested slideshows receive events properly.
   * @param {MouseEvent | PointerEvent} event - The mousedown or pointerdown event.
   */
  /**
   * Handles the 'mousedown' event to start dragging slides.
   */
  #handleMouseDown = (event) => {
    // 1. Identify the intended slideshow target
    const owner = event.target.closest('slideshow-component');
    
    // If this event started inside a different (nested) slideshow, 
    // let that instance handle it.
    if (owner && owner !== this) {
      return;
    }

    // 2. We are the owner! Stop the event from reaching parent slideshows.
    event.stopPropagation();

    // Check if the event target is within a 3D model or interactive element
    if (event.target.closest('model-viewer, button, a')) {
      // Allow standard interaction for these elements
      return;
    }

    // Get touch/pointer coordinates
    let clientX, clientY;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Store initial position
    const { axis } = this.#scroll;
    const startPosition = axis === 'x' ? clientX : clientY;
    const startPositionOpposite = axis === 'x' ? clientY : clientX;

    const controller = new AbortController();
    const { signal } = controller;
    
    const startTime = performance.now();
    let previous = startPosition;
    let moved = false;
    let distanceTravelled = 0;
    let lastMoveTime = startTime;
    let velocity = 0;

    this.#dragging = true;

    // Capture the pointer so we get move events even if the finger leaves the scroller
    if ('pointerId' in event && this.refs.scroller.setPointerCapture) {
      this.refs.scroller.setPointerCapture(event.pointerId);
    }

    const onPointerMove = (event) => {
      let currentX, currentY;
      if ('touches' in event && event.touches.length > 0) {
        currentX = event.touches[0].clientX;
        currentY = event.touches[0].clientY;
      } else {
        currentX = event.clientX;
        currentY = event.clientY;
      }

      const current = axis === 'x' ? currentX : currentY;
      const currentOpposite = axis === 'x' ? currentY : currentX;
      
      const initialDelta = startPosition - current;
      const oppositeDelta = Math.abs(startPositionOpposite - currentOpposite);

      // Threshold check: ignore tiny jitters or vertical scrolling (if horizontal)
      if (!moved) {
        if (Math.abs(initialDelta) < this.#SWIPE_THRESHOLD) return;
        if (oppositeDelta > Math.abs(initialDelta)) {
           // User is likely scrolling the page, not the slideshow
           controller.abort();
           return;
        }
        
        moved = true;
        this.pause();
        this.setAttribute('dragging', '');
        // Prevent accidental clicks on links/buttons inside slides during drag
        document.addEventListener('click', preventDefault, { once: true, signal });
      }

      // Calculate movement delta
      const delta = previous - current;
      const now = performance.now();
      const timeDelta = now - lastMoveTime;
      
      if (timeDelta > 0) {
        velocity = Math.round((delta / timeDelta) * 1000);
      }
      
      previous = current;
      lastMoveTime = now;
      distanceTravelled += Math.abs(delta);

      // Perform the scroll
      this.#scroll.by(delta, { instant: true });
    };

    const onPointerUp = async (event) => {
      this.#dragging = false;
      controller.abort();
      
      this.removeAttribute('dragging');
      if ('pointerId' in event && this.refs.scroller.releasePointerCapture) {
        this.refs.scroller.releasePointerCapture(event.pointerId);
      }

      if (!moved) {
        this.#scroll.snap = true;
        this.resume();
        return;
      }

      // Handle slide snapping logic based on velocity/distance
      const direction = Math.sign(velocity);
      const next = this.#sync();
      const shouldChangeSlide = Math.abs(velocity) > this.#VELOCITY_THRESHOLD || 
                               distanceTravelled > this.#DISTANCE_THRESHOLD;

      const newIndex = clamp(next + (shouldChangeSlide ? direction : 0), 0, (this.slides?.length || 1) - 1);
      const newSlide = this.slides[newIndex];
      
      if (newSlide) {
        this.#scroll.to(newSlide);
        this.current = newIndex;
      }

      this.#scroll.snap = true;
      this.resume();
    };

    // Use document for move/up to ensure we track the pointer even if it leaves the element
    document.addEventListener('pointermove', onPointerMove, { signal });
    document.addEventListener('pointerup', onPointerUp, { signal });
    document.addEventListener('pointercancel', onPointerUp, { signal });
    
    // Fallback for touch-specific quirks
    if ('ontouchstart' in window) {
      document.addEventListener('touchmove', onPointerMove, { signal });
      document.addEventListener('touchend', onPointerUp, { signal });
    }
  };

  #handlePointerEnter = () => {
    this.setAttribute('actioned', '');
  };

  get slides() {
    return this.refs.slides?.filter((slide) => !slide.hasAttribute('hidden') || slide.hasAttribute('reveal'));
  }

  /**
   * The initial slide index.
   * @type {number}
   */
  get initialSlideIndex() {
    const initialSlide = this.getAttribute('initial-slide');
    if (initialSlide == null) return 0;

    return parseInt(initialSlide, 10);
  }

  /**
   * Pause the slideshow when the page is hidden.
   */
  #handleVisibilityChange = () => (document.hidden ? this.pause() : this.resume());

  #updateControlsVisibility() {
    if (!this.hasAttribute('auto-hide-controls')) return;

    const { scroller, slideshowControls } = this.refs;

    if (!(slideshowControls instanceof HTMLElement)) return;

    slideshowControls.hidden = scroller.scrollWidth <= scroller.offsetWidth;
  }

  /**
   * Setup IntersectionObserver for efficient visibility tracking of slides
   */
  #setupIntersectionObserver() {
    const { slides, scroller } = this.refs;
    if (!slides?.length) return;

    if (this.#intersectionObserver) {
      this.#intersectionObserver.disconnect();
    }

    this.#intersectionObserver = new IntersectionObserver(
      (entries) => {
        const allEntries = [
          ...entries,
          ...(this.#intersectionObserver ? this.#intersectionObserver.takeRecords() : []),
        ];

        for (const entry of allEntries) {
          const slide = /** @type {HTMLElement} */ (entry.target);
          const isCurrentlyVisible = this.#visibleSlides.includes(slide);
          const shouldBeVisible = entry.intersectionRatio >= SLIDE_VISIBLITY_THRESHOLD;

          if (shouldBeVisible && !isCurrentlyVisible) {
            this.#visibleSlides.push(slide);
          } else if (!shouldBeVisible && isCurrentlyVisible) {
            const index = this.#visibleSlides.indexOf(slide);
            if (index > -1) {
              this.#visibleSlides.splice(index, 1);
            }
          }
        }

        this.#visibleSlides.sort((a, b) => slides.indexOf(a) - slides.indexOf(b));
        this.#updateVisibleSlides();
      },
      {
        root: scroller,
        threshold: SLIDE_VISIBLITY_THRESHOLD,
        // Add small margin to account for sub-pixel rendering
        rootMargin: '1px',
      }
    );

    // Observe all slides - observer will fire initial callback asynchronously
    slides.forEach((slide) => {
      this.#intersectionObserver?.observe(slide);
    });
  }

  /**
   * Centers the selected thumbnail in the thumbnails container
   * @param {number} index - The index of the selected thumbnail
   * @param {ScrollBehavior} [behavior] - The scroll behavior.
   */
  #centerSelectedThumbnail(index, behavior = 'smooth') {
    const selectedThumbnail = this.refs.thumbnails?.[index];
    if (!selectedThumbnail) return;

    const { thumbnailsContainer } = this.refs;
    if (!thumbnailsContainer || !(thumbnailsContainer instanceof HTMLElement)) return;

    const { slideshowControls } = this.refs;
    if (!slideshowControls || !(slideshowControls instanceof HTMLElement)) return;

    scrollIntoView(selectedThumbnail, {
      ancestor: thumbnailsContainer,
      behavior,
      block: 'center',
      inline: 'center',
    });
  }

  #updateVisibleSlides() {
    const { slides } = this;
    if (!slides || !slides.length) return 0;

    const visibleSlides = this.visibleSlides;

    // Batch writes to the DOM
    scheduler.schedule(() => {
      // Update aria-hidden based on visibility
      slides.forEach((slide) => {
        const isVisible = visibleSlides.includes(slide);
        slide.setAttribute('aria-hidden', `${!isVisible}`);
      });
    });

    return visibleSlides.length;
  }
}

if (!customElements.get('slideshow-component')) {
  customElements.define('slideshow-component', Slideshow);
}
