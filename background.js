/**
 * background.js – Smart Web Scraper
 * Service Worker (Manifest V3).
 * Acts as the message bus between popup ↔ content script ↔ backend API.
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?amazon\.(com|in|co\.uk|ca|de|fr|it|es|co\.jp|com\.au)/,
  /^https:\/\/(www\.)?flipkart\.com/
];

// ─── Lifecycle ────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[SmartScraper] Extension installed.');
    chrome.storage.local.set({ sentCount: 0, totalScraped: 0 });
  }
});

// ─── Message Router ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;

  switch (action) {
    // ── Scrape the active tab via content script ──
    case 'SCRAPE_TAB':
      handleScrapeTab(message.tabId, sendResponse);
      break;

    // ── Send scraped data to the backend API ──
    case 'SEND_TO_API':
      handleSendToAPI(message.endpoint, message.data, sendResponse);
      break;


    default:
      sendResponse({ success: false, error: `Unknown action: ${action}` });
  }

  return true; // Keep message channel open for async handlers
});

// ─── Handler: Scrape Tab ──────────────────────────────────────────────────────
/**
 * Injects the content script (if needed) and triggers a SCRAPE_PAGE message.
 * Returns the structured product array to the popup.
 */
async function handleScrapeTab(tabId, sendResponse) {
  try {
    if (!tabId) throw new Error('No active tab ID provided');

    // Ensure content script is injected (safe to call if already injected)
    await chrome.scripting.executeScript({
      target: { tabId },
      files:  ['content.js']
    }).catch(() => {
      // Already injected – ignore the error
    });

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tabId, { action: 'SCRAPE_PAGE' });
    sendResponse(response || { success: false, error: 'Content script returned no data' });

  } catch (err) {
    const msg = err.message?.includes('Failed to fetch')
      ? 'Content script error — make sure you are on a supported page'
      : err.message;
    console.warn('[SmartScraper] Scrape tab error:', err);
    sendResponse({ success: false, error: msg });
  }
}

// ─── Handler: Send to API ───────────────────────────────────────────────────
/**
 * POSTs the scraped products array to the Express backend.
 * Backend is fully optional — returns a graceful message if not configured.
 */
async function handleSendToAPI(endpoint, data, sendResponse) {
  // ─ Guard: no endpoint configured ─
  if (!endpoint) {
    sendResponse({ success: false, error: 'Backend not configured — enter a URL in the popup and click 💾' });
    return;
  }

  // ─ Guard: nothing to send ─
  if (!data?.length) {
    sendResponse({ success: false, error: 'No data to send' });
    return;
  }

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ products: data })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    sendResponse({ success: true, result: json });

  } catch (err) {
    // console.warn (not error) so Chrome doesn’t show it in chrome://extensions errors
    const isNetworkErr = err.message?.includes('Failed to fetch') ||
                         err.message?.includes('NetworkError') ||
                         err.message?.includes('ERR_CONNECTION_REFUSED');
    const userMsg = isNetworkErr
      ? 'Backend unreachable — make sure the server is running'
      : err.message;
    console.warn('[SmartScraper] Send to API error:', err.message);
    sendResponse({ success: false, error: userMsg });
  }
}
