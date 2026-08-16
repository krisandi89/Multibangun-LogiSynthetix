import { DEFAULT_DATABASE } from '../data/defaultDatabase';
import { PRICING_PARAMETERS } from '../data/pricingRules';

const STORAGE_KEYS = {
  DATABASE: 'mb_logisynthetix_database',
  QUOTATIONS: 'mb_logisynthetix_quotations',
  SETTINGS: 'mb_logisynthetix_settings'
};

/**
 * Load active database (Custom or Default)
 */
export function getActiveDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DATABASE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.geosynthetics && parsed.logistics_fleet) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to parse saved database:", err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
}

/**
 * Save customized database
 */
export function saveActiveDatabase(dbData) {
  try {
    localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(dbData, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to save database:", err);
    return false;
  }
}

/**
 * Reset database to factory default
 */
export function resetDatabaseToDefault() {
  localStorage.removeItem(STORAGE_KEYS.DATABASE);
  return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
}

/**
 * Load saved quotations history
 */
export function getSavedQuotations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error("Failed to load quotations:", err);
  }
  return [];
}

/**
 * Save new quotation
 */
export function saveQuotation(quotation) {
  try {
    const list = getSavedQuotations();
    const newEntry = {
      id: quotation.id || `EST-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      ...quotation
    };
    list.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(list));
    return newEntry;
  } catch (err) {
    console.error("Failed to save quotation:", err);
    return null;
  }
}

/**
 * Delete a quotation
 */
export function deleteQuotation(id) {
  try {
    const list = getSavedQuotations().filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(list));
    return list;
  } catch (err) {
    console.error("Failed to delete quotation:", err);
    return [];
  }
}

/**
 * Load user settings
 */
export function getUserSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        geminiApiKey: parsed.geminiApiKey || "",
        googleMapsApiKey: parsed.googleMapsApiKey || "",
        pricing: {
          ...PRICING_PARAMETERS,
          ...(parsed.pricing || {}),
          fuel_price_per_liter: parsed.pricing?.fuel_price_per_liter === 15500 ? 6800 : (parsed.pricing?.fuel_price_per_liter || 6800)
        }
      };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
  return {
    geminiApiKey: "",
    googleMapsApiKey: "",
    pricing: { ...PRICING_PARAMETERS }
  };
}

/**
 * Save user settings
 */
export function saveUserSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error("Failed to save settings:", err);
    return false;
  }
}
