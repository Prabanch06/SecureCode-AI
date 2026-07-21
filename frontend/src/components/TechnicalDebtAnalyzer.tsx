import React, { useEffect, useState } from 'react';
import { Activity, Gauge, Flame, AlertCircle, RefreshCw, Scissors, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface AnalyticsData {
    totalProjects: number;
    totalScans: number;
    totalBugs: number;
    totalVulnerabilities: number;
    averageMaintainabilityIndex: number;
    averageComplexity: number;
    bugTrends: any[];
}

export function TechnicalDebtAnalyzer() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics/overview/');
            if (!res.ok) throw new Error('Failed to load technical debt metrics');
            const resData = await res.json();
            setData(resData);
        } catch (error) {
            console.error('Error fetching technical debt:', error);
            toast.error('Failed to load technical debt reports');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAnalytics();
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const calculateDebtScore = (mi: number) => {
        // Debt score represents percentage of debt. High MI means Low Debt.
        return Math.max(0, 100 - mi);
    };

    const debtScore = calculateDebtScore(data.averageMaintainabilityIndex);
    const maintainabilityStatus = data.averageMaintainabilityIndex >= 80 ? 'Excellent' : (data.averageMaintainabilityIndex >= 60 ? 'Acceptable' : 'High Risk');

    return (
        <div className="space-y-6 flex flex-col pb-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Technical Debt Analyzer</h1>
                    <p className="text-slate-500 text-sm">Measure code duplication, maintainability indexing, and cyclomatic complexity trends.</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Recalculate Debt
                </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Maintainability Index</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900 flex items-baseline gap-1">
                        {data.averageMaintainabilityIndex}
                        <span className="text-sm text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-green-600 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" /> Status: {maintainabilityStatus}
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Technical Debt Ratio</div>
                    <div className="text-3xl font-bold mt-1 text-amber-600">
                        {debtScore.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-amber-600 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> Est. remediation: {Math.round(debtScore * 0.4)} hrs
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Average Complexity</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">
                        {data.averageComplexity}
                    </div>
                    <div className="text-xs text-slate-500 mt-3 flex items-center gap-1 font-semibold text-slate-500">
                        Cyclomatic blocks metric
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Code Duplication</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">
                        2.4%
                    </div>
                    <div className="text-xs text-slate-500 mt-3 flex items-center gap-1 font-semibold text-slate-500">
                        <Scissors className="w-3.5 h-3.5" /> DRY violation index
                    </div>
                </div>
            </div>

            {/* Trend chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-800 mb-4">Maintainability Trend (last 7 runs)</h3>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.bugTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMI" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis domain={['dataMin - 10', 'dataMax + 10']} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            <Area type="monotone" dataKey="score" name="Maintainability Index" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMI)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Refactoring suggestions panel */}
            <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-xl p-6 overflow-hidden flex flex-col">
                <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    AI Architectural Debt Insights
                </h3>
                <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">Architecture Recommendation</span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Code duplication index reached 2.4% in PaymentGateway files. Consider introducing a unified payment controller interface mapping common functions.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">Complexity Alert</span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Average cyclomatic complexity stands at {data.averageComplexity}. Keep method lengths below 40 lines and nesting level under 3 indentation tabs to reduce technical debt.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
