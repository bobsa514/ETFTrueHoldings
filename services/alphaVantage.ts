import { EtfProfileData } from '../types';

const BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_DURATION = 24 * 60 * 60 * 1000;
const ERROR_CACHE_DURATION = 60 * 60 * 1000;

interface CacheEntry {
  data: EtfProfileData | null;
  isError: boolean;
  errorMessage?: string;
  timestamp: number;
}

const getCache = (ticker: string): { data: EtfProfileData | null; isError: boolean; errorMessage?: string } | null => {
  const key = `av_etf_v5_${ticker.toUpperCase()}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const entry: CacheEntry = JSON.parse(stored);
    const now = Date.now();
    const cacheAge = now - entry.timestamp;
    const validDuration = entry.isError ? ERROR_CACHE_DURATION : CACHE_DURATION;
    
    if (cacheAge < validDuration) {
      return { data: entry.data, isError: entry.isError, errorMessage: entry.errorMessage };
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {
    localStorage.removeItem(key);
  }
  return null;
};

const setCache = (ticker: string, data: EtfProfileData | null, isError: boolean, errorMessage?: string) => {
  const key = `av_etf_v5_${ticker.toUpperCase()}`;
  const entry: CacheEntry = {
    data,
    isError,
    errorMessage,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Cache quota exceeded');
  }
};

export const fetchEtfProfile = async (ticker: string, apiKey: string): Promise<EtfProfileData> => {
  const cached = getCache(ticker);
  if (cached) {
    if (cached.isError) {
      throw new Error(cached.errorMessage || 'Cached error');
    }
    return cached.data!;
  }

  const profileUrl = `${BASE_URL}?function=ETF_PROFILE&symbol=${ticker}&apikey=${apiKey}`;
  const response = await fetch(profileUrl);
  
  if (!response.ok) {
    const errorMsg = `HTTP error! status: ${response.status}`;
    setCache(ticker, null, true, errorMsg);
    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (data['Error Message']) {
    const errorMsg = 'Ticker not found or invalid';
    setCache(ticker, null, true, errorMsg);
    throw new Error(errorMsg);
  }
  if (data['Note'] || data['Information']) {
    const errorMsg = 'API Limit Reached (25/day)';
    setCache(ticker, null, true, errorMsg);
    throw new Error(errorMsg);
  }
  
  if (!data.holdings || !Array.isArray(data.holdings) || data.holdings.length === 0) {
    const errorMsg = 'No holding data available';
    setCache(ticker, null, true, errorMsg);
    throw new Error(errorMsg);
  }

  const finalData: EtfProfileData = {
    symbol: ticker.toUpperCase(),
    name: data.name || data.symbol || ticker,
    net_assets: data.net_assets || '0',
    portfolio_turnover: data.portfolio_turnover || '0',
    net_expense_ratio: data.net_expense_ratio || '0',
    dividend_yield: data.dividend_yield || '0',
    holdings: data.holdings,
    sectors: data.sectors || []
  };

  setCache(ticker, finalData, false);
  return finalData;
};

export const clearCache = (ticker?: string) => {
  if (ticker) {
    localStorage.removeItem(`av_etf_v5_${ticker.toUpperCase()}`);
  } else {
    Object.keys(localStorage)
      .filter(k => k.startsWith('av_etf_v5_'))
      .forEach(k => localStorage.removeItem(k));
  }
};

export const getApiCallsUsed = (): number => {
  return parseInt(localStorage.getItem('av_api_calls') || '0');
};

export const incrementApiCalls = () => {
  const current = getApiCallsUsed();
  localStorage.setItem('av_api_calls', String(current + 1));
};
