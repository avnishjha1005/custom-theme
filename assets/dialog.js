export class DialogComponent extends Component {
  requiredRefs = ['dialog'];

  connectedCallback() {
    super.connectedCallback();

    if (this.minWidth || this.maxWidth) {
      window.addEventListener('resize', this.#handleResize);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.minWidth || this.maxWidth) {
      window.removeEventListener('resize', this.#handleResize);
    }
  }

  #handleResize = debounce(() => {
    const { minWidth, maxWidth } = this;

    if (!minWidth && !maxWidth) return;

    const windowWidth = window.innerWidth;
    if (windowWidth < minWidth || windowWidth > maxWidth) {
      this.closeDialog();
    }
  }, 50);

  #previousScrollY = 0;

  showDialog() {
    const { dialog } = this.refs;

    if (dialog.open) return;

    console.log('Search dialog opening');

    // Close menu drawer when search opens
    const menuDrawer = document.querySelector('header-drawer');
    console.log('Found menu drawer:', menuDrawer);
    if (menuDrawer?.isOpen) {
      console.log('Menu is open, closing it...');
      menuDrawer.close();
    }

    const scrollY = window.scrollY;
    this.#previousScrollY = scrollY;

    requestAnimationFrame(() => {
      document.body.style.width = '100%';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;

      dialog.showModal();
      this.dispatchEvent(new DialogOpenEvent());

      this.addEventListener('click', this.#handleClick);
      this.addEventListener('keydown', this.#handleKeyDown);
    });
  }

  closeDialog = async () => {
    const { dialog } = this.refs;

    if (!dialog.open) return;

    console.log('Search dialog closing');

    this.removeEventListener('click', this.#handleClick);
    this.removeEventListener('keydown', this.#handleKeyDown);

    dialog.style.animation = 'none';
    void dialog.offsetWidth;
    dialog.classList.add('dialog-closing');
    dialog.style.animation = '';

    await onAnimationEnd(dialog, undefined, {
      subtree: false,
    });

    document.body.style.width = '';
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo({ top: this.#previousScrollY, behavior: 'instant' });

    dialog.close();
    dialog.classList.remove('dialog-closing');

    this.dispatchEvent(new DialogCloseEvent());
  };

  toggleDialog = () => {
    if (this.refs.dialog.open) {
      this.closeDialog();
    } else {
      this.showDialog();
    }
  };

  #handleClick(event) {
    const { dialog } = this.refs;

    if (isClickedOutside(event, dialog)) {
      this.closeDialog();
    }
  }

  #handleKeyDown(event) {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    this.closeDialog();
  }

  get minWidth() {
    return Number(this.getAttribute('dialog-active-min-width'));
  }

  get maxWidth() {
    return Number(this.getAttribute('dialog-active-max-width'));
  }
}

// DEBUGGING: Add this to check if elements exist
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Checking for elements ===');
  console.log('header-drawer:', document.querySelector('header-drawer'));
  console.log('dialog-component:', document.querySelector('dialog-component'));
  
  // Test if you can find the details element
  const drawer = document.querySelector('header-drawer');
  if (drawer) {
    console.log('Drawer details:', drawer.querySelector('details'));
    console.log('Drawer is open?', drawer.isOpen);
  }
});