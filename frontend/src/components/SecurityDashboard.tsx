import React, { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, RefreshCw, ExternalLink, Zap, X } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { toast } from 'sonner';

interface Vulnerability {
    id: number;
    owasp_category: string;
    cve_id: string;
    cvss_score: number;
    severity: string;
    exploitability_score: number;
    remediation_guidance: string;
    file: string;
    line: string;
    description: string;
    created_at: string;
}

interface SecurityStats {
    securityScore: number;
    vulnerabilitiesCount: number;
    riskDistribution: { [key: string]: number };
    owaspCounts: { [key: string]: number };
    complianceStatus: string;
}

export function SecurityDashboard() {
    const [vulns, setVulns] = useState<Vulnerability[]>([]);
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // AI Remediation states
    const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
    const [fixing, setFixing] = useState(false);
    const [proposedFix, setProposedFix] = useState<{
        explanation: string;
        originalSnippet: string;
        fixedSnippet: string;
    } | null>(null);
    const [applying, setApplying] = useState(false);

    const handleInitiateFix = async (vuln: Vulnerability) => {
        setSelectedVuln(vuln);
        setFixing(true);
        setProposedFix(null);
        try {
            const res = await fetch('/api/ai/fix-vulnerability/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scan_id: vuln.scan_id,
                    vuln_name: vuln.owasp_category,
                    description: vuln.description
                })
            });
            if (!res.ok) throw new Error('Failed to generate fix');
            const data = await res.json();
            setProposedFix(data);
        } catch (error: any) {
            console.error('Error generating AI fix:', error);
            toast.error(error.message || 'Failed to generate AI fix. Please check Gemini API config.');
            setSelectedVuln(null);
        } finally {
            setFixing(false);
        }
    };

    const handleApplyFix = async () => {
        if (!selectedVuln || !proposedFix) return;
        setApplying(true);
        try {
            const res = await fetch('/api/ai/apply-fix/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scan_id: selectedVuln.scan_id,
                    original_snippet: proposedFix.originalSnippet,
                    fixed_snippet: proposedFix.fixedSnippet,
                    cve_id: selectedVuln.cve_id
                })
            });
            if (!res.ok) throw new Error('Failed to apply fix');
            toast.success('Security patch applied successfully! Posture updated.');
            setSelectedVuln(null);
            setProposedFix(null);
            fetchSecurityData();
        } catch (error: any) {
            console.error('Error applying fix:', error);
            toast.error(error.message || 'Failed to apply security patch');
        } finally {
            setApplying(false);
        }
    };

    const fetchSecurityData = async () => {
        try {
            const [resVulns, resStats] = await Promise.all([
                fetch('/api/security/vulnerabilities/'),
                fetch('/api/security/stats/')
            ]);
            
            if (!resVulns.ok || !resStats.ok) throw new Error('Failed to load security metrics');
            
            const dataVulns = await resVulns.json();
            const dataStats = await resStats.json();
            
            setVulns(dataVulns);
            setStats(dataStats);
        } catch (error) {
            console.error('Error loading security data:', error);
            toast.error('Failed to load security vulnerability reports');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSecurityData();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSecurityData();
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const pieColors = {
        Critical: '#dc2626', // red-600
        High: '#ea580c',     // orange-600
        Medium: '#ca8a04',   // yellow-600
        Low: '#4b5563',      // gray-600
    };

    const pieData = Object.entries(stats.riskDistribution).map(([name, value]) => ({
        name,
        value: value as number,
        color: pieColors[name as keyof typeof pieColors] || '#e2e8f0'
    })).filter(item => item.value > 0);

    const barData = Object.entries(stats.owaspCounts).map(([cat, count]) => ({
        category: cat.split(':')[0], // e.g. A01
        count: count as number,
        fullName: cat
    }));

    return (
        <div className="space-y-6 flex flex-col pb-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Security Posture Dashboard</h1>
                    <p className="text-slate-500 text-sm">Vulnerability audits, OWASP compliance levels, and live CVSS scores.</p>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Audits
                </button>
            </div>

            {/* Score summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Security Score</div>
                    <div className="text-3xl font-bold mt-1 text-red-600 flex items-baseline gap-1">
                        {stats.securityScore}
                        <span className="text-sm text-slate-400 font-normal">/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full">
                        <div 
                            className={`h-full rounded-full ${stats.securityScore >= 85 ? 'bg-green-500' : (stats.securityScore >= 60 ? 'bg-amber-500' : 'bg-red-500')}`} 
                            style={{ width: `${stats.securityScore}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Active Vulnerabilities</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">{stats.vulnerabilitiesCount}</div>
                    <div className="text-xs text-slate-500 mt-3 font-semibold text-red-500 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> High priority review needed
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Compliance Status</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">{stats.complianceStatus}</div>
                    <div className="text-xs text-slate-500 mt-3 flex items-center gap-1 font-semibold text-slate-600">
                        OWASP Top 10 standards
                    </div>
                </div>

                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-xs font-bold uppercase text-slate-400">Risk Profile</div>
                    <div className="text-3xl font-bold mt-1 text-slate-900">
                        {stats.riskDistribution.Critical || stats.riskDistribution.High ? 'At Risk' : 'Secure'}
                    </div>
                    <div className="text-xs text-slate-500 mt-3 flex items-center gap-1 font-semibold text-slate-500">
                        Critical: {stats.riskDistribution.Critical}, High: {stats.riskDistribution.High}
                    </div>
                </div>
            </div>

            {/* Visualisations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Distribution Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4">Risk Level Distribution</h3>
                    <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
                        {pieData.length === 0 ? (
                            <div className="text-slate-400 text-sm flex flex-col items-center gap-2">
                                <ShieldCheck className="w-8 h-8 text-green-500" />
                                No vulnerabilities detected.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-slate-800">{stats.vulnerabilitiesCount}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Alert</span>
                        </div>
                    </div>
                    
                    <div className="flex justify-center gap-4 text-xs font-medium text-slate-600 mt-4 flex-wrap">
                        {pieData.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.name} ({entry.value})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OWASP Category Bar Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4">OWASP Top 10 Vulnerabilities Distribution</h3>
                    <div className="flex-1 min-h-[220px] w-full">
                        {barData.length === 0 ? (
                            <div className="text-slate-400 text-sm flex items-center justify-center h-full">
                                No security issues logged.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32}>
                                        {barData.map((entry, idx) => {
                                            const score = entry.count;
                                            return <Cell key={`cell-${idx}`} fill={score > 2 ? '#dc2626' : '#ea580c'} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Vulnerability list */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Identified Security Alerts</h2>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
                    {vulns.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            No security vulnerabilities detected. Your codebase complies with secure practices!
                        </div>
                    ) : (
                        vulns.map((vuln) => (
                            <div key={vuln.id} className="p-5 hover:bg-slate-50 transition-colors flex gap-4 items-start">
                                <div className={`p-2 rounded-lg shrink-0 ${
                                    vuln.severity === 'Critical' ? 'bg-red-50 text-red-600' :
                                    (vuln.severity === 'High' ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600')
                                }`}>
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-800 text-base">{vuln.owasp_category}</span>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{vuln.cve_id}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                            vuln.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                            (vuln.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700')
                                        }`}>{vuln.severity} Risk ({vuln.cvss_score} CVSS)</span>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed">{vuln.description}</p>
                                    <div className="text-xs text-slate-500 font-mono flex gap-2">
                                        <span>File: {vuln.file}</span>
                                        <span>•</span>
                                        <span>Line: {vuln.line}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg mt-2 text-xs text-slate-700">
                                        <strong className="text-slate-800 block mb-1">Remediation Guidance:</strong>
                                        {vuln.remediation_guidance}
                                    </div>
                                    <button
                                        onClick={() => handleInitiateFix(vuln)}
                                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-[0.98]"
                                    >
                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                        Remediate with AI
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedVuln && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden text-slate-900">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-600 animate-pulse fill-blue-600/20" />
                                <h3 className="font-bold text-slate-800 text-lg">AI Remediation Assistant</h3>
                            </div>
                            <button 
                                onClick={() => setSelectedVuln(null)} 
                                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {fixing ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm font-semibold text-slate-600 animate-pulse">
                                        Analyzing code & generating secure correction with Gemini...
                                    </p>
                                </div>
                            ) : proposedFix ? (
                                <div className="space-y-4">
                                    {/* Explanation */}
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-1">
                                        <h4 className="font-bold text-blue-900 text-sm">Remediation Rationale</h4>
                                        <p className="text-xs text-blue-800 leading-relaxed">{proposedFix.explanation}</p>
                                    </div>

                                    {/* Diff Comparison */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Original */}
                                        <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/10">
                                            <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs font-bold text-red-700 flex justify-between items-center">
                                                <span>Vulnerable Code</span>
                                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Original</span>
                                            </div>
                                            <pre className="p-4 text-[11px] font-mono text-red-900 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                                                {proposedFix.originalSnippet}
                                            </pre>
                                        </div>

                                        {/* Fixed */}
                                        <div className="border border-green-200 rounded-xl overflow-hidden bg-green-50/10">
                                            <div className="bg-green-50 border-b border-green-100 px-4 py-2 text-xs font-bold text-green-700 flex justify-between items-center">
                                                <span>Secure Patch</span>
                                                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">AI Recommended</span>
                                            </div>
                                            <pre className="p-4 text-[11px] font-mono text-green-900 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                                                {proposedFix.fixedSnippet}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        {!fixing && proposedFix && (
                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button 
                                    onClick={() => setSelectedVuln(null)} 
                                    className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleApplyFix} 
                                    disabled={applying}
                                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98]"
                                >
                                    {applying && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Apply Safe Code Patch
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
