(function () {
  const css = `
    [class*="_formFieldset"] {
      border: none !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 24px !important;
      max-width: 500px !important;
      margin: 0 auto !important;
    }

    [class*="_formInputField"]:not(label),
    [class*="_textArea"] {
      width: 100% !important;
      background: transparent !important;
      padding: 8px 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin: 0 !important;
      border: none !important;
      border-bottom: 1px solid #000 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      border-radius: 0 !important;
      transition: border-color 0.2s ease !important;
      color: inherit !important;
      outline: none !important;
      box-shadow: none !important;
      -webkit-font-smoothing: antialiased;
      -webkit-appearance: none;
      appearance: none;
    }

    [class*="_formInputField"]:not(label):focus,
    [class*="_textArea"]:focus {
      border: none !important;
      border-bottom: 1px solid #000 !important;
      outline: none !important;
      box-shadow: none !important;
    }

    [class*="_formInputField"]:not(label)::placeholder,
    [class*="_textArea"]::placeholder {
      color: #000 !important;
      font-weight: 600 !important;
      opacity: 1 !important;
      text-align: left !important;
    }

    [class*="_formInputField"]:not(label),
    [class*="_textArea"],
    [class*="_formInputFieldLabel"] {
      text-align: left !important;
    }

    [class*="_textArea"] {
      resize: vertical !important;
      min-height: 60px !important;
      padding-bottom: 24px !important;
    }

    [class*="_formInputFieldLabel"] {
      font-size: 12px !important;
      color: #999 !important;
      font-weight: 400 !important;
      padding: 0 !important;
      margin: 0 !important;
      left: 0 !important;
      top: 0 !important;
      position: relative !important;
      transform: none !important;
      pointer-events: none !important;
      margin-bottom: 4px !important;
    }

    [class*="_formFieldContainer"] {
      display: flex !important;
      flex-direction: column-reverse !important;
      gap: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    [class*="_formSubmitButton"] {
      background: #202020 !important;
      color: #fff !important;
      border: none !important;
      padding: 12px 24px !important;
      font-size: 14px !important;
      font-weight: 400 !important;
      cursor: pointer !important;
      min-width: max-content !important;
      border-radius: 0 !important;
      -webkit-font-smoothing: antialiased;
    }

    [class*="_birthdayText"] {
      font-size: 12px !important;
      color: #999 !important;
      font-weight: 400 !important;
    }

    [class*="_dateFieldContainer"] {
      display: flex !important;
      gap: 12px !important;
    }
  `;

  function injectIntoShadowRoots(root) {
    root.querySelectorAll('*').forEach(function (el) {
      if (el.shadowRoot) {
        var style = document.createElement('style');
        style.textContent = css;
        el.shadowRoot.appendChild(style);
        injectIntoShadowRoots(el.shadowRoot);
      }
    });
  }

  function init() {
    injectIntoShadowRoots(document);

    var observer = new MutationObserver(function () {
      injectIntoShadowRoots(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
