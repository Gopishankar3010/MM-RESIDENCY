/**
 * MM Residency – Stock Management & Multi-Counter Bar System
 * Google Apps Script Server Backend (Code.gs)
 *
 * For container-bound Apps Script inside Google Sheets:
 * Open Google Sheets -> Extensions -> Apps Script -> Paste this file as Code.gs
 */

var SCRIPT_PROP = PropertiesService.getScriptProperties();

/**
 * Serves the web app when accessed via the published URL
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('MM Residency – Stock Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/**
 * Adds a custom menu to Google Sheets when opened
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍷 MM Residency Stock')
    .addItem('Open Stock Portal (Modal Dialog)', 'openDialog')
    .addItem('Open Stock Portal (Sidebar)', 'openSidebar')
    .addSeparator()
    .addItem('Initialize / Verify Sheet Tabs', 'initSheetTabs')
    .addToUi();
}

/**
 * Opens the stock management UI as an interactive modal dialog
 */
function openDialog() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setWidth(1280)
    .setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, 'MM Residency – Stock Management');
}

/**
 * Opens the stock management UI in the Google Sheets sidebar
 */
function openSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('MM Residency – Stock');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Auto-creates all necessary Google Sheet tabs with formatted headers
 */
function initSheetTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tabs = [
    {
      name: 'Stock_Ledger',
      headers: ['Seq', 'Timestamp', 'Location', 'Product ID', 'Product Name', 'Delta (Btls)', 'Balance After', 'Ref Type', 'Ref ID', 'Approved By', 'Business Date']
    },
    {
      name: 'Current_Stock',
      headers: ['Product ID', 'Name', 'Category', 'Size (ml)', 'Case Pack', 'Price', 'Godown Stock', 'Normal Stock', 'AC Stock', 'Total Stock', 'Last Updated']
    },
    {
      name: 'Daily_Sales',
      headers: ['Report ID', 'Date', 'Counter', 'Status', 'Sold Qty', 'Total Sales Value', 'Recorded Amount', 'Cash Amount', 'UPI Amount', 'Difference', 'Cashier', 'Helper', 'Explanation', 'Submitted By', 'Submitted At']
    },
    {
      name: 'Purchases',
      headers: ['Batch ID', 'Date', 'Bill Date', 'Supplier', 'Invoice No', 'Permit No', 'Doc No', 'Product ID', 'Product Name', 'Qty (Btls)', 'Rate', 'SED', 'Discount', 'TCS %', 'Gross Amount', 'Net Amount', 'Status']
    },
    {
      name: 'Operations',
      headers: ['Operation ID', 'Type', 'Date', 'Name/Reason', 'Amount', 'Payment Mode', 'Room No', 'Location', 'Product ID', 'Qty', 'Status', 'Created By', 'Created At']
    },
    {
      name: 'Users',
      headers: ['User ID', 'Username', 'Full Name', 'Role', 'Counter', 'Active', 'Created At']
    }
  ];

  tabs.forEach(function(tab) {
    var sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      sheet = ss.insertSheet(tab.name);
      var headerRange = sheet.getRange(1, 1, 1, tab.headers.length);
      headerRange.setValues([tab.headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0f172a');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });

  SpreadsheetApp.getUi().alert('MM Residency Sheet Tabs initialized successfully!');
}

/**
 * Backend RPC: Read all rows from a specified sheet as JSON objects
 */
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var data = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j].toString().trim().replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      obj[key] = row[j];
    }
    data.push(obj);
  }
  return data;
}

/**
 * Backend RPC: Append record to a sheet
 */
function appendSheetRow(sheetName, rowArray) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    initSheetTabs();
    sheet = ss.getSheetByName(sheetName);
  }
  sheet.appendRow(rowArray);
  return { success: true };
}
