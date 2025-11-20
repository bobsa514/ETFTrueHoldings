import { EtfProfileData } from '../types';

const BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper to delay execution to mitigate rate limiting slightly
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface CacheEntry {
  data: EtfProfileData;
  timestamp: number;
}

const getCache = (ticker: string): EtfProfileData | null => {
  const key = `av_etf_v4_${ticker.toUpperCase()}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const entry: CacheEntry = JSON.parse(stored);
    const now = Date.now();
    if (now - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    } else {
      localStorage.removeItem(key); // Expired
    }
  } catch (e) {
    localStorage.removeItem(key);
  }
  return null;
};

const setCache = (ticker: string, data: EtfProfileData) => {
  const key = `av_etf_v4_${ticker.toUpperCase()}`;
  const entry: CacheEntry = {
    data,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // Ignore quota exceeded
  }
};

export const fetchEtfProfile = async (ticker: string, apiKey: string): Promise<EtfProfileData> => {
  // 1. Check Cache
  const cachedData = getCache(ticker);
  if (cachedData) {
    return cachedData;
  }

  // 2. Fetch Profile
  const profileUrl = `${BASE_URL}?function=ETF_PROFILE&symbol=${ticker}&apikey=${apiKey}`;
  const response = await fetch(profileUrl);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // 3. Handle API Specific Errors
  if (data['Error Message']) {
    throw new Error("Ticker not found or invalid");
  }
  if (data['Note']) {
    throw new Error("API Limit Reached (25/day)"); // Standard free key limit
  }
  if (data['Information']) {
    throw new Error("Daily Limit Exceeded");
  }
  
  if (!data.holdings || !Array.isArray(data.holdings)) {
    // Sometimes empty holdings come back for obscure ETFs
    throw new Error(`No holding data available`);
  }

  // 4. Attempt to fetch ETF Name (Best Effort)
  let etfName = ticker;
  try {
    // Only try if we have enough remaining quota or randomness to avoid lockup
    // We skip this if we suspect we are tight on limits, but tough to know.
    await delay(250); 
    const searchUrl = `${BASE_URL}?function=SYMBOL_SEARCH&keywords=${ticker}&apikey=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (searchData.bestMatches && Array.isArray(searchData.bestMatches)) {
      const match = searchData.bestMatches.find((m: any) => m['1. symbol'] === ticker);
      if (match) {
        etfName = match['2. name'];
      }
    }
  } catch (e) {
    console.warn("Failed to fetch ETF name", e);
  }

  const finalData: EtfProfileData = {
    ...data,
    name: etfName
  };

  // 5. Save to Cache
  setCache(ticker, finalData);

  return finalData;
};