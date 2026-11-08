# Running MM Residency on Google Sheets (Google Apps Script)

You can run this application directly inside your **Google Sheet** as an interactive Dialog, a Sidebar, or as a standalone Web App deployed from the Sheet.

---

## 3-Step Setup Guide

### Step 1: Open Google Sheets Apps Script
1. Open your Google Sheet (or create a new one: [sheets.new](https://sheets.new)).
2. In the top menu, click **Extensions** > **Apps Script**.

### Step 2: Add the 2 Files

#### File 1: `Code.gs`
1. Replace any default code in `Code.gs` with the contents of [`gas/Code.gs`](./Code.gs).
2. Click **Save** (💾 icon).

#### File 2: `Index.html`
1. In the Apps Script left sidebar, click the **+** (plus icon) next to **Files** and select **HTML**.
2. Name the file **`Index`** (so it becomes `Index.html`).
3. Generate the single-file bundle by running in your project terminal:
   ```bash
   npm run build:gas
   ```
4. Copy the entire contents of `dist-gas/index.html` and paste it into the `Index.html` file in Google Apps Script.
5. Click **Save** (💾 icon).

---

## How to Run It in Google Sheets

### Method A: Directly inside the Google Sheet (Menu / Dialog)
1. Reload your Google Sheet in your browser.
2. A new custom menu will appear at the top: **🍷 MM Residency Stock**.
3. Click:
   - **Open Stock Portal (Modal Dialog)** to open the full POS application inside a pop-up dialog.
   - **Open Stock Portal (Sidebar)** to open it docked on the right side of your spreadsheet.
   - **Initialize / Verify Sheet Tabs** to automatically generate the formatted tabs (`Stock_Ledger`, `Current_Stock`, `Daily_Sales`, `Purchases`, `Operations`, `Users`).

### Method B: Deploy as a Public Web App URL
1. In the Apps Script editor, click **Deploy** > **New Deployment** (top-right).
2. Click the gear icon (⚙️) next to *Select type* and select **Web app**.
3. Configure:
   - **Description**: `MM Residency Stock v2`
   - **Execute as**: `Me (your Google account)`
   - **Who has access**: `Anyone` (or `Anyone with Google account`)
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/.../exec`).
6. You can now open this URL on any phone, tablet, or PC to use the stock management system directly connected to your Google Sheet!
