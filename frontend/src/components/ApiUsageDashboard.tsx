import React, { useState, useEffect } from 'react';
import { Activity, Cpu, CreditCard, DollarSign, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ApiUsageDashboard() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usageData, setUsageData] = useState<{
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalRequests: number;
    totalCost: number;
    usageOverTime: any[];
  } | null>(null);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) throw new Error('Failed to fetch usage');
      const data = await res.json();
      setUsageData(data);
    } catch (error) {
      console.error('Failed to fetch usage metrics:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsage();
  };

  if (loading || !usageData) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatTokens = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toString();
  };

  const avgRequestsPerDay = (usageData.totalRequests / 7).toFixed(1);
  const quotaPercent = Math.min(100, Math.max(1, (usageData.totalTokens / 10_000_000) * 100)).toFixed(1);

  return (
    <div className="space-y-6 flex flex-col pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Usage & Quotas</h1>
          <p className="text-slate-500 text-sm">Monitor Gemini API token consumption and request limits in real-time.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tokens (30d)" value={formatTokens(usageData.totalTokens)} subtitle={`${formatTokens(usageData.inputTokens)} In / ${formatTokens(usageData.outputTokens)} Out`} icon={<Cpu className="text-blue-500" />} />
        <StatCard title="API Requests (30d)" value={usageData.totalRequests.toString()} subtitle={`Avg ${avgRequestsPerDay}/day`} icon={<Activity className="text-emerald-500" />} />
        <StatCard title="Est. Cost (30d)" value={`$${usageData.totalCost.toFixed(2)}`} subtitle="Current billing cycle" icon={<DollarSign className="text-amber-500" />} />
        <StatCard title="Quota Status" value="Healthy" subtitle={`${quotaPercent}% of monthly limit`} icon={<CreditCard className="text-indigo-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 max-h-[500px]">
        {/* Token Usage Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm overflow-hidden p-6">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Token Consumption</h3>
            <select className="text-sm border border-slate-200 rounded-md py-1 px-2 text-slate-600 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[0]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData.usageOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value.toString()} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [new Intl.NumberFormat().format(value), '']}
                />
                <Area type="monotone" dataKey="inputTokens" name="Input Tokens" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInput)" />
                <Area type="monotone" dataKey="outputTokens" name="Output Tokens" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOutput)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quota Limits */}
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-xl flex flex-col p-6 overflow-hidden relative">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Rate Limits
            </h3>
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Requests per minute (RPM)</span>
                <span className="font-medium">12 / 60</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tokens per minute (TPM)</span>
                <span className="font-medium">45k / 1M</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '4.5%' }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Requests per day (RPD)</span>
                <span className="font-medium">450 / 10,000</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '4.5%' }}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4">
               <h4 className="text-sm font-medium text-slate-300 mb-3">Model Usage Breakdown</h4>
               <div className="space-y-3">
                 <div className="bg-slate-800 p-3 rounded-lg flex justify-between items-center text-sm">
                   <div className="font-medium text-blue-300">gemini-2.5-pro</div>
                   <div className="text-slate-400">85% total tokens</div>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg flex justify-between items-center text-sm">
                   <div className="font-medium text-emerald-300">gemini-2.5-flash</div>
                   <div className="text-slate-400">15% total tokens</div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs font-bold uppercase text-slate-400">{title}</div>
        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-500">{subtitle}</div>
    </div>
  );
}
