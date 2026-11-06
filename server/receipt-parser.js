// SyncSpend • Intelligent Bill & Receipt Parser (Store Name, Date & Amount)

/**
 * Converts ALL CAPS or messy text to Title Case
 */
function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length <= 1) return word.toUpperCase();
      // Keep acronyms like CVS, BP, BBQ uppercase
      if (['cvs', 'bp', 'ups', 'usps', 'fedex', 'at&t', 'h&m'].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Identifies OCR noise/garbage lines (random letters, isolated punctuation, crease marks)
 */
function isNoiseLine(line) {
  if (!line || line.length < 3) return true;
  const lettersOnly = line.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length < 3) return true;

  const words = line.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return true;

  // If majority of words are single characters (e.g. "4 3 i Tr 14 y 7 p"), it's an OCR visual artifact
  const singleCharWords = words.filter(w => w.length === 1);
  if (words.length >= 3 && (singleCharWords.length / words.length) > 0.4) {
    return true;
  }

  // If ratio of alphanumeric characters is too low
  const alphaNumCount = line.replace(/[^a-zA-Z0-9]/g, '').length;
  if ((alphaNumCount / line.length) < 0.6) {
    return true;
  }

  return false;
}

/**
 * Cleans extracted store name of store numbers, addresses, and common receipt header prefixes
 */
