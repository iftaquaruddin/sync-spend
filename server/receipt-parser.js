// Receipt Text Parsing & Extraction Engine
function parseReceiptText(text) {
  if (!text || typeof text !== 'string') {
    return {
      title: 'Scanned Expense',
      amount: 0.0,
      category: 'General',
      date: new Date().toISOString().split('T')[0],
      rawText: ''
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const rawText = lines.join('\n');

  // 1. Merchant / Title Extraction
  let title = '';
  const knownMerchants = [
    { name: 'Starbucks', category: 'Food & Dining' },
    { name: 'McDonald\'s', category: 'Food & Dining' },
    { name: 'Chipotle', category: 'Food & Dining' },
    { name: 'Subway', category: 'Food & Dining' },
    { name: 'Burger King', category: 'Food & Dining' },
    { name: 'Dunkin', category: 'Food & Dining' },
    { name: 'Walmart', category: 'Groceries' },
    { name: 'Target', category: 'Shopping' },
    { name: 'Costco', category: 'Groceries' },
    { name: 'Trader Joe\'s', category: 'Groceries' },
    { name: 'Whole Foods', category: 'Groceries' },
    { name: 'Kroger', category: 'Groceries' },
    { name: 'Aldi', category: 'Groceries' },
    { name: 'Shell', category: 'Transport' },
    { name: 'Chevron', category: 'Transport' },
    { name: 'ExxonMobil', category: 'Transport' },
    { name: 'BP', category: 'Transport' },
    { name: 'Uber', category: 'Transport' },
    { name: 'Lyft', category: 'Transport' },
    { name: 'CVS Pharmacy', category: 'Health' },
    { name: 'Walgreens', category: 'Health' },
    { name: 'Best Buy', category: 'Shopping' },
    { name: 'Apple Store', category: 'Shopping' },
    { name: 'Home Depot', category: 'Shopping' },
    { name: 'Amazon', category: 'Shopping' }
  ];

  let detectedCategory = null;

  // Check known merchants in raw text
  for (const m of knownMerchants) {
    const regex = new RegExp(`\\b${m.name.replace("'", "['’]?")}\\b`, 'i');
    if (regex.test(rawText)) {
      title = m.name;
      detectedCategory = m.category;
      break;
    }
  }

  // If no known merchant, pick the first prominent line that isn't date/address/phone
  if (!title) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      // Skip if looks like date, phone number, address, or receipt header
      if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(line)) continue;
      if (/^(tel|phone|fax|invoice|receipt|welcome|order|store|cashier|terminal)/i.test(line)) continue;
      if (/^#|\d{3,}/.test(line) && line.length < 8) continue;
      if (/^\$?\d+(\.\d{2})?$/.test(line)) continue;

      // Clean line
      const cleanLine = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      if (cleanLine.length >= 3 && cleanLine.length <= 40) {
        title = cleanLine;
        break;
      }
    }
  }

  if (!title) {
    title = 'Scanned Receipt';
  }

  // 2. Amount Extraction
  let amount = 0.0;
  const amounts = [];

  // Look for total lines first: "TOTAL $12.34", "AMOUNT DUE 45.00", "BAL DUE: 9.99"
  const totalRegexes = [
    /(?:total|grand\s*total|amount\s*due|bal(?:ance)?\s*due|total\s*usd|net\s*total)[\s:]*[$€£]?\s*(\d+[.,]\d{2})\b/i,
    /(?:total|amount)[\s\S]{0,15}?[$€£]?\s*(\d+[.,]\d{2})\b/i,
    /[$€£]\s*(\d+[.,]\d{2})\b/
  ];

  for (const line of lines) {
    // Skip lines that indicate subtotal, tax, change, cash tender
    if (/(subtotal|sub\s*total|tax\b|change\s*due|cash\s*tender|savings)/i.test(line) && !/grand\s*total/i.test(line)) {
      continue;
    }

    for (const rgx of totalRegexes) {
      const match = line.match(rgx);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          amounts.push(val);
          break;
        }
      }
    }
  }

  if (amounts.length > 0) {
    // Pick the most likely total (frequently the largest in receipt summary lines)
    amount = Math.max(...amounts);
  } else {
    // General fallback: scan any standalone money format \b\d+\.\d{2}\b
    const genericMatches = rawText.match(/\b\d+\.\d{2}\b/g);
    if (genericMatches && genericMatches.length > 0) {
      const parsed = genericMatches.map(m => parseFloat(m)).filter(v => v > 0 && v < 10000);
      if (parsed.length > 0) {
        amount = Math.max(...parsed);
      }
    }
  }

  // 3. Date Extraction
  let extractedDate = '';
  // Check for YYYY-MM-DD
  const isoMatch = rawText.match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    extractedDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  } else {
    // Check for MM/DD/YYYY or MM/DD/YY
    const usMatch = rawText.match(/\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2}|\d{2})\b/);
    if (usMatch) {
      const m = usMatch[1].padStart(2, '0');
      const d = usMatch[2].padStart(2, '0');
      let y = usMatch[3];
      if (y.length === 2) y = '20' + y;
      extractedDate = `${y}-${m}-${d}`;
    }
  }

  if (!extractedDate) {
    extractedDate = new Date().toISOString().split('T')[0];
  }

  // 4. Category Classification
  if (!detectedCategory) {
    const textLower = rawText.toLowerCase();
    const categoriesMap = [
      {
        cat: 'Food & Dining',
        keywords: ['restaurant', 'cafe', 'coffee', 'bakery', 'pizza', 'burger', 'dining', 'bar', 'grill', 'deli', 'taco', 'breakfast', 'lunch', 'dinner', 'espresso', 'kitchen', 'bistro']
      },
      {
        cat: 'Groceries',
        keywords: ['supermarket', 'grocery', 'produce', 'market', 'mart', 'bakery', 'organic', 'foods', 'milk', 'bread', 'meat', 'fruit']
      },
      {
        cat: 'Transport',
        keywords: ['fuel', 'gas', 'oil', 'petrol', 'diesel', 'parking', 'uber', 'lyft', 'transit', 'subway', 'taxi', 'toll', 'auto', 'car wash']
      },
      {
        cat: 'Shopping',
        keywords: ['apparel', 'clothing', 'shoes', 'retail', 'electronics', 'fashion', 'hardware', 'book', 'mall', 'outlet', 'depot', 'store']
      },
      {
        cat: 'Bills & Utilities',
        keywords: ['utility', 'electric', 'water', 'energy', 'internet', 'broadband', 'telecom', 'mobile', 'bill', 'service fee', 'subscription']
      },
      {
        cat: 'Entertainment',
        keywords: ['cinema', 'movie', 'theatre', 'theater', 'ticket', 'concert', 'bowling', 'arcade', 'game', 'amusement']
      },
      {
        cat: 'Health',
        keywords: ['pharmacy', 'rx', 'drug', 'health', 'medical', 'clinic', 'dental', 'doctor', 'hospital', 'wellness', 'optical', 'care']
      },
      {
        cat: 'Travel',
        keywords: ['hotel', 'flight', 'airline', 'motel', 'resort', 'inn', 'stay', 'airfare', 'terminal', 'airport']
      }
    ];

    for (const rule of categoriesMap) {
      if (rule.keywords.some(kw => textLower.includes(kw))) {
        detectedCategory = rule.cat;
        break;
      }
    }
  }

  return {
    title: title.slice(0, 50),
    amount: parseFloat(amount.toFixed(2)),
    category: detectedCategory || 'General',
    date: extractedDate,
    rawText: rawText.slice(0, 500)
  };
}

module.exports = { parseReceiptText };
