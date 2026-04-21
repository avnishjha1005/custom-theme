const BASE_CURRENCY = 'INR';
const SELECTED_CURRENCY_STORAGE_KEY = 'theme_display_currency';
const RATES_CACHE_STORAGE_KEY = 'theme_display_currency_rates_v1';
const RATES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FALLBACK_RATES = {
  INR: 1,
  USD: 0.0119,
  EUR: 0.0105,
  GBP: 0.009,
  AUD: 0.0185,
  CAD: 0.0162,
  SGD: 0.0158,
  AED: 0.0437,
  SAR: 0.0446,
  JPY: 1.7,
  HKD: 0.093,
  NZD: 0.0201,
  CHF: 0.0098,
  SEK: 0.115,
  NOK: 0.123,
  DKK: 0.078,
  ZAR: 0.224,
  BRL: 0.067,
  MXN: 0.203,
  THB: 0.429,
  MYR: 0.056,
  IDR: 194,
};
const COUNTRY_TO_CURRENCY = {
  IN: 'INR',
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'USD',
  CL: 'USD',
  CO: 'USD',
  PE: 'USD',
  GB: 'GBP',
  IE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  PL: 'PLN',
  CZ: 'CZK',
  DK: 'DKK',
  SE: 'SEK',
  NO: 'NOK',
  CH: 'CHF',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  TR: 'TRY',
  RU: 'RUB',
  UA: 'UAH',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  IL: 'ILS',
  JO: 'JOD',
  EG: 'EGP',
  ZA: 'ZAR',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  MA: 'MAD',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  MY: 'MYR',
  TH: 'THB',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  KR: 'KRW',
  JP: 'JPY',
  HK: 'HKD',
  TW: 'TWD',
  CN: 'CNY',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
};
const RATE_SOURCE_URLS = [
  'https://open.er-api.com/v6/latest/INR',
  'https://api.frankfurter.app/latest?from=INR',
  'https://latest.currency-api.pages.dev/v1/currencies/inr.json',
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json',
];

let exchangeRates = { ...FALLBACK_RATES, [BASE_CURRENCY]: 1 };
let targetCurrency = BASE_CURRENCY;
let mutationObserver;
let conversionFrame = null;
let rateRefreshPromise = null;
let localizationListenersBound = false;

function normalizeCurrencyCode(value) {
  if (!value || typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return null;

  return normalized;
}

function normalizeCountryCode(value) {
  if (!value || typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;

  return normalized;
}

function inferCurrencyFromCountryCode(countryCode) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!normalizedCountryCode) return null;
  return COUNTRY_TO_CURRENCY[normalizedCountryCode] || null;
}

function safeReadStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

function readCurrencyFromDom() {
  const currencyNode = document.querySelector(
    '[data-testid="localization-currency-code"], .drawer-localization__button .currency-code, .mobile-localization .currency-code'
  );

  return normalizeCurrencyCode(currencyNode?.textContent ?? '');
}

function getAvailableCountryCurrencyMap() {
  const countryCurrencyMap = new Map();

  document.querySelectorAll('.localization-form__list-item[data-value][data-currency]').forEach((item) => {
    const countryCode = normalizeCountryCode(item.getAttribute('data-value'));
    const rawCurrencyCode = normalizeCurrencyCode(item.getAttribute('data-currency'));
    const inferredCurrencyCode = inferCurrencyFromCountryCode(countryCode);
    let currencyCode = rawCurrencyCode;

    if (!currencyCode && inferredCurrencyCode) {
      currencyCode = inferredCurrencyCode;
    } else if (currencyCode === BASE_CURRENCY && inferredCurrencyCode && inferredCurrencyCode !== BASE_CURRENCY) {
      currencyCode = inferredCurrencyCode;
    }

    if (!countryCode || !currencyCode || countryCurrencyMap.has(countryCode)) return;
    countryCurrencyMap.set(countryCode, currencyCode);
  });

  return countryCurrencyMap;
}

function extractCountryFromLocale(locale) {
  if (!locale || typeof locale !== 'string') return null;

  try {
    const intlLocale = new Intl.Locale(locale);
    return normalizeCountryCode(intlLocale.region);
  } catch {
    const match = locale.toUpperCase().match(/(?:-|_)([A-Z]{2})(?:$|[-_])/);
    return normalizeCountryCode(match?.[1]);
  }
}

function guessCurrencyFromBrowserLocale() {
  const localeCandidates = [];

  try {
    localeCandidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Ignore locale resolution errors.
  }

  if (typeof navigator !== 'undefined') {
    localeCandidates.push(navigator.language);
    if (Array.isArray(navigator.languages)) {
      localeCandidates.push(...navigator.languages);
    }
  }

  const countryCurrencyMap = getAvailableCountryCurrencyMap();

  for (const locale of localeCandidates) {
    const countryCode = extractCountryFromLocale(locale);
    if (!countryCode) continue;

    const matchedCurrency = countryCurrencyMap.get(countryCode);
    if (matchedCurrency) return matchedCurrency;
  }

  return null;
}

