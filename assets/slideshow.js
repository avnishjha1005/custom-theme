// Add CSS imports (global or at component entry)
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Inside initSwiper options:
this.swiper = new Swiper(scroller, {
  modules: [Navigation, Pagination, Autoplay],
  initialSlide: parseInt(this.getAttribute('initial-slide'), 10) || 0,
  loop: this.hasAttribute('infinite'),
  speed: 400,
  nested: this.isNested,

  // Enable mouse dragging
  allowTouchMove: true,
  simulateTouch: true,           // REQUIRED for mouse drag
  touchStartPreventDefault: false, // let events pass in Shopify/nested DOM
  grabCursor: true,

  autoplay: autoplayOptions,

  navigation: {
    nextEl: next || null,
    prevEl: previous || null,
  },
  pagination: {
    el: '.swiper-pagination',
    type: 'bullets',
  },

  observer: true,
  observeParents: true,
  threshold: 3,
  on: {
    slideChange: () => this.#handleSlideChange(),
    init: (s) => {
      this.#updateAria(s);
      console.log('Swiper init', {
        slides: s.slides.length,
        allowTouchMove: s.params.allowTouchMove,
        simulateTouch: s.params.simulateTouch,
        nested: s.params.nested,
      });
    }
  },
});
