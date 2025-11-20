// Alpha Vantage Response Types

export interface AVHolding {
  symbol: string;
  description: string;
  weight: string; // API returns string like "0.1234"
  assets: string; // Asset Class (Equity, etc.)
}

export interface AVSector {
  sector: string;
  weight: string;
}

export interface EtfProfileData {
  symbol: string;
  name?: string; // Added to store full ETF name
  net_assets: string;
  portfolio_turnover: string;
  net_expense_ratio: string; // e.g., "0.002"
  dividend_yield: string;    // e.g., "0.0043"
  holdings: AVHolding[];
  sectors: AVSector[];
}

// App Internal Types

export interface ProcessedHolding {
  ticker: string;
  name: string;
  weightPercentage: number; // 0.05 for 5%
  value: number; // Calculated based on equity
}

export interface PortfolioItem {
  id: string;
  ticker: string;
  equity: number;
  data: EtfProfileData | null;
  isLoading: boolean;
  error: string | null;
}

export interface AggregatedHolding {
  ticker: string;
  name: string; // Full description
  assetClass: string; // Added for display
  totalValue: number;
  percentageOfPortfolio: number;
  [key: string]: any;
}

export interface AggregatedSector {
  name: string;
  value: number;
  percentage: number;
  [key: string]: any;
}