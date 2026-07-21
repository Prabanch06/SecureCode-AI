import React, { useEffect, useState } from 'react';
import { Users, BarChart2, Star, CheckCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

export function TeamAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics/overview/');
            if (!res.ok) throw new Error('Failed to load team analytics metrics');
            const resData = await res.json();
            setData(resData);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load team productivity trends');
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

    // Mock contributor stats based on real totals
    const contributorStats = [
        { name: 'Alex Chen', scans: Math.max(2, Math.round(data.totalScans * 0.4)), bugsResolved: 12, qualityScore: 88 },
        { name: 'Sarah Miller', scans: Math.max(1, Math.round(data.totalScans * 0.3)), bugsResolved: 8, qualityScore: 92 },
        { name: 'James Wilson', scans: Math.max(1, Math.round(data.totalScans * 0.2)), bugsResolved: 6, qualityScore: 84 },
        { name: 'Elena Rodriguez', scans: Math.max(0, Math.round(data.totalScans * 0.1)), bugsResolved: 2, qualityScore: 95 }
    ];

    return (
        <div className="space-y-6 flex flex-col pb-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team Quality Analytics</h1>
                    <p className="text-slate-500 text-sm">Measure contributor scan logs, average review counts, and quality standards.</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Metrics
                </button>
            </div>

            {/* Summary metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Active Contributors</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">4</div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Core team members
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Total Scans Ran</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">{data.totalScans}</div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-slate-600 flex items-center gap-1">
                        <BarChart2 className="w-3.5 h-3.5" /> All repositories aggregated
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Bugs Resolved</div>
                    <div className="text-3xl font-bold mt-1 text-emerald-600">28</div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> 84% resolution velocity
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Top Quality Performer</div>
                    <div className="text-3xl font-bold mt-1 text-indigo-600">Sarah M.</div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-indigo-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" /> Avg score: 92/100
                    </div>
                </div>
            </div>

            {/* Contributor charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scans by Contributor */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col lg:col-span-2">
                    <h3 className="font-bold text-slate-800 mb-4">Repository Scans & Bugs Resolved</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={contributorStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Legend verticalAlign="top" height={36} iconSize={12} />
                                <Bar dataKey="scans" name="Scans Initiated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="bugsResolved" name="Bugs Fixed" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Avg Quality Score */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4">Average Code Quality Score</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={contributorStats} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="qualityScore" name="Avg Quality Score" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Contributor List Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Contributor Metrics</h2>
                </div>
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                            <th className="px-6 py-3">Developer</th>
                            <th className="px-6 py-3 text-center">Scans Ran</th>
                            <th className="px-6 py-3 text-center">Bugs Resolved</th>
                            <th className="px-6 py-3 text-center">Average Quality</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {contributorStats.map((c, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-slate-800">{c.name}</td>
                                <td className="px-6 py-4 text-center text-slate-500">{c.scans}</td>
                                <td className="px-6 py-4 text-center text-slate-500">{c.bugsResolved}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`font-bold ${c.qualityScore >= 90 ? 'text-green-600' : 'text-blue-600'}`}>
                                        {c.qualityScore}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                        Active
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