function syncCurrencyLabels(currency) {
  document
    .querySelectorAll(
      '[data-testid="localization-currency-code"], .drawer-localization__button .currency-code, .mobile-localization .currency-code'
    )
    .forEach((label) => {
      label.textContent = currency;
    });
}

function isPriceLikeClassName(value) {
  if (!value || typeof value !== 'string') return false;
  return /(price|money|amount|subtotal|total|cost|discount|sale)/i.test(value);
}

function hasCurrencyHint(text) {
  if (!text || typeof text !== 'string') return false;
  return /(?:₹|rs\.?|inr|\$|€|£|¥|usd|eur|gbp|aed|cad|aud|jpy|sgd|sar|chf|sek|nok|dkk|nzd|hkd|myr|thb|idr|zar|mxn|brl)/i.test(
    text
  );
}

function closeLocalizationUIFromItem(countryItem) {
  const dropdown = countryItem.closest('dropdown-localization-component');
  if (dropdown && typeof dropdown.hidePanel === 'function') {
    dropdown.hidePanel();
  }

  const drawerDetails = countryItem.closest('drawer-localization-component')?.querySelector('details');
  if (drawerDetails instanceof HTMLDetailsElement) {
    drawerDetails.open = false;
  }
}

function readCurrencyFromCountryItem(countryItem) {
  if (!(countryItem instanceof HTMLElement)) return null;

  const datasetCurrency = normalizeCurrencyCode(countryItem.dataset.currency);
  const inferredFromCountry = inferCurrencyFromCountryCode(countryItem.dataset.value);

  if (datasetCurrency && datasetCurrency !== BASE_CURRENCY) return datasetCurrency;
  if (inferredFromCountry) return inferredFromCountry;
  if (datasetCurrency) return datasetCurrency;

  const currencyText = countryItem.querySelector('.localization-form__currency')?.textContent || '';
  const currencyFromText = normalizeCurrencyCode(currencyText.split(/\s+/).find((part) => /^[A-Za-z]{3}$/.test(part)));
  if (currencyFromText) return currencyFromText;

  return null;
}

function syncCountrySelectionState(countryCode) {
  if (!countryCode) return;

  document.querySelectorAll('.localization-form__list-item[data-value]').forEach((item) => {
    if (!(item instanceof HTMLElement)) return;

    if (item.dataset.value?.toUpperCase() === countryCode) {
      item.setAttribute('aria-current', 'true');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function setDisplayCurrency(currency, options = {}) {
  const normalized = normalizeCurrencyCode(currency);
  if (!normalized) return;

  const { persist = true, closeUi = false, countryCode = null } = options;

  targetCurrency = normalized;

  if (persist) {
    safeWriteStorage(SELECTED_CURRENCY_STORAGE_KEY, normalized);
  }

  document.documentElement.setAttribute('data-display-currency', normalized);

  if (countryCode) {
    syncCountrySelectionState(normalizeCountryCode(countryCode));
  }

  syncCurrencyLabels(normalized);
  scheduleConversion();

  if (!exchangeRates[normalized]) {
    ensureExchangeRates(normalized).then((didRefresh) => {
      if (didRefresh) scheduleConversion();
    });
  }

  if (!options.silent) {
    window.dispatchEvent(
      new CustomEvent('theme:display-currency-changed', {
        detail: { currency: normalized },
      })
    );
  }

  if (closeUi && options.sourceItem instanceof HTMLElement) {
    closeLocalizationUIFromItem(options.sourceItem);
  }
}

function parseMoneyTextToCents(text) {
  if (!text || typeof text !== 'string') return null;

  const stripped = text
    .replace(/\u00a0/g, ' ')
    .replace(/[^\d,.\-]/g, '')
    .trim();

  if (!stripped || !/\d/.test(stripped)) return null;

  let normalized = stripped;
  const hasComma = normalized.includes(',');
  const hasDot = normalized.includes('.');

  if (hasComma && hasDot) {
    if (normalized.lastIndexOf('.') > normalized.lastIndexOf(',')) {
      normalized = normalized.replace(/,/g, '');
    } else {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    const parts = normalized.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = `${parts[0].replace(/,/g, '')}.${parts[1]}`;
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

function tagMoneyNodes(root = document) {
  // Priority pass: explicitly handle Shopify/app money spans.
  root.querySelectorAll('span.money').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.moneyCents) return;
    if (node.querySelector('[data-money-cents]')) return;

    const text = (node.textContent || '').trim();
    const cents = parseMoneyTextToCents(text);
    if (!Number.isFinite(cents)) return;

    node.dataset.moneyCents = String(cents);
  });

  const candidateSelectors = [
    '.money',
    '.price',
    '.compare-at-price',
    'sale-price',
    'compare-at-price',
    'unit-price',
    '.hs-price',
    '.bundle-item__price',
    '.bundle-drawer__total-price',
    '.cart__original-total-value',
    '.cart__discount-value',
    '.cart__total-value',
    '.cart-items__price text-component',
    'text-component[data-cart-subtotal]',
  ];

  const candidates = root.querySelectorAll(candidateSelectors.join(','));
  for (const node of candidates) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.dataset.moneyCents) continue;
    if (node.querySelector('[data-money-cents]')) continue;

    const text = (node.textContent || '').trim();
    if (!text || text.length > 60) continue;

    const cents = parseMoneyTextToCents(text);
    if (!Number.isFinite(cents)) continue;

    node.dataset.moneyCents = String(cents);
  }

  // Fallback pass: detect leaf text nodes that look like prices, even if selectors differ.
  const allElements = root.querySelectorAll('body *:not(script):not(style):not(noscript):not(template)');
  for (const element of allElements) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.dataset.moneyCents) continue;
    if (element.querySelector('[data-money-cents]')) continue;
    if (element.childElementCount > 0) continue;

    const text = (element.textContent || '').trim();
    if (!text || text.length > 40) continue;
    if (!/\d/.test(text)) continue;

    const classHint = isPriceLikeClassName(element.className) || isPriceLikeClassName(element.id);
    const currencyHint = hasCurrencyHint(text);

    if (!classHint && !currencyHint) continue;

    const cents = parseMoneyTextToCents(text);
    if (!Number.isFinite(cents)) continue;

    element.dataset.moneyCents = String(cents);
  }
}

