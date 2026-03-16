/**
 * popup.js – Smart Web Scraper
 * Orchestrates: scraping, CSV export, backend API calls, and UI rendering.
 *
 * FIXED:
 *  - newProducts was never pushed into scrapedProducts (main data-loss bug)
 *  - pagesScraped was never incremented
 *  - Import path corrected (was ./utils/csvExporter.js → ./csvExporter.js)
 */

import { convertToCSV, downloadCSV } from './csvExporter.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_PRODUCTS = 500;

// ─── DOM References ───────────────────────────────────────────────────────────
const statusBar      = document.getElementById('statusBar');
const statusMsg      = document.getElementById('statusMsg');
const siteBadge      = document.getElementById('siteBadge');
const siteLabel      = document.getElementById('siteLabel');
const totalCount     = document.getElementById('totalCount');
const pageCount      = document.getElementById('pageCount');
const sentCount      = document.getElementById('sentCount');
const btnScrape      = document.getElementById('btnScrape');
const btnCSV         = document.getElementById('btnCSV');
const btnSend        = document.getElementById('btnSend');
const btnClear       = document.getElementById('btnClear');
const btnSaveApi     = document.getElementById('btnSaveApi');
const apiUrlInput    = document.getElementById('apiUrl');
const emptyState     = document.getElementById('emptyState');
const previewSection = document.getElementById('previewSection');
const previewCount   = document.getElementById('previewCount');
const tableBody      = document.getElementById('tableBody');
const supportedPills = [...document.querySelectorAll('.supported-pill[data-site]')];

// ─── State ────────────────────────────────────────────────────────────────────
let scrapedProducts = [];
let pagesScraped    = 0;
let sentTotal       = 0;

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  const { savedApiUrl } = await chrome.storage.local.get('savedApiUrl');
  if (savedApiUrl) {
    apiUrlInput.value = savedApiUrl;
    btnSend.disabled  = false;
  }

  const { cachedProducts, cachedPages, cachedSent } =
    await chrome.storage.local.get(['cachedProducts', 'cachedPages', 'cachedSent']);

  if (cachedProducts?.length) {
    scrapedProducts = cachedProducts;
    pagesScraped    = cachedPages || 0;
    sentTotal       = cachedSent  || 0;
    updateStats();
    renderTable();
    setStatus('success', `Restored ${scrapedProducts.length} products from cache`);
    setButtonState(true);
  }

  detectSite();
})();

// ─── Detect Site ──────────────────────────────────────────────────────────────
async function detectSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url   = tab?.url || '';

    const SITES = [
      { key: 'amazon',   test: u => u.includes('amazon'),   label: 'Amazon'   },
      { key: 'flipkart', test: u => u.includes('flipkart'), label: 'Flipkart' },
      { key: 'myntra',   test: u => u.includes('myntra'),   label: 'Myntra'   },
      { key: 'meesho',   test: u => u.includes('meesho'),   label: 'Meesho'   },
      { key: 'snapdeal', test: u => u.includes('snapdeal'), label: 'Snapdeal' },
    ];

    const match = SITES.find(s => s.test(url));
    updateSupportedSites(match?.key || null);
    if (match) {
      siteBadge.className   = `site-chip ${match.key}`;
      siteLabel.textContent = match.label;
    } else {
      siteBadge.className   = 'site-chip unsupported';
      siteLabel.textContent = 'Not supported';
    }
  } catch {
    updateSupportedSites(null);
    siteLabel.textContent = 'Unknown';
  }
}

function updateSupportedSites(activeSiteKey) {
  supportedPills.forEach((pill) => {
    const key = pill.dataset.site;
    pill.style.display = activeSiteKey && key === activeSiteKey ? 'none' : 'inline-flex';
  });
}

// ─── Scrape Button ────────────────────────────────────────────────────────────
btnScrape.addEventListener('click', async () => {
  setStatus('running', 'Scraping products…');
  btnScrape.disabled = true;
  btnScrape.classList.add('loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.runtime.sendMessage({
      action: 'SCRAPE_TAB',
      tabId:  tab.id
    });

    if (response?.success && response.data?.length) {
      // ── Deduplication ──
      const existingUrls = new Set(scrapedProducts.map(p => p.link).filter(Boolean));
      const newProducts  = response.data.filter(p => !p.link || !existingUrls.has(p.link));
      const dupCount     = response.data.length - newProducts.length;

      // ── BUG FIX: actually add new products to the array ──
      scrapedProducts.push(...newProducts);
      pagesScraped += 1;   // BUG FIX: increment page counter

      // ── Storage cap ──
      let capped = false;
      if (scrapedProducts.length > MAX_PRODUCTS) {
        scrapedProducts = scrapedProducts.slice(-MAX_PRODUCTS);
        capped = true;
      }

      updateStats();
      renderTable();

      let msg = dupCount > 0
        ? `Scraped ${newProducts.length} new products (${dupCount} duplicate${dupCount > 1 ? 's' : ''} skipped)`
        : `Scraped ${newProducts.length} products`;
      if (capped) msg += ` — limit reached, oldest trimmed`;
      setStatus(newProducts.length ? 'success' : 'idle', msg);
      setButtonState(true);

      await chrome.storage.local.set({
        cachedProducts: scrapedProducts,
        cachedPages:    pagesScraped,
        cachedSent:     sentTotal
      });

      if (scrapedProducts.length > MAX_PRODUCTS * 0.8 && !capped) {
        setTimeout(() => setStatus('idle', `⚠ ${scrapedProducts.length}/${MAX_PRODUCTS} — export CSV soon`), 2500);
      }
    } else {
      setStatus('error', response?.error || 'No products found — try a search results page');
    }
  } catch (err) {
    setStatus('error', `Something went wrong: ${err.message}`);
  } finally {
    btnScrape.disabled = false;
    btnScrape.classList.remove('loading');
  }
});