function cleanStoreName(name) {
  if (!name) return '';
  let cleaned = name.trim();

  // Strip prefixes like "Welcome to", "Store:", "Thank you for shopping at"
  cleaned = cleaned.replace(/^(welcome\s+to\s+|thank\s+you\s+for\s+shopping\s+at\s+|store\s*:\s*|merchant\s*:\s*)/i, '');

  // Strip trailing store/terminal identifiers like "#1234", "Store 482", "No. 12"
  cleaned = cleaned.replace(/\s*(#\s*\d+|store\s*#?\s*\d+|branch\s*#?\s*\d+|reg\s*#?\s*\d+|terminal\s*#?\s*\d+).*$/i, '');

  // Strip non-name symbols
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s&'.-]/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // If text is ALL CAPS, convert to clean Title Case
  if (cleaned.length > 2 && cleaned === cleaned.toUpperCase()) {
    cleaned = toTitleCase(cleaned);
  }

  return cleaned.slice(0, 50);
}

/**
 * Normalizes date strings (MM/DD/YYYY, YYYY-MM-DD, Month DD YYYY) into standard ISO YYYY-MM-DD
 */
function normalizeDate(rawText) {
  const currentYear = new Date().getFullYear();

  // 1. Check for standard ISO format YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  const isoMatch = rawText.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Check for text month formats: "Nov 06, 2026", "November 6 2026", "06 Nov 2026", "6-Nov-2026"
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const textMonthRegex1 = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[.\s]+([0-3]?\d)[,\s]+(20\d{2}|\d{2})\b/i;
  const tm1 = rawText.match(textMonthRegex1);
  if (tm1) {
    const m = monthMap[tm1[1].toLowerCase().slice(0, 3)];
    const d = tm1[2].padStart(2, '0');
    let y = tm1[3];
    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
  }

  const textMonthRegex2 = /\b([0-3]?\d)[-\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s]+(20\d{2}|\d{2})\b/i;
  const tm2 = rawText.match(textMonthRegex2);
  if (tm2) {
    const d = tm2[1].padStart(2, '0');
    const m = monthMap[tm2[2].toLowerCase().slice(0, 3)];
    let y = tm2[3];
    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
  }

  // 3. Check for US format MM/DD/YYYY or MM/DD/YY
  const usMatch = rawText.match(/\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2}|\d{2})\b/);
  if (usMatch) {
    const m = usMatch[1].padStart(2, '0');
    const d = usMatch[2].padStart(2, '0');
    let y = usMatch[3];
    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
  }

  // Fallback: today's date in local YYYY-MM-DD
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts store name, date, and final total amount from receipt text
 */
function parseReceiptText(text) {
  if (!text || typeof text !== 'string') {
    const today = new Date().toISOString().split('T')[0];
    return {
      storeName: 'Unknown Store',
      title: 'Unknown Store',
      amount: 0.0,
      date: today,
      confidence: 0
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const rawText = lines.join('\n');

  // ==========================================
  // 1. STORE NAME EXTRACTION
  // ==========================================
  let storeName = '';

  // Well-known store brands dictionary for instant high-confidence recognition
  const popularStores = [
    'Walmart', 'Target', 'Costco Wholesale', 'Costco', 'Trader Joe\'s', 'Whole Foods Market',
    'Whole Foods', 'Kroger', 'Aldi', 'Safeway', 'Publix', 'HEB', 'Wegmans', 'Sam\'s Club',
    'Starbucks', 'McDonald\'s', 'Subway', 'Chipotle', 'Dunkin', 'Burger King', 'Wendy\'s',
    'Taco Bell', 'Panera Bread', 'Dominos', 'Pizza Hut', 'KFC', 'Popeyes', 'Chick-fil-A',
    'Home Depot', 'Lowe\'s', 'Best Buy', 'Apple Store', 'Apple', 'IKEA', 'Walgreens', 'CVS Pharmacy',
    'CVS', 'Dollar Tree', 'Dollar General', 'Seven-Eleven', '7-Eleven', 'Shell', 'Chevron',
    'ExxonMobil', 'Exxon', 'Mobil', 'BP', 'Sunoco', 'Circle K', 'Speedway', 'Wawa',
    'Uber', 'Lyft', 'Amazon', 'Shell Oil'
  ];

  for (const store of popularStores) {
    const escaped = store.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace("'", "['’]?");
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(rawText)) {
      storeName = store;
      break;
    }
  }

  // If not matched in dictionary, inspect the top 8 lines of the bill
  if (!storeName) {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i];

      // Skip lines that represent dates, telephone, website, addresses, or generic receipts headers
      if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(line)) continue;
      if (/(tel|phone|fax|invoice|receipt|welcome|order|cashier|terminal|register|tax id|trn|gst|hst)/i.test(line) && line.length < 25) continue;
      if (/(www\.|\.com|\.net|\.org|http)/i.test(line)) continue;
      if (/^\d+\s+[a-zA-Z]+\s+(st|ave|blvd|rd|dr|lane|way|ct|hwy|pkwy)/i.test(line)) continue; // address
      if (/^[a-zA-Z\s]+,\s*[A-Z]{2}\s*\d{5}/i.test(line)) continue; // City, State Zip
      if (/^\$?\d+(\.\d{2})?$/.test(line)) continue; // numbers only
      if (isNoiseLine(line)) continue; // Skip OCR visual artifacts

      // Filter characters
      const candidate = line.replace(/[^a-zA-Z0-9\s&'.-]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (candidate.length >= 3 && candidate.length <= 45 && /[a-zA-Z]/.test(candidate) && !isNoiseLine(candidate)) {
        storeName = cleanStoreName(candidate);
        break;
      }
    }
  }

  if (!storeName) {
    storeName = 'Store Receipt';
  } else {
    storeName = cleanStoreName(storeName);
  }

  // ==========================================
  // 2. AMOUNT EXTRACTION
  // ==========================================
  let totalAmount = 0.0;
  const directTotalAmounts = [];
  const secondaryAmounts = [];

  // Patterns explicitly matching total lines:
  // "TOTAL $45.20", "GRAND TOTAL 120.00", "BAL DUE 15.50", "AMOUNT DUE $10.00", "TTL: 25.00"
  const totalKeywords = /(?:grand\s*total|total\s*usd|total\s*cad|net\s*total|amount\s*due|balance\s*due|bal\s*due|total\s*amount|final\s*total|\btotal\b|\bttl\b)/i;
  const negativeKeywords = /(subtotal|sub\s*total|tax\b|sales\s*tax|hst|gst|pst|\bcash\b|tendered|change\s*due|\bchange\b|you\s*saved|savings|discount|item\s*count)/i;

  for (const line of lines) {
    // If line is explicitly subtotal, tax, cash tendered, or change, ignore for grand total
    if (negativeKeywords.test(line) && !/grand\s*total/i.test(line)) {
      continue;
    }

    if (totalKeywords.test(line)) {
      // Find all currency numbers on this total line
      const matches = line.matchAll(/[$€£]?\s*(\d+[.,]\d{2})\b/g);
      for (const m of matches) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (!isNaN(val) && val > 0 && val < 50000) {
          directTotalAmounts.push(val);
        }
      }
    } else {
      // Collect general prices with currency symbol or standard decimal
      const matches = line.matchAll(/[$€£]\s*(\d+[.,]\d{2})\b/g);
      for (const m of matches) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (!isNaN(val) && val > 0 && val < 50000) {
          secondaryAmounts.push(val);
        }
      }
    }
  }

  if (directTotalAmounts.length > 0) {
    // Explicit total line: select the final total amount
    totalAmount = Math.max(...directTotalAmounts);
  } else if (secondaryAmounts.length > 0) {
    // Fallback to highest amount found on receipt
    totalAmount = Math.max(...secondaryAmounts);
  } else {
    // Last resort fallback: any decimal number \d+\.\d{2}
    const genericMatches = rawText.match(/\b\d+\.\d{2}\b/g);
    if (genericMatches) {
      const candidates = genericMatches
        .map(v => parseFloat(v))
        .filter(v => v > 0 && v < 50000);
      if (candidates.length > 0) {
        totalAmount = Math.max(...candidates);
      }
    }
  }

  // ==========================================
  // 3. DATE EXTRACTION
  // ==========================================
  const extractedDate = normalizeDate(rawText);

  // Confidence calculation based purely on Store Name, Date, and Amount
  let confidenceScore = 40;
  if (storeName && storeName !== 'Store Receipt') confidenceScore += 25;
  if (totalAmount > 0) confidenceScore += 25;
  if (extractedDate) confidenceScore += 10;

  return {
    storeName,
    title: storeName, // Alias for backward compatibility
    date: extractedDate,
    amount: parseFloat(totalAmount.toFixed(2)),
    confidence: confidenceScore,
    rawText: rawText.slice(0, 500)
  };
}

module.exports = { parseReceiptText, normalizeDate, cleanStoreName };