function resolveTargetCurrency() {
  const storedCurrency = normalizeCurrencyCode(safeReadStorage(SELECTED_CURRENCY_STORAGE_KEY));
  const domCurrency = readCurrencyFromDom();
  const localeCurrency = guessCurrencyFromBrowserLocale();

  if (storedCurrency) {
    return storedCurrency;
  }

  if (domCurrency && domCurrency !== BASE_CURRENCY) {
    return domCurrency;
  }

  if (localeCurrency) {
    return localeCurrency;
  }

  return domCurrency || BASE_CURRENCY;
}

function readCachedRates() {
  const raw = safeReadStorage(RATES_CACHE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.rates || typeof parsed.rates !== 'object') return null;
    if (typeof parsed.timestamp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function cacheRates(rates) {
  const payload = {
    timestamp: Date.now(),
    rates,
  };

  safeWriteStorage(RATES_CACHE_STORAGE_KEY, JSON.stringify(payload));
}

function hydrateRatesFromCache() {
  const cachedRates = readCachedRates();
  if (!cachedRates?.rates || typeof cachedRates.rates !== 'object') return false;

  exchangeRates = { ...FALLBACK_RATES, ...cachedRates.rates, [BASE_CURRENCY]: 1 };
  return true;
}

function sanitizeRates(ratesCandidate) {
  if (!ratesCandidate || typeof ratesCandidate !== 'object') return null;

  const sanitizedRates = { [BASE_CURRENCY]: 1 };

  for (const [currencyKey, rawRate] of Object.entries(ratesCandidate)) {
    const currency = normalizeCurrencyCode(currencyKey);
    const rate = Number(rawRate);

    if (!currency || !Number.isFinite(rate) || rate <= 0) continue;
    sanitizedRates[currency] = rate;
  }

  return Object.keys(sanitizedRates).length > 1 ? sanitizedRates : null;
}

function extractRatesFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.rates && typeof payload.rates === 'object') {
    return sanitizeRates(payload.rates);
  }

  if (payload.conversion_rates && typeof payload.conversion_rates === 'object') {
    return sanitizeRates(payload.conversion_rates);
  }

  const baseKey = BASE_CURRENCY.toLowerCase();
  if (payload[baseKey] && typeof payload[baseKey] === 'object') {
    return sanitizeRates(payload[baseKey]);
  }

  return null;
}

async function fetchJsonWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshExchangeRates(requiredCurrency = targetCurrency) {
  for (const sourceUrl of RATE_SOURCE_URLS) {
    const payload = await fetchJsonWithTimeout(sourceUrl);
    const rates = extractRatesFromPayload(payload);

    if (!rates) continue;
    if (requiredCurrency && !rates[requiredCurrency]) continue;

    exchangeRates = { ...FALLBACK_RATES, ...rates, [BASE_CURRENCY]: 1 };
    cacheRates(exchangeRates);
    return true;
  }

  return false;
}