// ─── CSV Export ───────────────────────────────────────────────────────────────
btnCSV.addEventListener('click', () => {
  if (!scrapedProducts.length) return;
  const csv = convertToCSV(scrapedProducts);
  downloadCSV(csv, `products_${Date.now()}.csv`);
  setStatus('success', `Exported ${scrapedProducts.length} products to CSV`);
});

// ─── Send to Backend ──────────────────────────────────────────────────────────
btnSend.addEventListener('click', async () => {
  if (!scrapedProducts.length) return;

  const rawUrl = apiUrlInput.value.trim();
  if (!rawUrl) {
    setStatus('idle', 'Enter a backend URL and click 💾 to save it first');
    return;
  }

  const apiUrl = rawUrl.replace(/\/$/, '');
  setStatus('sending', 'Sending to backend…');
  btnSend.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action:   'SEND_TO_API',
      endpoint: `${apiUrl}/api/save-products`,
      data:     scrapedProducts
    });

    if (response?.success) {
      sentTotal += scrapedProducts.length;
      await chrome.storage.local.set({ cachedSent: sentTotal });
      updateStats();
      setStatus('success', `Sent ${scrapedProducts.length} products to server`);
    } else {
      const msg = response?.error || 'Backend unreachable';
      setStatus('error',
        msg.includes('not configured') ? 'Backend not configured' :
        msg.includes('unreachable')    ? 'Server not reachable — is it running?' : msg);
    }
  } catch {
    setStatus('error', 'Could not reach server — is it running?');
  } finally {
    btnSend.disabled = false;
  }
});

// ─── Clear Data ───────────────────────────────────────────────────────────────
btnClear.addEventListener('click', async () => {
  scrapedProducts = [];
  pagesScraped    = 0;
  sentTotal       = 0;
  await chrome.storage.local.remove(['cachedProducts', 'cachedPages', 'cachedSent']);
  updateStats();
  tableBody.innerHTML          = '';
  previewSection.style.display = 'none';
  emptyState.style.display     = 'flex';
  setStatus('idle', 'All data cleared');
  setButtonState(false);
});

// ─── Save API URL ─────────────────────────────────────────────────────────────
btnSaveApi.addEventListener('click', async () => {
  const url = apiUrlInput.value.trim();
  if (!url) return;
  await chrome.storage.local.set({ savedApiUrl: url });
  if (scrapedProducts.length) btnSend.disabled = false;

  btnSaveApi.classList.add('saved');
  btnSaveApi.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  setTimeout(() => {
    btnSaveApi.classList.remove('saved');
    btnSaveApi.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 3 7 8 15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }, 1800);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(type, msg) {
  statusBar.className = 'toast';
  if (type !== 'idle') statusBar.classList.add(`is-${type}`);
  statusMsg.textContent = msg;
}

function updateStats() {
  animateValue(totalCount, parseInt(totalCount.textContent) || 0, scrapedProducts.length, 600);
  animateValue(pageCount,  parseInt(pageCount.textContent)  || 0, pagesScraped,           600);
  if (sentCount) sentCount.textContent = sentTotal;
}

function animateValue(obj, start, end, duration) {
  if (start === end) { obj.textContent = end; return; }
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease     = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    obj.textContent = Math.floor(ease * (end - start) + start);
    if (progress < 1) window.requestAnimationFrame(step);
    else obj.textContent = end;
  };
  window.requestAnimationFrame(step);
}

function setButtonState(hasData) {
  btnCSV.disabled   = !hasData;
  btnClear.disabled = !hasData;
  const hasUrl      = !!apiUrlInput.value.trim();
  btnSend.disabled  = !(hasData && hasUrl);
}

function renderTable() {
  if (!scrapedProducts.length) return;
  emptyState.style.display     = 'none';
  previewSection.style.display = 'block';
  previewCount.textContent     = `${scrapedProducts.length} items`;
  tableBody.innerHTML          = '';

  // Show last 30 rows
  const preview = scrapedProducts.slice(-30);
  preview.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${scrapedProducts.length - preview.length + i + 1}</td>
      <td title="${escHtml(p.title)}">${escHtml(p.title?.slice(0, 32) || '—')}</td>
      <td class="td-price">${escHtml(p.price  || 'N/A')}</td>
      <td class="td-rating">${escHtml(p.rating || '—')}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
