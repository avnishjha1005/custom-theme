// Mobile Tab Bar Navigation Controller
class MobileTabBar {
  constructor() {
    this.tabBar = document.querySelector('[mobile-tab-bar]');
    this.links = this.tabBar?.querySelectorAll('.mobile-tab-bar__item') || [];
    
    if (!this.tabBar || this.links.length === 0) return;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.adjustForSafeArea();
    this.adjustMainContentPadding();
    
    window.addEventListener('resize', () => {
      this.adjustForSafeArea();
      this.adjustMainContentPadding();
    });
    
    // Handle route changes
    window.addEventListener('popstate', () => this.updateActiveState());
  }

  setupEventListeners() {
    const links = this.links;
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        // Let the browser handle navigation
        this.updateActiveState();
      });

      // Add touch feedback for better mobile UX
      link.addEventListener('touchstart', function() {
        this.classList.add('mobile-tab-bar__item--active-touch');
      });

      link.addEventListener('touchend', function() {
        this.classList.remove('mobile-tab-bar__item--active-touch');
      });
    });
  }

  adjustForSafeArea() {
    const tabBar = this.tabBar?.querySelector('.mobile-tab-bar');
    if (!tabBar || window.innerWidth >= 750) return;

    // Check if we're in a notched device (iPhone X+, Android notch, etc.)
    const safeAreaInset = getComputedStyle(document.documentElement)
      .getPropertyValue('env(safe-area-inset-bottom)');
    
    if (safeAreaInset && safeAreaInset !== '0px') {
      if (tabBar instanceof HTMLElement) {
        tabBar.style.paddingBottom = safeAreaInset;
      }
      const container = tabBar.querySelector('.mobile-tab-bar__container');
      if (container instanceof HTMLElement) {
        container.style.minHeight = `calc(56px + ${safeAreaInset})`;
      }
    }
  }

  adjustMainContentPadding() {
    if (window.innerWidth >= 750) {
      // Remove padding on tablet and above
      document.body.style.paddingBottom = '0';
    } else if (this.tabBar) {
      // Add padding on mobile to account for sticky tab bar
      const tabBar = this.tabBar.querySelector('.mobile-tab-bar');
      const height = (tabBar instanceof HTMLElement ? tabBar.offsetHeight : 60) || 60;
      document.body.style.paddingBottom = `${height}px`;
    }
  }

  updateActiveState() {
    const currentPath = window.location.pathname;
    const links = this.links;
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (currentPath === href || currentPath.startsWith(href))) {
        link.classList.add('mobile-tab-bar__item--active');
      } else {
        link.classList.remove('mobile-tab-bar__item--active');
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new MobileTabBar();
  });
} else {
  new MobileTabBar();
}

// Re-initialize on Shopify theme editor save
if (window.Shopify && window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', () => {
    new MobileTabBar();
  });
}
