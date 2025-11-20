import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { ChevronLeft, ChevronRight, Search, ExternalLink } from 'lucide-react';
import { AggregatedHolding, AggregatedSector } from '../types';
import { Button } from './Button';

interface AnalysisChartsProps {
  holdings: AggregatedHolding[];
  sectors: AggregatedSector[];
  totalEquity: number;
}

// Expanded Color Palette
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', 
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#a855f7', '#d946ef', '#f43f5e', '#2dd4bf',
  '#fb923c', '#60a5fa', '#c084fc', '#a78bfa', '#e879f9',
  '#475569', '#94a3b8'
];

const BAR_COLOR = '#3b82f6';

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-lg shadow-xl z-50">
        <p className="font-bold text-slate-100 mb-1">{label || payload[0].payload.name || payload[0].name}</p>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-400">Value:</span>
          <span className="text-blue-400 font-mono">
            {currency 
              ? `$${payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
              : `${payload[0].value.toFixed(2)}%`}
          </span>
        </div>
        {payload[0].payload.ticker && (
           <p className="text-xs text-slate-500 mt-1 font-mono">{payload[0].payload.ticker}</p>
        )}
      </div>
    );
  }
  return null;
};

// Logo Component
const CompanyLogo = ({ ticker }: { ticker: string }) => {
  const [error, setError] = useState(false);

  // Use Parqet Assets for Tickers
  const logoUrl = `https://assets.parqet.com/logos/symbol/${ticker}?format=png`;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${ticker}&background=1e293b&color=94a3b8&length=3&font-size=0.33&rounded=true`;

  if (ticker === 'CASH' || ticker === 'USD') {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center text-emerald-400 font-bold text-[10px]">
            $
        </div>
      )
  }

  return (
    <div className="w-8 h-8 rounded-full bg-white/5 p-0.5 ring-1 ring-white/10 overflow-hidden flex-shrink-0">
      <img 
        src={error ? fallbackUrl : logoUrl}
        alt={ticker}
        className="w-full h-full object-contain rounded-full bg-white"
        onError={() => setError(true)}
      />
    </div>
  );
};

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ holdings, sectors, totalEquity }) => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 10;
  
  // Top 15 for Chart - Always based on value
  const topHoldings = holdings.slice(0, 15);
  
  // Filtered Holdings for Table
  const filteredHoldings = useMemo(() => {
    if (!searchQuery) return holdings;
    const q = searchQuery.toLowerCase();
    return holdings.filter(h => 
      h.ticker.toLowerCase().includes(q) || 
      h.name.toLowerCase().includes(q)
    );
  }, [holdings, searchQuery]);

  const totalPages = Math.ceil(filteredHoldings.length / ITEMS_PER_PAGE);
  
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const displayedHoldings = filteredHoldings.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Holdings Bar Chart */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center">
          <span className="w-1 h-6 bg-blue-500 rounded-full mr-3"></span>
          Top 15 Underlying Assets
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topHoldings}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.3} />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="ticker" 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                width={50}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip currency={true} />} cursor={{fill: '#ffffff', opacity: 0.05}} />
              <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
                {topHoldings.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Allocation Pie Chart */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center">
          <span className="w-1 h-6 bg-purple-500 rounded-full mr-3"></span>
          Sector Allocation
        </h3>
        <div className="h-[350px] w-full flex flex-col items-center justify-center">
           {sectors.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectors}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="rgba(0,0,0,0)"
                >
                  {sectors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={false} />} />
              </PieChart>
            </ResponsiveContainer>
           ) : (
             <div className="text-slate-500">No sector data available</div>
           )}
           {sectors.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4 max-h-[100px] overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {sectors.map((s, i) => (
                    <div key={s.name} className="flex items-center text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700/50">
                        <div className="w-2 h-2 mr-1.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[i % COLORS.length]}}></div>
                        {s.name} <span className="ml-1 text-slate-300 font-mono">{s.percentage.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
           )}
        </div>
      </div>

      {/* Detailed List */}
      <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800/60 shadow-xl">
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center">
              <span className="w-1 h-6 bg-teal-500 rounded-full mr-3"></span>
              Detailed Breakdown
              <span className="ml-3 text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                {filteredHoldings.length} Assets
              </span>
            </h3>

            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search holdings..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800/50">
            <table className="min-w-full divide-y divide-slate-800/50">
                <thead>
                    <tr className="bg-slate-950/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Value ($)</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">% of Portfolio</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
                    {displayedHoldings.length === 0 ? (
                       <tr>
                         <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                           No holdings found matching "{searchQuery}"
                         </td>
                       </tr>
                    ) : (
                      displayedHoldings.map((h) => (
                          <tr key={h.ticker} className="hover:bg-slate-800/40 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10">
                                          <CompanyLogo ticker={h.ticker} />
                                      </div>
                                      <div className="ml-4">
                                          <div className="flex items-center gap-1.5">
                                            <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                                              {h.ticker}
                                            </div>
                                            {h.ticker !== 'CASH' && (
                                              <a 
                                                href={`https://www.google.com/finance/quote/${h.ticker}:NASDAQ`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-slate-600 hover:text-blue-400 transition-colors"
                                                title="View Real-time Quote"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            )}
                                          </div>
                                          <div className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-[300px] group-hover:text-slate-400 transition-colors">{h.name}</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                                  ${h.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                                  <div className="flex items-center gap-3">
                                      <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                          <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${Math.min(h.percentageOfPortfolio, 100)}%` }}></div>
                                      </div>
                                      <span className="w-12 text-right">{h.percentageOfPortfolio.toFixed(2)}%</span>
                                  </div>
                              </td>
                          </tr>
                      ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
             <div className="flex items-center bg-slate-950/50 rounded-lg p-1 border border-slate-800/50">
                <Button 
                  variant="ghost" 
                  onClick={() => handlePageChange(page - 1)} 
                  disabled={page === 1}
                  className="!p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-4 text-sm text-slate-400 font-mono">
                  {page} <span className="text-slate-600">/</span> {totalPages}
                </span>
                <Button 
                  variant="ghost" 
                  onClick={() => handlePageChange(page + 1)} 
                  disabled={page === totalPages}
                  className="!p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};