function ensureExchangeRates(requiredCurrency = targetCurrency) {
  const cachedRates = readCachedRates();
  const hasFreshCache = cachedRates && Date.now() - cachedRates.timestamp < RATES_CACHE_TTL_MS;
  if (hasFreshCache && hydrateRatesFromCache() && exchangeRates[requiredCurrency]) {
    return Promise.resolve(false);
  }

  if (!rateRefreshPromise) {
    rateRefreshPromise = refreshExchangeRates(requiredCurrency).finally(() => {
      rateRefreshPromise = null;
    });
  }

  return rateRefreshPromise;
}

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(document.documentElement.lang || undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function convertMoneyNode(node) {
  if (!(node instanceof HTMLElement)) return;

  const cents = Number(node.dataset.moneyCents);
  if (!Number.isFinite(cents)) return;

  if (!node.dataset.originalMoneyText) {
    node.dataset.originalMoneyText = (node.textContent ?? '').trim();
  }

  if (targetCurrency === BASE_CURRENCY) {
    node.textContent = node.dataset.originalMoneyText;
    return;
  }

  // If a specific rate is temporarily unavailable, still switch symbol/format so the UI reacts immediately.
  const rate = typeof exchangeRates[targetCurrency] === 'number' ? exchangeRates[targetCurrency] : 1;

  const convertedAmount = (cents / 100) * rate;
  const formattedAmount = formatMoney(convertedAmount, targetCurrency);
  const prefix = (node.dataset.moneyPrefix || '').trim();

  node.textContent = prefix ? `${prefix} ${formattedAmount}`.trim() : formattedAmount;
}

function applyConversions(root = document) {
  const nextCurrency = resolveTargetCurrency();
  if (nextCurrency !== targetCurrency) {
    targetCurrency = nextCurrency;
  }

  tagMoneyNodes(root);

  root.querySelectorAll('[data-money-cents]').forEach((node) => {
    convertMoneyNode(node);
  });
}

function scheduleConversion() {
  if (conversionFrame) return;

  conversionFrame = requestAnimationFrame(() => {
    conversionFrame = null;
    applyConversions(document);
  });
}

function queueWarmupReapplies() {
  const intervals = [100, 300, 700, 1200, 2000, 3200];
  for (const ms of intervals) {
    window.setTimeout(() => {
      scheduleConversion();
    }, ms);
  }
}

function observeMoneyNodes() {
  if (mutationObserver || !document.body) return;

  mutationObserver = new MutationObserver(() => {
    scheduleConversion();
  });

  mutationObserver.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-money-cents', 'class'],
  });
}

function bindLocalizationSelectionListeners() {
  if (localizationListenersBound) return;
  localizationListenersBound = true;

  const handleCountrySelection = (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const countryItem = target?.closest('.localization-form__list-item');
    if (!(countryItem instanceof HTMLElement)) return;

    const currency = readCurrencyFromCountryItem(countryItem);
    if (!currency) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    setDisplayCurrency(currency, {
      persist: true,
      closeUi: true,
      countryCode: countryItem.dataset.value,
      sourceItem: countryItem,
    });
    queueWarmupReapplies();
  };

  document.addEventListener('pointerdown', handleCountrySelection, true);
  document.addEventListener('click', handleCountrySelection, true);

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      const countryItem = target?.closest('.localization-form__list-item');
      if (!(countryItem instanceof HTMLElement)) return;

      const currency = readCurrencyFromCountryItem(countryItem);
      if (!currency) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      setDisplayCurrency(currency, {
        persist: true,
        closeUi: true,
        countryCode: countryItem.dataset.value,
        sourceItem: countryItem,
      });
      queueWarmupReapplies();
    },
    true
  );
}

async function initCurrencyConversion() {
  window.ThemeCurrencyConverter = {
    setCurrency: (currency) => setDisplayCurrency(currency, { persist: true }),
    getCurrency: () => targetCurrency,
    reapply: () => scheduleConversion(),
  };

  setDisplayCurrency(resolveTargetCurrency(), { persist: true, silent: true });
  bindLocalizationSelectionListeners();

  hydrateRatesFromCache();
  applyConversions(document);
  observeMoneyNodes();
  queueWarmupReapplies();

  window.addEventListener('pageshow', scheduleConversion);
  window.addEventListener('theme:display-currency-changed', (event) => {
    const currency = normalizeCurrencyCode(event?.detail?.currency);
    if (!currency) return;
    setDisplayCurrency(currency, { persist: true, silent: true });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === SELECTED_CURRENCY_STORAGE_KEY) {
      scheduleConversion();
    }
  });

  ensureExchangeRates(targetCurrency).then((didRefresh) => {
    if (didRefresh) scheduleConversion();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencyConversion, { once: true });
} else {
  initCurrencyConversion();
}
