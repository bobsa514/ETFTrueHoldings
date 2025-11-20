import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Wallet, AlertCircle, PieChart as PieChartIcon, Github, Activity, ArrowUpRight, TrendingUp, Percent, DollarSign, Info } from 'lucide-react';
import { PortfolioItem, AggregatedHolding, AggregatedSector } from './types';
import { fetchEtfProfile } from './services/alphaVantage';
import { Button } from './components/Button';
import { AnalysisCharts } from './components/AnalysisCharts';

function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('av_api_key') || '');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newEquity, setNewEquity] = useState<string>('10000');
  
  // Derived State: Portfolio Statistics
  const stats = useMemo(() => {
    let totalEquity = 0;
    let weightedExpense = 0; // This accumulates (Ratio * Equity) = Total Dollar Cost
    let weightedYield = 0;   // This accumulates (Yield * Equity) = Total Dollar Dividend
    let validItemsCount = 0;

    portfolio.forEach(item => {
      if (item.data && !item.error) {
        totalEquity += item.equity;
        validItemsCount++;

        // Parse strings like "0.002" to numbers
        const expenseRatio = parseFloat(item.data.net_expense_ratio) || 0;
        const divYield = parseFloat(item.data.dividend_yield) || 0;

        weightedExpense += expenseRatio * item.equity;
        weightedYield += divYield * item.equity;
      }
    });

    return {
      totalEquity,
      avgExpenseRatio: totalEquity > 0 ? (weightedExpense / totalEquity) : 0,
      avgDividendYield: totalEquity > 0 ? (weightedYield / totalEquity) : 0,
      totalAnnualExpense: weightedExpense,
      totalAnnualDividend: weightedYield,
      hasData: validItemsCount > 0
    };
  }, [portfolio]);

  const aggregatedData = useMemo(() => {
    const holdingMap = new Map<string, { value: number, name: string, assetClass: string }>();
    const sectorMap = new Map<string, number>();

    portfolio.forEach(item => {
      // Skip items with errors or no data (bypass)
      if (item.data && item.data.holdings && !item.error) {
        
        // Aggregate Holdings
        item.data.holdings.forEach(holding => {
          let symbol = holding.symbol;
          let description = holding.description;

          // Normalize N/A or null symbols to CASH
          if (!symbol || symbol === 'N/A' || symbol === '-') {
            symbol = 'CASH';
            description = 'Cash / Other Assets';
          }

          const weight = parseFloat(holding.weight); // e.g. 0.07 for 7%
          const holdingValue = item.equity * weight;
          
          const current = holdingMap.get(symbol) || { value: 0, name: description, assetClass: holding.assets };
          holdingMap.set(symbol, { 
            value: current.value + holdingValue,
            name: description || current.name,
            assetClass: holding.assets || current.assetClass
          });
        });

        // Aggregate Sectors
        if (item.data.sectors) {
          item.data.sectors.forEach(sector => {
            const weight = parseFloat(sector.weight);
            const sectorValue = item.equity * weight;
            
            const currentVal = sectorMap.get(sector.sector) || 0;
            sectorMap.set(sector.sector, currentVal + sectorValue);
          });
        }
      }
    });

    // Convert Maps to Sorted Arrays
    const holdings: AggregatedHolding[] = Array.from(holdingMap.entries())
      .map(([ticker, data]) => ({
        ticker,
        name: data.name,
        assetClass: data.assetClass,
        totalValue: data.value,
        percentageOfPortfolio: stats.totalEquity > 0 ? (data.value / stats.totalEquity) * 100 : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const sectors: AggregatedSector[] = Array.from(sectorMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: stats.totalEquity > 0 ? (value / stats.totalEquity) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    return { holdings, sectors };
  }, [portfolio, stats.totalEquity]);

  // Handlers
  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('av_api_key', key);
  };

  const handleAddEtf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker || !newEquity) return;
    if (portfolio.length >= 50) {
      alert("Maximum 50 ETFs allowed.");
      return;
    }

    const id = Date.now().toString();
    const newItem: PortfolioItem = {
      id,
      ticker: newTicker.toUpperCase(),
      equity: parseFloat(newEquity),
      data: null,
      isLoading: true,
      error: null,
    };

    setPortfolio(prev => [...prev, newItem]);
    setNewTicker('');
    
    // Fetch Data
    try {
      const data = await fetchEtfProfile(newItem.ticker, apiKey);
      setPortfolio(prev => prev.map(item => 
        item.id === id ? { ...item, data, isLoading: false } : item
      ));
    } catch (err: any) {
      setPortfolio(prev => prev.map(item => 
        item.id === id ? { ...item, error: err.message || "Failed to fetch", isLoading: false } : item
      ));
    }
  };

  const removeEtf = (id: string) => {
    setPortfolio(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col relative overflow-x-hidden selection:bg-blue-500/30">
      {/* Ambient Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-teal-500/5 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="flex-grow p-4 md:p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between border-b border-slate-800/60 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  ETFTrueHoldings
                </h1>
                <p className="text-slate-400 text-sm mt-0.5">An open source ETF portfolio X-ray</p>
              </div>
            </div>
            
            <a 
              href="https://github.com/bobsa514/ETFTrueHoldings" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-white transition-all hover:bg-slate-800/50 p-2 rounded-full border border-transparent hover:border-slate-700"
              title="View on GitHub"
            >
              <Github className="w-6 h-6" />
            </a>
          </header>

          {!apiKey && (
            <div className="mb-8 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-xl p-4 text-yellow-200 text-sm flex items-center animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.1)]">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>Please enter your AlphaVantage API Key to begin analyzing your portfolio.</span>
            </div>
          )}

          {/* API Key Input */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 mb-8 border border-slate-800/60 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AlphaVantage API Key</label>
                  <div className="relative group">
                      <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => handleSaveKey(e.target.value)}
                          placeholder="Enter your key (e.g. DEMO)"
                          className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-4 pr-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-slate-100 placeholder-slate-600 transition-all group-hover:border-slate-600"
                      />
                  </div>
                </div>
                <div className="pb-1">
                   <p className="text-xs text-slate-500">
                    <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                      Get a free key <ArrowUpRight className="w-3 h-3" />
                    </a>
                    (Standard: 25 req/day)
                  </p>
                </div>
              </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Column: Portfolio Builder */}
            <div className="xl:col-span-1 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl flex flex-col h-full max-h-[800px]">
                <div className="p-6 border-b border-slate-800/60 flex items-center gap-2 bg-slate-900/40">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Build Portfolio</h2>
                </div>
                
                <div className="p-6 bg-slate-900/20">
                  <form onSubmit={handleAddEtf} className="flex flex-col gap-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">ETF Ticker</label>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input 
                          type="text" 
                          value={newTicker}
                          onChange={(e) => setNewTicker(e.target.value)}
                          placeholder="e.g. QQQ, SPY"
                          className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none uppercase transition-all"
                          disabled={!apiKey}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1.5">Equity Value ($)</label>
                      <input 
                        type="number" 
                        value={newEquity}
                        onChange={(e) => setNewEquity(e.target.value)}
                        placeholder="Amount invested"
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                        disabled={!apiKey}
                      />
                    </div>

                    <Button type="submit" disabled={!apiKey || !newTicker || !newEquity} className="w-full shadow-lg shadow-blue-900/20">
                      <Plus className="w-4 h-4 mr-2" /> Add to Portfolio
                    </Button>
                  </form>
                </div>

                {/* Portfolio List */}
                <div className="flex-grow flex flex-col min-h-0 border-t border-slate-800/60 bg-slate-950/30">
                  <div className="px-6 py-3 bg-slate-950/40 text-xs font-bold text-slate-500 uppercase flex justify-between items-center border-b border-slate-800/30">
                      <span>Holdings ({portfolio.length}/50)</span>
                      <span className="text-blue-400 font-mono">${stats.totalEquity.toLocaleString()}</span>
                  </div>
                  <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent flex-grow">
                      {portfolio.length === 0 && (
                          <div className="p-8 text-center flex flex-col items-center justify-center h-full opacity-50">
                              <div className="w-12 h-12 rounded-full bg-slate-800 mb-3 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-slate-500" />
                              </div>
                              <span className="text-sm text-slate-400">Add your first ETF above</span>
                          </div>
                      )}
                      {portfolio.map(item => (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors group border-b border-slate-800/30 last:border-0">
                              <div className="flex-1 min-w-0 mr-4">
                                  <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-bold text-lg text-slate-200">{item.ticker}</span>
                                      {item.isLoading && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 animate-pulse bg-blue-900/20 px-1.5 py-0.5 rounded">Fetching</span>}
                                      {item.error && <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">Error</span>}
                                      {item.data && !item.error && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded">Ready</span>}
                                  </div>
                                  
                                  {/* Show Error Message if Failed */}
                                  {item.error ? (
                                      <div className="text-xs text-red-400 font-medium flex items-center mt-1">
                                         <AlertCircle className="w-3 h-3 mr-1" /> {item.error}
                                      </div>
                                  ) : (
                                      <>
                                        {item.data?.name && item.data.name !== item.ticker && (
                                            <div className="text-xs text-slate-500 mb-1 font-medium truncate" title={item.data.name}>
                                            {item.data.name}
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-2 mb-1">
                                           <span className="text-sm text-slate-300 font-mono">${item.equity.toLocaleString()}</span>
                                        </div>
                                        {item.data && (
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-wide">
                                                <span className="bg-slate-800/50 px-1.5 py-0.5 rounded" title="Expense Ratio">
                                                   Exp: {(parseFloat(item.data.net_expense_ratio) * 100).toFixed(2)}%
                                                </span>
                                                <span className="bg-slate-800/50 px-1.5 py-0.5 rounded" title="Dividend Yield">
                                                   Div: {(parseFloat(item.data.dividend_yield) * 100).toFixed(2)}%
                                                </span>
                                            </div>
                                        )}
                                      </>
                                  )}
                              </div>
                              <button 
                                  onClick={() => removeEtf(item.id)}
                                  className="text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded-lg p-2 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  title="Remove ETF"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Visualization */}
            <div className="xl:col-span-2 min-h-[600px]">
              {stats.hasData ? (
                  <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          
                          {/* Total Assets */}
                          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/60 shadow-lg flex items-center">
                              <div className="p-3 bg-blue-500/10 rounded-lg mr-4">
                                  <DollarSign className="w-6 h-6 text-blue-400" />
                              </div>
                              <div>
                                  <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Assets</div>
                                  <div className="text-xl font-bold text-white font-mono">${stats.totalEquity.toLocaleString()}</div>
                              </div>
                          </div>

                          {/* Expense Ratio */}
                          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/60 shadow-lg flex items-center relative group">
                              <div className="p-3 bg-amber-500/10 rounded-lg mr-4">
                                  <Percent className="w-6 h-6 text-amber-400" />
                              </div>
                              <div className="flex-1">
                                  <div className="flex items-center gap-1 text-xs text-slate-500 uppercase font-bold tracking-wider cursor-help">
                                      Avg Expense Ratio
                                      <div className="relative group/tooltip">
                                        <Info className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition-colors" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-200 text-[10px] normal-case rounded-lg border border-slate-700 shadow-xl whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                            Estimated annual fees paid to ETF managers
                                        </div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-lg font-bold text-slate-200 font-mono">
                                        -${stats.totalAnnualExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm text-slate-500 font-sans font-normal">/ yr</span>
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {(stats.avgExpenseRatio * 100).toFixed(2)}% avg
                                    </span>
                                  </div>
                              </div>
                          </div>

                          {/* Dividend Yield */}
                          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-800/60 shadow-lg flex items-center">
                              <div className="p-3 bg-emerald-500/10 rounded-lg mr-4">
                                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                              </div>
                              <div className="flex-1">
                                  <div className="flex items-center gap-1 text-xs text-slate-500 uppercase font-bold tracking-wider cursor-help">
                                      Avg Div Yield
                                      <div className="relative group/tooltip">
                                        <Info className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition-colors" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-slate-200 text-[10px] normal-case rounded-lg border border-slate-700 shadow-xl whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                                            Estimated annual dividend income
                                        </div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-lg font-bold text-slate-200 font-mono">
                                        +${stats.totalAnnualDividend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm text-slate-500 font-sans font-normal">/ yr</span>
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                        {(stats.avgDividendYield * 100).toFixed(2)}% avg
                                    </span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <AnalysisCharts 
                          holdings={aggregatedData.holdings} 
                          sectors={aggregatedData.sectors} 
                          totalEquity={stats.totalEquity} 
                      />
                  </div>
              ) : (
                  <div className="h-full bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-500 p-8 animate-in fade-in duration-700">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                        <PieChartIcon className="w-20 h-20 mb-6 text-slate-700 relative z-10" />
                      </div>
                      <p className="text-xl font-semibold text-slate-300">Ready to analyze</p>
                      <p className="text-sm text-slate-500 max-w-sm text-center mt-2 leading-relaxed">
                          {portfolio.length > 0 && portfolio.some(i => i.error) 
                            ? "Some items failed to load. Please check the errors or add valid ETFs." 
                            : "Add ETFs to your portfolio on the left to generate an aggregated breakdown of your underlying assets."}
                      </p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;