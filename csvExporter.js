/**
 * utils/csvExporter.js – Smart Web Scraper
 * Converts product JSON arrays to CSV and triggers file download.
 * Supports large datasets via chunked string building.
 */

/**
 * Column definitions: { key, label }
 * Adjust order / labels here without touching the rest of the code.
 */
const COLUMNS = [
  { key: 'id',        label: 'ID'         },
  { key: 'title',     label: 'Title'      },
  { key: 'price',     label: 'Price'      },
  { key: 'discount',  label: 'Discount'   },
  { key: 'rating',    label: 'Rating'     },
  { key: 'reviews',   label: 'Reviews'    },
  { key: 'site',      label: 'Site'       },
  { key: 'link',      label: 'URL'        },
  { key: 'image',     label: 'Image URL'  },
  { key: 'scrapedAt', label: 'Scraped At' }
];

/**
 * Escape a single CSV cell value.
 *  - Wraps in quotes if value contains comma, quote, or newline
 *  - Doubles any internal quotes (RFC 4180)
 * @param {*} value
 * @returns {string}
 */
function escapeCell(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of product objects to a CSV string.
 * @param {Object[]} products
 * @param {Array}    columns   – optional column override
 * @returns {string} CSV content
 */
export function convertToCSV(products, columns = COLUMNS) {
  if (!products?.length) return '';

  const rows = [];

  // Header row
  rows.push(columns.map(c => escapeCell(c.label)).join(','));

  // Data rows
  for (const product of products) {
    const row = columns.map(col => escapeCell(product[col.key]));
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}

/**
 * Trigger a CSV file download in the browser.
 * Uses the chrome.downloads API when available (extension context),
 * falls back to a Blob + anchor click (regular web context).
 *
 * @param {string} csvContent  – full CSV string
 * @param {string} filename    – desired file name (e.g. "products_123.csv")
 */
export function downloadCSV(csvContent, filename = 'products.csv') {
  const BOM   = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob  = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);

  // Prefer chrome.downloads in extension context
  if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
    chrome.downloads.download(
      { url, filename, saveAs: false },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.warn('[CSVExporter] chrome.downloads failed, falling back to anchor');
          anchorDownload(url, filename);
        }
        // Revoke after short delay
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    );
  } else {
    anchorDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/**
 * Fallback: create a hidden <a> and click it.
 */
function anchorDownload(url, filename) {
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generate a timestamped filename.
 * @param {string} prefix
 * @param {string} ext
 * @returns {string}
 */
export function generateFilename(prefix = 'products', ext = 'csv') {
  const now = new Date();
  const ts  = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${ts}.${ext}`;
}
