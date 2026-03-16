/**
 * content.js – Smart Web Scraper
 * Injected into Amazon / Flipkart / Myntra / Meesho / Snapdeal pages.
 * Scrapes product cards and returns structured JSON.
 *
 * UPDATED:
 *  - Amazon 2025 selectors refreshed
 *  - Flipkart 2025 selectors refreshed
 *  - Added Myntra support
 *  - Added Meesho support
 *  - Added Snapdeal support
 */

(function () {
  'use strict';

  if (window.__smartScraperLoaded) return;
  window.__smartScraperLoaded = true;

  // ─── Site Detection ────────────────────────────────────────────────────────
  const host       = window.location.hostname;
  const isAmazon   = host.includes('amazon');
  const isFlipkart = host.includes('flipkart');
  const isMyntra   = host.includes('myntra');
  const isMeesho   = host.includes('meesho');
  const isSnapdeal = host.includes('snapdeal');

  // ─── Selectors Config ──────────────────────────────────────────────────────
  const SITE_CONFIG = {

    // ── Amazon (refreshed for 2025 — amazon.in verified) ────────────────────
    amazon: {
      container: [
        'div[data-component-type="s-search-result"]',  // most reliable
        '[data-asin]:not([data-asin=""])',              // any element with ASIN
        '.s-result-item[data-asin]',
        '.sg-col-inner .s-card-container'
      ],
      title: [
        // Amazon.in 2025: span inside the h2 anchor — most reliable
        'h2.a-size-mini a span',
        'h2.a-size-small a span',
        'h2.a-size-medium a span',
        'h2 a span',                                   // generic fallback
        // Class-based fallbacks
        'span.a-size-medium.a-color-base.a-text-normal',
        'span.a-size-base-plus.a-color-base.a-text-normal',
        '.a-link-normal .a-text-normal',
        'h2 .a-text-normal',
        '.a-size-medium.a-text-normal',
        '.a-color-base.a-text-normal'
      ],
      price: [
        // Whole price in .a-offscreen (screen-reader text = cleanest value)
        '.a-price .a-offscreen',
        'span.a-price > span.a-offscreen',
        '.a-price[data-a-color="base"] .a-offscreen',
        // Visible price parts as last resort
        '.a-price-whole',
        '.a-color-price'
      ],
      rating: [
        'span[aria-label*="out of 5 stars"]',
        'span[aria-label*="5 में से"]',                // Hindi variant on amazon.in
        '.a-icon-alt',
        'i.a-icon-star-small .a-icon-alt',
        'span.a-icon-alt'
      ],
      reviews: [
        'span.a-size-base.s-underline-text',
        'a[href*="#customerReviews"] span',
        '.a-row.a-size-small span.a-size-base',
        'span.a-size-base[aria-label]'
      ],
      discount: [
        '.a-badge-text',
        'span.a-badge-text',
        '.a-letter-space + span'
      ],
      link: [
        'h2 a.a-link-normal',
        'a.a-link-normal[href*="/dp/"]',
        '.s-no-outline',
        'a.a-link-normal.s-no-outline'
      ],
      image: [
        'img.s-image',
        '.s-image',
        '.s-product-image-container img'
      ]
    },

    // ── Flipkart (verified 2025 class names via live scraper data) ──────────
    // Confirmed classes: slAVV4=card, wjcEIp=title anchor, Nx9bqj=price,
    // UkUFwK=discount wrap, DMMoT0=product link, XQDdHH=rating
    flipkart: {
      container: [
        'div.slAVV4',              // ✅ 2025 verified — individual product card
        'div[data-id]',            // stable data attribute fallback
        'div.cPHDOP div',          // structural: children of grid row
        'div._75nlfW',             // legacy
        'div._1AtVbE'              // legacy
      ],
      title: [
        'a.wjcEIp',                // ✅ 2025 verified — title anchor text
        'a[title]',                // stable: anchor carries full title attribute
        '._4rR01T',                // legacy
        '.KzDlHZ',                 // 2024 fallback
        '.IRpwTa',
        '.s1Q9rs'
      ],
      price: [
        'div.Nx9bqj',              // ✅ 2025 verified
        '._30jeq3._1_WHN1',        // legacy
        '._30jeq3',                // legacy
        '._1_WHN1'                 // legacy
      ],
      rating: [
        'div.XQDdHH',              // ✅ 2025 verified
        'span.Y1HWO0',             // alternate 2025
        'div.ipqd2A',              // 2024
        '._3LWZlK',                // legacy
        'span._3LWZlK'             // legacy
      ],
      reviews: [
        'span.Wphh3N',             // ✅ 2025 verified
        'span._2_R_DZ',            // legacy
        'span._13vcOD'             // legacy
      ],
      discount: [
        'div.UkUFwK span',         // ✅ 2025 verified
        'div.UkUFwK',
        'div._3Ay6Sb span',        // legacy
        '._3xFhiH'                 // legacy
      ],
      link: [
        'a.DMMoT0',                // ✅ 2025 verified — main card link
        'a[href*="/p/itm"]',       // stable URL pattern
        'a[href*="/p/"]',          // stable URL pattern broad
        'a._1fQZEK',               // legacy
        'a.IRpwTa'                 // legacy
      ],
      image: [
        'img[src*="rukminim"]',    // ✅ stable — Flipkart CDN never changes
        'img[src*="flixcart"]',    // CDN alternate domain
        'img._396cs4',             // legacy
        'img._2r_T1I'              // legacy
      ]
    },

    // ── Myntra ───────────────────────────────────────────────────────────────
    myntra: {
      container: [
        'li.product-base',
        'li[class*="product-base"]',
        '.search-searchHit',
        'li.product-productMetaInfo'
      ],
      title: [
        '.product-brand',          // brand line
        'h3.product-brand',
        '.product-product',        // product name line
        'h4.product-product',
        '.product-productMetaInfo h3',
        '.product-productMetaInfo h4'
      ],
      price: [
        'span.product-discountedPrice',
        'div.product-price span',
        '.product-price',
        'span[class*="discountedPrice"]',
        'span[class*="price"]'
      ],
      rating: [
        'div.product-ratingsContainer span',
        '.product-ratingsContainer',
        'span[class*="rating"]'
      ],
      reviews: [
        '.product-ratingsCount',
        'span[class*="ratingsCount"]'
      ],
      discount: [
        'span.product-discountPercentage',
        'span[class*="discountPercentage"]'
      ],
      link: [
        'a[href*="/buy/"]',
        'a[class*="product-base"]',
        'li.product-base > a',
        'a[data-refreshpage]'
      ],
      image: [
        'img.img-responsive',
        'picture source',
        'img[src*="myntra"]',
        'img[class*="img"]'
      ]
    },

    // ── Meesho ────────────────────────────────────────────────────────────────
    // Meesho uses React + styled-components. CSS class names (sc-xxxx) change
    // on every build. We use STABLE structural + attribute selectors only.
    meesho: {
      container: [
        // Product cards always wrap a link to /product/ URLs
        // We use the link href as the stable hook, then walk up
        'div[class] a[href*="/product"]', // any div wrapping a product link
        'a[href*="/product"]',             // fallback: the anchor itself as root
        'div[data-testid="product-container"]',
        'div[data-testid="product-card"]'
      ],
      title: [
        // Title is always in a <p> — first or most prominent one in the card
        'p',                               // broadest: first <p> in card
        'p[class]',                        // styled-component <p>
        'h4', 'h3', 'h5'                   // occasional heading variant
      ],
      price: [
        // Price element always contains ₹ — we grab it by structural position
        // or look for the h5 that Meesho uses for price display
        'h5',                              // Meesho renders price in <h5>
        'span[class]',                     // styled span containing ₹
        'div[class] span'                  // nested span fallback
      ],
      rating: [
        'span[class]',                     // rating badge is a styled span
        'p[class]'                         // sometimes rendered as <p>
      ],
      reviews: [
        'span[class]',                     // review count span
        'p[class]'
      ],
      discount: [
        'span[class]',
        'p[class]'
      ],
      link: [
        'a[href*="/product"]',             // ✅ stable — Meesho product URLs
        'a[href*="/search"]',
        'a[href]'
      ],
      image: [
        'img[src*="images.meesho.com"]',   // ✅ stable — Meesho image CDN
        'img[src*="meesho"]',
        'img'
      ]
    },

    // ── Snapdeal ─────────────────────────────────────────────────────────────
    snapdeal: {
      container: [
        'li.product-tuple-listing',
        'div.product-tuple-listing',
        'div[class*="product-tuple"]',
        '.product-item'
      ],
      title: [
        'p.product-title',
        'p[class*="product-title"]',
        'div.product-desc-rating p'
      ],
      price: [
        'span.product-price',
        'span[class*="product-price"]',
        '.product-desc-rating span.lfloat'
      ],
      rating: [
        'div.filled-stars',
        'span.star-rating',
        'div[class*="star"]'
      ],
      reviews: [
        'p.product-rating-count',
        'span[class*="rating-count"]'
      ],
      discount: [
        'span.product-discount',
        'span[class*="discount"]'
      ],
      link: [
        'a[href*="/product/"]',
        'a.dp-widget-link',
        'div.product-tuple-listing > a'
      ],
      image: [
        'img[src*="rukmini"]',
        'img[src*="snapdeal"]',
        'img.product-image'
      ]
    }
  };

  // ─── Get Config ────────────────────────────────────────────────────────────
  let config  = null;
  let siteName = '';
  if      (isAmazon)   { config = SITE_CONFIG.amazon;   siteName = 'Amazon';   }
  else if (isFlipkart) { config = SITE_CONFIG.flipkart; siteName = 'Flipkart'; }
  else if (isMyntra)   { config = SITE_CONFIG.myntra;   siteName = 'Myntra';   }
  else if (isMeesho)   { config = SITE_CONFIG.meesho;   siteName = 'Meesho';   }
  else if (isSnapdeal) { config = SITE_CONFIG.snapdeal; siteName = 'Snapdeal'; }

  // ─── Main Scrape Function ──────────────────────────────────────────────────
  function scrapeProducts() {
    try {
      if (!config) {
        return {
          success: false,
          error: 'Navigate to a search results page on Amazon, Flipkart, Myntra, Meesho, or Snapdeal.'
        };
      }

      // Meesho needs its own DOM-traversal scraper
      if (isMeesho) return scrapeMeesho();

      // ── Standard selector-based scraper ───────────────────────────────────
      let containers = [];
      for (const sel of config.container) {
        try {
          const found = [...document.querySelectorAll(sel)];
          if (found.length > containers.length) containers = found;
          if (containers.length >= 10) break;
        } catch { /* bad selector, skip */ }
      }

      if (!containers.length) {
        return {
          success: false,
          error: 'No products found. Make sure you are on a search / listing page, not a product detail page.'
        };
      }

      const products = [];

      containers.forEach((card, idx) => {
        // Skip Amazon sponsored ad cards
        if (card.querySelector('.s-sponsored-label-info-icon')) return;
        // Skip Flipkart banner/ad slots (no price)
        if (card.querySelector('.lfYAc')) return;

        const rawTitle   = extractText(card, config.title);
        const rawPrice   = extractText(card, config.price);
        const rawRating  = extractRating(card, config.rating);
        const rawReviews = extractText(card, config.reviews) || '0';
        const rawDisc    = extractText(card, config.discount) || '';
        const rawLink    = extractLink(card, config.link);
        const rawImage   = extractImage(card, config.image);

        // Myntra: combine brand + product name for full title
        let title = rawTitle;
        if (isMyntra && config.title.length > 1) {
          const brand   = extractText(card, ['h3.product-brand', '.product-brand']);
          const product = extractText(card, ['h4.product-product', '.product-product']);
          if (brand && product) title = `${brand} ${product}`;
          else title = brand || product || rawTitle;
        }

        if (title) {
          products.push({
            id:        idx + 1,
            title:     cleanText(title),
            price:     cleanPrice(rawPrice),
            rating:    cleanRating(rawRating),
            reviews:   cleanText(rawReviews).replace(/[^\d,]/g, '').replace(/,/g, ''),
            discount:  cleanText(rawDisc),
            link:      resolveUrl(rawLink),
            image:     rawImage || '',
            site:      siteName,
            scrapedAt: new Date().toISOString()
          });
        }
      });

      if (!products.length) {
        return {
          success: false,
          error: 'Page loaded but no product data extracted. Selectors may need updating for this page variant.'
        };
      }

      return { success: true, data: products };

    } catch (err) {
      console.warn('[SmartScraper] Scrape error:', err.message);
      return { success: false, error: `Scrape failed: ${err.message}` };
    }
  }

  // ─── Meesho DOM-Traversal Scraper ─────────────────────────────────────────
  /**
   * Meesho uses React + styled-components. Class names like sc-abc123 change
   * on every build. Instead of classes, we:
   * 1. Find all product anchor links (href contains /product)
   * 2. Walk up the DOM to find the repeating card container
   * 3. Extract data using text-content heuristics (₹ = price, digits = rating)
   */
  function scrapeMeesho() {
    try {
      // Step 1: find all product links on the page
      const links = [...document.querySelectorAll('a[href*="/product"]')]
        .filter(a => {
          const href = a.href || '';
          // Must be a real product page, not navigation
          return href.includes('/product') && !href.endsWith('/products');
        });

      if (!links.length) {
        return {
          success: false,
          error: 'No Meesho products found. Open a search or category listing page first.'
        };
      }

      // Step 2: deduplicate — one card per unique product URL
      const seen    = new Set();
      const cards   = [];
      for (const a of links) {
        const url = a.href.split('?')[0]; // strip query params
        if (seen.has(url)) continue;
        seen.add(url);
        // Walk up to find the card root (the element that contains image + text)
        // Typically 3-5 levels up from the anchor
        let card = a;
        for (let i = 0; i < 6; i++) {
          const parent = card.parentElement;
          if (!parent || parent.tagName === 'BODY') break;
          // Stop when we find a container that has both an image and text nodes
          const hasImg = !!parent.querySelector('img');
          const pCount = parent.querySelectorAll('p, h4, h5').length;
          if (hasImg && pCount >= 1) { card = parent; break; }
          card = parent;
        }
        cards.push({ card, url, anchor: a });
      }

      if (!cards.length) {
        return { success: false, error: 'Could not identify Meesho product cards.' };
      }

      const products = [];

      cards.forEach(({ card, url, anchor }, idx) => {
        // ── Title: first meaningful <p> text (skip very short strings) ──
        let title = '';
        const paras = [...card.querySelectorAll('p')];
        for (const p of paras) {
          const t = p.textContent?.trim() || '';
          if (t.length > 10 && !t.includes('₹') && !/^\d+(\.\d+)?$/.test(t)) {
            title = t;
            break;
          }
        }
        // Fallback: anchor title attribute or text
        if (!title) title = anchor.getAttribute('title') || anchor.textContent?.trim() || '';
        if (!title || title.length < 3) return; // skip useless cards

        // ── Price: find element whose text contains ₹ ──
        let price = 'N/A';
        const allText = [...card.querySelectorAll('p, span, h5, div')];
        for (const el of allText) {
          const t = el.textContent?.trim() || '';
          if (t.startsWith('₹') && t.length < 15) { price = t; break; }
        }

        // ── Rating: find 1–5 digit float or integer standalone element ──
        let rating = 'N/A';
        for (const el of [...card.querySelectorAll('span, p')]) {
          const t = el.textContent?.trim() || '';
          if (/^[1-5](\.\d)?$/.test(t)) { rating = `${t} ★`; break; }
        }

        // ── Reviews: find (NNN) or NNN Ratings pattern ──
        let reviews = '';
        for (const el of [...card.querySelectorAll('span, p')]) {
          const t = el.textContent?.trim() || '';
          if (/\([\d,]+\)/.test(t)) { reviews = t.replace(/[^\d]/g, ''); break; }
          if (/[\d,]+\s*(ratings?|reviews?)/i.test(t)) {
            reviews = t.replace(/[^\d]/g, '');
            break;
          }
        }

        // ── Discount: find % off pattern ──
        let discount = '';
        for (const el of [...card.querySelectorAll('span, p')]) {
          const t = el.textContent?.trim() || '';
          if (/\d+%\s*off/i.test(t)) { discount = t; break; }
        }

        // ── Image ──
        const img = card.querySelector('img[src*="images.meesho.com"]')
                 || card.querySelector('img[src*="meesho"]')
                 || card.querySelector('img');
        const image = img?.src || img?.getAttribute('data-src') || '';

        products.push({
          id:        idx + 1,
          title:     cleanText(title),
          price:     cleanPrice(price),
          rating,
          reviews,
          discount,
          link:      url,
          image,
          site:      'Meesho',
          scrapedAt: new Date().toISOString()
        });
      });

      if (!products.length) {
        return { success: false, error: 'Meesho page loaded but no product data extracted.' };
      }

      return { success: true, data: products };

    } catch (err) {
      console.warn('[SmartScraper] Meesho scrape error:', err.message);
      return { success: false, error: `Meesho scrape failed: ${err.message}` };
    }
  }

  // ─── Extractors ────────────────────────────────────────────────────────────

  function extractText(parent, selectors) {
    for (const sel of selectors) {
      try {
        const el = parent.querySelector(sel);
        const text = el?.getAttribute('title') || el?.textContent;
        if (text?.trim()) return text.trim();
      } catch { /* bad selector, skip */ }
    }
    return '';
  }

  function extractRating(parent, selectors) {
    for (const sel of selectors) {
      try {
        const el = parent.querySelector(sel);
        if (!el) continue;
        const text = el.getAttribute('aria-label') || el.textContent;
        if (text?.trim()) return text.trim();
      } catch { /* skip */ }
    }
    return '';
  }

  function extractLink(parent, selectors) {
    for (const sel of selectors) {
      try {
        const el = parent.querySelector(sel);
        if (el?.href)                    return el.href;
        if (el?.getAttribute('href'))    return el.getAttribute('href');
      } catch { /* skip */ }
    }
    // Fallback: the card itself might be a link
    if (parent.tagName === 'A' && parent.href) return parent.href;
    return '';
  }

  function extractImage(parent, selectors) {
    for (const sel of selectors) {
      try {
        const el = parent.querySelector(sel);
        if (el?.src && !el.src.startsWith('data:'))     return el.src;
        if (el?.getAttribute('data-src'))               return el.getAttribute('data-src');
        if (el?.getAttribute('srcset')) {
          // Take first URL from srcset
          return el.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
        }
      } catch { /* skip */ }
    }
    return '';
  }

  // ─── Cleaners ──────────────────────────────────────────────────────────────

  function cleanText(str) {
    return str?.replace(/\s+/g, ' ').trim() || '';
  }

  function cleanPrice(str) {
    if (!str) return 'N/A';
    return str.replace(/\s+/g, '').trim() || 'N/A';
  }

  function cleanRating(str) {
    if (!str) return 'N/A';
    const match = str.match(/[\d.]+/);
    return match ? `${match[0]} ★` : str.trim();
  }

  function resolveUrl(href) {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    return `${window.location.origin}${href}`;
  }

  // ─── Message Listener ──────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'SCRAPE_PAGE') {
      sendResponse(scrapeProducts());
    }
    return true;
  });

  window.__smartScraper = { scrapeProducts };

})();
