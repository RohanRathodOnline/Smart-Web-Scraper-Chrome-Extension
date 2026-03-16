# Smart Web Scraper — Chrome Extension

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

A modern **Chrome Extension** that extracts product data from e-commerce pages and exports it as a **CSV file**.
Designed for quick product research, price comparison, and data collection directly from supported websites.

---

## Preview

### Extension Interface

<img width="2879" height="1541" alt="Smart Web Scraper Preview" src="https://github.com/user-attachments/assets/704e09a0-ca5f-4da2-9c2f-753218556d9a" />

---

## Features

- ✅ Scrape product data from the current page
- ✅ Extract product title, price, and rating
- ✅ Export data instantly to CSV
- ✅ Clean and minimal user interface
- ✅ Lightweight Chrome Extension (Manifest V3)

---

## Supported Websites

| Website   | Status      |
|-----------|-------------|
| Amazon    | ✅ Supported |
| Flipkart  | ✅ Supported |
| Myntra    | ✅ Supported |
| Meesho    | ✅ Supported |
| Snapdeal  | ✅ Supported |

---

## How It Works

1. Open a supported e-commerce product listing page
2. Click the **Smart Web Scraper** extension icon in your toolbar
3. Press **Scrape Products** to extract data from the page
4. Review the results inside the extension popup
5. Click **Export CSV** to download your scraped data

---

## 🚀 Installation

> **No Chrome Web Store required** — install directly from source in under a minute.

---

### Step 1 — Download the Project

**Option A — Clone with Git:**
```bash
git clone https://github.com/YOUR_USERNAME/smart-scraper.git
```

**Option B — Download ZIP:**

Click the green **Code** button on this page → **Download ZIP**, then extract it to a folder on your computer.

---

### Step 2 — Open Chrome Extensions

Paste the following into your Chrome address bar and press **Enter**:
```
chrome://extensions/
```

---

### Step 3 — Enable Developer Mode

In the **top-right corner** of the Extensions page, toggle **Developer Mode** to **ON**.

---

### Step 4 — Load the Extension

1. Click **Load unpacked**
2. Select the **extracted project folder**
3. Confirm the folder contains a `manifest.json` file ✅

---

### Step 5 — Pin to Toolbar

1. Click the 🧩 puzzle icon in the Chrome toolbar
2. Find **Smart Web Scraper**
3. Click the 📌 pin icon to keep it visible

---

🎉 **Done!** Open any product page and start scraping data to CSV instantly.

---

## Project Structure
```
smart-scraper/
│
├── icons/
├── utils/
│
├── background.js
├── content.js
├── csvExporter.js
│
├── popup.html
├── popup.js
├── styles.css
│
└── manifest.json
```

---

## Tech Stack

| Technology | Usage |
|---|---|
| JavaScript (ES6) | Core logic & scraping |
| HTML & CSS | Extension popup UI |
| Chrome Extension API | Manifest V3 integration |

---

## Future Improvements

- [ ] Multi-page scraping
- [ ] Additional e-commerce site support
- [ ] Data filtering and sorting
- [ ] Cloud data storage

---

## Author

**Rohan Rathod**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/rohanrathodofficial)

---

## License

This project is licensed under the [MIT License](LICENSE).
