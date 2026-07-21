import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Bug, Zap, Activity, FolderGit2, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ScanHistory } from '../types';

interface DashboardProps {
  onNavigate: (page: string) => void;
  globalSearchTerm?: string;
}

const mockChartData = [
  { name: 'Mon', bugs: 4, vulnerabilities: 1, score: 76 },
  { name: 'Tue', bugs: 3, vulnerabilities: 0, score: 78 },
  { name: 'Wed', bugs: 7, vulnerabilities: 2, score: 72 },
  { name: 'Thu', bugs: 2, vulnerabilities: 0, score: 81 },
  { name: 'Fri', bugs: 5, vulnerabilities: 1, score: 82 },
  { name: 'Sat', bugs: 1, vulnerabilities: 0, score: 85 },
  { name: 'Sun', bugs: 4, vulnerabilities: 1, score: 84 },
];

export function Dashboard({ onNavigate, globalSearchTerm = '' }: DashboardProps) {
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    const fetchHistory = () => {
      fetch('/api/history')
        .then(res => res.json())
        .then(data => {
          setHistory(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    };

    fetchHistory();

    let intervalId: NodeJS.Timeout;
    if (isPolling) {
      intervalId = setInterval(fetchHistory, 10000); // Poll every 10 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling]);

  // Filter history by search term
  const filteredHistory = history.filter(scan => 
    !globalSearchTerm || 
    scan.project.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
    scan.language.toLowerCase().includes(globalSearchTerm.toLowerCase())
  );

  // Dynamic stats calculation
  const totalBugs = filteredHistory.reduce((sum, s) => sum + s.bugs, 0);
  const totalVulns = filteredHistory.reduce((sum, s) => sum + s.vulnerabilities, 0);
  const avgScore = filteredHistory.length > 0
    ? Math.round(filteredHistory.reduce((sum, s) => sum + s.score, 0) / filteredHistory.length)
    : 100;

  // Generate last 7 days chart data dynamically
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const dynamicChartData = last7Days.map(date => {
    const dateString = date.toDateString();
    const dayName = daysOfWeek[date.getDay()];
    const dayScans = filteredHistory.filter(scan => new Date(scan.date).toDateString() === dateString);
    
    const dayBugs = dayScans.reduce((sum, s) => sum + s.bugs, 0);
    const dayVulns = dayScans.reduce((sum, s) => sum + s.vulnerabilities, 0);
    const dayScore = dayScans.length > 0 
      ? Math.round(dayScans.reduce((sum, s) => sum + s.score, 0) / dayScans.length) 
      : (filteredHistory.length > 0 ? Math.round(filteredHistory.reduce((sum, s) => sum + s.score, 0) / filteredHistory.length) : 100);

    return {
      name: dayName,
      bugs: dayBugs,
      vulnerabilities: dayVulns,
      score: dayScore
    };
  });

  return (
    <div className="space-y-6 flex flex-col pb-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-slate-500 text-sm">Aggregate metrics across active production repositories.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-sm font-semibold text-slate-700">Auto-poll Updates</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={isPolling} 
                onChange={(e) => setIsPolling(e.target.checked)} 
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${isPolling ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPolling ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </label>
          <button onClick={() => onNavigate('analyze')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors">New Analysis Run</button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={filteredHistory.length} change={`${filteredHistory.length > 0 ? "Active scanning" : "No scans run yet"}`} changeColor="text-green-600" />
        <StatCard label="Bugs Detected" value={totalBugs} change={`${filteredHistory.filter(s => s.bugs > 0).length} files with bugs`} changeColor="text-amber-600" valueColor="text-amber-600" />
        <StatCard 
          label="Vulnerabilities" 
          value={totalVulns} 
          change={totalVulns > 0 ? "Requires immediate action" : "System secure"} 
          changeColor={totalVulns > 0 ? "text-red-600 underline font-bold" : "text-green-600"} 
          borderLeft={totalVulns > 0 ? "border-l-4 border-l-red-500" : ""} 
          valueColor="text-slate-900" 
          labelColor={totalVulns > 0 ? "text-red-500" : "text-slate-400"} 
          onClick={totalVulns > 0 ? () => onNavigate('security') : undefined}
        />
        <StatCard label="Security Score" value={avgScore} valueSuffix="/100" change={avgScore >= 80 ? "Healthy" : avgScore >= 60 ? "Warning" : "Critical"} changeColor={avgScore >= 80 ? "text-green-600" : "text-amber-600"} valueColor="text-green-600" isScore />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bug Discovery Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Bug Discovery Rate (7d)</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold">Total: {totalBugs}</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBugs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="bugs" name="Bugs" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorBugs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Security Score Improvement */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Security Score Trend (7d)</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">Avg: {avgScore} pts</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="score" name="Score" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Split Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 max-h-[500px]">
        {/* Left: Recent Analyses */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Recent Code Analyses</h3>
            <span onClick={() => onNavigate('history')} className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">View All Activity</span>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Project</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">{scan.project}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(scan.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">Complete</span>
                      </td>
                      <td className={`px-6 py-4 font-semibold ${scan.score >= 80 ? 'text-green-600' : scan.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {scan.score}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           {scan.bugs > 0 && <span className="text-amber-600 font-medium text-xs">{scan.bugs} Bugs</span>}
                           {scan.vulnerabilities > 0 && <span className="text-red-600 font-bold text-xs">{scan.vulnerabilities} Vuln</span>}
                           {scan.bugs === 0 && scan.vulnerabilities === 0 && <span className="text-slate-400 text-xs">-</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: AI Insights */}
        <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col shadow-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-blue-400 animate-pulse rounded-full"></div>
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">AI Security Pulse</h3>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto min-h-0 pr-2">
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs font-bold text-amber-400 mb-1">⚠️ Optimization Tip</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Found unhandled promise rejections in <span className="text-white italic">api/analyze</span> endpoint. Consider adding global fallback.
              </p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs font-bold text-red-400 mb-1">🚨 Vulnerability Alert</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Potential injection found in <span className="text-white italic">UserDashboard</span> due to unsafe string concatenation.
              </p>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs font-bold text-blue-400 mb-1">ℹ️ Best Practice</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Multiple modules using hardcoded generic keys. Recommendation: Implement environment variables with strict typing.
              </p>
            </div>
          </div>
          <button className="mt-6 w-full py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">Download Security Audit PDF</button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeColor?: string;
  valueColor?: string;
  labelColor?: string;
  borderLeft?: string;
  valueSuffix?: string;
  isScore?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, change, changeColor, valueColor = "text-slate-900", labelColor = "text-slate-400", borderLeft, valueSuffix, isScore, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick} 
      className={`bg-white p-5 border border-slate-200 rounded-xl shadow-sm ${borderLeft || ''} ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-200 active:scale-[0.99]' : ''
      }`}
    >
      <div className={`text-xs font-bold uppercase ${labelColor}`}>{label}</div>
      <div className={`text-3xl font-bold mt-1 ${valueColor}`}>
        {value}
        {valueSuffix && <span className="text-sm text-slate-400 font-normal">{valueSuffix}</span>}
      </div>
      {isScore && (
        <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full">
          <div className="bg-green-500 h-full rounded-full" style={{ width: `${value}%` }}></div>
        </div>
      )}
      {!isScore && change && (
        <div className={`text-xs font-medium mt-2 ${changeColor}`}>{change}</div>
      )}
    </div>
  );
}


