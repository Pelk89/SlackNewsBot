const fs = require('fs');
const path = require('path');

/**
 * CSV Parser for keyword management
 * Parses and validates CSV files with keyword data
 */
class CSVParser {
  /**
   * Parse CSV file and return keyword objects
   * @param {string} csvPath - Path to CSV file
   * @returns {object} - { keywords: array, stats: object }
   */
  parse(csvPath) {
    // 1. Read file
    let content;
    try {
      content = fs.readFileSync(csvPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`CSV file not found: ${csvPath}`);
      }
      throw err;
    }

    // 2. Parse CSV
    const lines = content.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = this._parseCSVLine(lines[0]);

    // Validate headers
    this._validateHeaders(headers);

    // 3. Parse rows
    const keywords = [];
    const seen = new Set();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue; // Skip empty lines

      const values = this._parseCSVLine(line);
      const row = this._createKeywordObject(headers, values, i + 1);

      // Validate row
      this._validateRow(row, i + 1);

      // Check duplicates (case-insensitive)
      const keyLower = row.keyword.toLowerCase();
      if (seen.has(keyLower)) {
        // Find original line number
        const originalIdx = keywords.findIndex(k => k.keyword.toLowerCase() === keyLower);
        const originalLine = originalIdx + 2; // +1 for header, +1 for 1-based indexing
        throw new Error(
          `Duplicate keyword '${row.keyword}' at lines ${originalLine} and ${i + 1}`
        );
      }
      seen.add(keyLower);

      keywords.push(row);
    }

    if (keywords.length === 0) {
      throw new Error('No valid keywords found in CSV');
    }

    return {
      keywords,
      stats: this._calculateStats(keywords)
    };
  }

  /**
   * Parse a single CSV line, handling quoted values
   * @param {string} line - CSV line
   * @returns {array} - Array of values
   */
  _parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  }

  /**
   * Validate CSV headers
   * @param {array} headers - Header row values
   */
  _validateHeaders(headers) {
    const required = ['keyword', 'tier', 'language'];
    const missing = required.filter(h => !headers.includes(h));

    if (missing.length > 0) {
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }
  }

  /**
   * Create keyword object from CSV row
   * @param {array} headers - Header names
   * @param {array} values - Row values
   * @param {number} lineNum - Line number (for errors)
   * @returns {object} - Keyword object
   */
  _createKeywordObject(headers, values, lineNum) {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });

    // Convert tier to number
    obj.tier = parseInt(obj.tier, 10);

    return obj;
  }

  /**
   * Validate a keyword row
   * @param {object} row - Keyword object
   * @param {number} lineNum - Line number (for errors)
   */
  _validateRow(row, lineNum) {
    // Required fields
    if (!row.keyword || row.keyword.trim() === '') {
      throw new Error(`Empty keyword at line ${lineNum}`);
    }

    // Valid tier
    if (![1, 2, 3].includes(row.tier)) {
      throw new Error(
        `Invalid tier '${row.tier}' for keyword '${row.keyword}' at line ${lineNum} (must be 1, 2, or 3)`
      );
    }

    // Valid language
    if (!['en', 'de'].includes(row.language)) {
      throw new Error(
        `Invalid language '${row.language}' for keyword '${row.keyword}' at line ${lineNum} (must be 'en' or 'de')`
      );
    }
  }

  /**
   * Calculate statistics for parsed keywords
   * @param {array} keywords - Array of keyword objects
   * @returns {object} - Statistics
   */
  _calculateStats(keywords) {
    return {
      total: keywords.length,
      tier1: keywords.filter(k => k.tier === 1).length,
      tier2: keywords.filter(k => k.tier === 2).length,
      tier3: keywords.filter(k => k.tier === 3).length
    };
  }
}

module.exports = CSVParser;
