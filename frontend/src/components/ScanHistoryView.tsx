import React, { useEffect, useState } from 'react';
import { Search, Filter, History, ArrowUpDown, ChevronRight, Download, GitCompare, X, Shield, Bug, Zap, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { ScanHistory } from '../types';

interface ScanHistoryViewProps {
  globalSearchTerm?: string;
  setGlobalSearchTerm?: (term: string) => void;
}

export function ScanHistoryView({ globalSearchTerm = '', setGlobalSearchTerm }: ScanHistoryViewProps) {
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof ScanHistory>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  const searchTerm = globalSearchTerm || localSearchTerm;
  const setSearchTerm = setGlobalSearchTerm || setLocalSearchTerm;
  const [selectedScans, setSelectedScans] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // Report Viewer hooks
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [activeScanDetails, setActiveScanDetails] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [modalTab, setModalTab] = useState<'overview' | 'bugs' | 'security' | 'optimizations' | 'code'>('overview');

  const handleViewReport = async (id: string) => {
    setSelectedScanId(id);
    setLoadingReport(true);
    setActiveScanDetails(null);
    setModalTab('overview');
    try {
      const res = await fetch(`/api/scans/${id}`);
      if (!res.ok) throw new Error('Failed to load report');
      const data = await res.json();
      setActiveScanDetails(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load scan report details.');
      setSelectedScanId(null);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
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
  }, []);

  const handleSort = (field: keyof ScanHistory) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedScans(prev => {
      if (prev.includes(id)) {
        return prev.filter(scanId => scanId !== id);
      }
      return [...prev, id];
    });
  };

  const toggleSelectAll = () => {
    if (selectedScans.length === filteredAndSortedHistory.length) {
      setSelectedScans([]);
    } else {
      setSelectedScans(filteredAndSortedHistory.map(scan => scan.id));
    }
  };

  const handleBulkDownload = () => {
    // In a real app we'd fetch actual reports here.
    // We just download a combined CSV of the summary
    let csv = 'Project,Language,Date,Score,Vulnerabilities,Bugs\n';
    
    selectedScans.forEach(id => {
      const scan = history.find(s => s.id === id);
      if (scan) {
        csv += `${scan.project},${scan.language},${new Date(scan.date).toLocaleDateString()},${scan.score},${scan.vulnerabilities},${scan.bugs}\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAndSortedHistory = [...history]
    .filter(scan => 
      scan.project.toLowerCase().includes(searchTerm.toLowerCase()) || 
      scan.language.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = () => <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400 inline-block" />;

  const scan1 = history.find(s => s.id === selectedScans[0]);
  const scan2 = history.find(s => s.id === selectedScans[1]);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scan History</h1>
          <p className="text-slate-500 text-sm">Review past analysis runs and track code quality improvements.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search projects or languages..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-slate-700" 
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {selectedScans.length > 0 ? (
              <div className="flex items-center gap-2 mr-auto bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <span className="text-sm font-medium text-blue-700">{selectedScans.length} selected</span>
                <div className="h-4 w-px bg-blue-200 mx-1"></div>
                <button 
                  onClick={handleBulkDownload}
                  className="text-blue-700 hover:text-blue-800 text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download All
                </button>
              </div>
            ) : null}
            <button 
              disabled={selectedScans.length !== 2}
              onClick={() => setIsComparing(true)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" /> Compare (2)
            </button>
            <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedScans.length > 0 && selectedScans.length === filteredAndSortedHistory.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('project')}>
                    Project <SortIcon />
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('language')}>
                    Language <SortIcon />
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('date')}>
                    Date <SortIcon />
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('score')}>
                    Score <SortIcon />
                  </th>
                  <th className="px-6 py-4">Issues</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No matching scans found.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedHistory.map((scan) => (
                    <tr key={scan.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedScans.includes(scan.id)}
                          onChange={() => toggleSelect(scan.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{scan.project}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium">
                          {scan.language}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{new Date(scan.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Complete
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`font-bold ${scan.score >= 80 ? 'text-green-600' : scan.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                            {scan.score}
                          </div>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full hidden sm:block">
                            <div 
                              className={`h-full rounded-full ${scan.score >= 80 ? 'bg-green-500' : scan.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                              style={{ width: `${scan.score}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {scan.vulnerabilities > 0 && (
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold border border-red-100">
                              {scan.vulnerabilities} Vuln
                            </span>
                          )}
                          {scan.bugs > 0 && (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold border border-amber-100">
                              {scan.bugs} Bugs
                            </span>
                          )}
                          {scan.bugs === 0 && scan.vulnerabilities === 0 && (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleViewReport(scan.id)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity active:scale-[0.98]"
                        >
                          View Report <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {isComparing && scan1 && scan2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-blue-600" /> Compare Analyses
              </h2>
              <button 
                onClick={() => setIsComparing(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <span className="text-xs font-bold uppercase text-slate-400 mb-1 tracking-wider">Scan 1</span>
                  <span className="font-bold text-slate-800">{scan1.project}</span>
                  <span className="text-sm text-slate-500">{new Date(scan1.date).toLocaleDateString()}</span>
                  <span className="mt-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{scan1.language}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <span className="text-xs font-bold uppercase text-slate-400 mb-1 tracking-wider">Scan 2</span>
                  <span className="font-bold text-slate-800">{scan2.project}</span>
                  <span className="text-sm text-slate-500">{new Date(scan2.date).toLocaleDateString()}</span>
                  <span className="mt-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{scan2.language}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Metrics Comparison</h3>
                
                <div className="grid grid-cols-3 gap-6 items-center py-3 border-b border-slate-100 bg-white px-4 rounded-lg shadow-sm">
                  <span className="font-medium text-slate-600 text-sm">Overall Score</span>
                  <div className={`text-center font-bold text-lg ${scan1.score >= 80 ? 'text-green-600' : scan1.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{scan1.score}</div>
                  <div className={`text-center font-bold text-lg ${scan2.score >= 80 ? 'text-green-600' : scan2.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{scan2.score}</div>
                </div>

                <div className="grid grid-cols-3 gap-6 items-center py-3 border-b border-slate-100 bg-white px-4 rounded-lg shadow-sm">
                  <span className="font-medium text-slate-600 text-sm">Vulnerabilities</span>
                  <div className="text-center font-bold text-lg">
                    {scan1.vulnerabilities > 0 ? (
                      <span className="text-red-600">{scan1.vulnerabilities}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </div>
                  <div className="text-center font-bold text-lg">
                    {scan2.vulnerabilities > 0 ? (
                      <span className="text-red-600">{scan2.vulnerabilities}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 items-center py-3 border-b border-slate-100 bg-white px-4 rounded-lg shadow-sm">
                  <span className="font-medium text-slate-600 text-sm">Bugs Detected</span>
                  <div className="text-center font-bold text-lg">
                     {scan1.bugs > 0 ? (
                      <span className="text-amber-600">{scan1.bugs}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </div>
                  <div className="text-center font-bold text-lg">
                    {scan2.bugs > 0 ? (
                      <span className="text-amber-600">{scan2.bugs}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Report Viewer Modal */}
      {selectedScanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {loadingReport ? 'Loading Scan Report...' : `Scan Report: ${activeScanDetails?.project}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {loadingReport ? 'Please wait...' : `Executed on ${new Date(activeScanDetails?.date).toLocaleString()} • Language: ${activeScanDetails?.language}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedScanId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingReport ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Fetching report details from intelligence logs...</p>
              </div>
            ) : activeScanDetails ? (
              <>
                {/* Tab Navigation */}
                <div className="flex bg-slate-100 border-b border-slate-200 px-6 py-2 gap-2 shrink-0">
                  <button
                    onClick={() => setModalTab('overview')}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                      modalTab === 'overview' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setModalTab('bugs')}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                      modalTab === 'bugs' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Bugs ({activeScanDetails.bugs?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab('security')}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                      modalTab === 'security' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Security ({activeScanDetails.vulnerabilities?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab('optimizations')}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                      modalTab === 'optimizations' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Optimizations ({activeScanDetails.optimizations?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab('code')}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                      modalTab === 'code' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Source Code
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
                  {modalTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Score Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-sm">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Readability</span>
                          <span className="text-xl font-bold text-slate-800">{activeScanDetails.scores?.readability || 100}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-sm">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Maintainability</span>
                          <span className="text-xl font-bold text-slate-800">{activeScanDetails.scores?.maintainability || 100}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-sm">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Security Score</span>
                          <span className="text-xl font-bold text-red-600">{activeScanDetails.scores?.security || 100}</span>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-sm">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Performance</span>
                          <span className="text-xl font-bold text-slate-800">{activeScanDetails.scores?.performance || 100}</span>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center shadow-md col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500 block mb-1">Overall</span>
                          <span className="text-xl font-black text-blue-700">{activeScanDetails.scores?.overall || 100}</span>
                        </div>
                      </div>

                      {/* Review Summary */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-blue-600" />
                          Gemini Intelligence Documentation
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{activeScanDetails.reviewSummary || 'No review summary generated.'}</p>
                      </div>
                    </div>
                  )}

                  {modalTab === 'bugs' && (
                    <div className="space-y-4">
                      {(!activeScanDetails.bugs || activeScanDetails.bugs.length === 0) ? (
                        <div className="p-12 text-center text-slate-400 text-sm">No code quality bugs detected.</div>
                      ) : (
                        activeScanDetails.bugs.map((bug: any, idx: number) => (
                          <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex gap-4 items-start hover:bg-slate-50 transition-colors">
                            <div className={`p-2 rounded-lg ${bug.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} shrink-0`}>
                              <Bug className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">Line {bug.line}</span>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                  bug.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>{bug.severity} Severity</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{bug.issue}</p>
                              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800">
                                <strong className="font-bold text-blue-900 block mb-1">Suggested Fix:</strong>
                                {bug.suggestedFix}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {modalTab === 'security' && (
                    <div className="space-y-4">
                      {(!activeScanDetails.vulnerabilities || activeScanDetails.vulnerabilities.length === 0) ? (
                        <div className="p-12 text-center text-green-600 text-sm font-semibold flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl">
                          ✓ No security vulnerabilities detected. Code complies with secure practices!
                        </div>
                      ) : (
                        activeScanDetails.vulnerabilities.map((vuln: any, idx: number) => (
                          <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex gap-4 items-start hover:bg-slate-55 transition-colors">
                            <div className={`p-2 rounded-lg ${
                              vuln.riskLevel === 'Critical' || vuln.riskLevel === 'High' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                            } shrink-0`}>
                              <Shield className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{vuln.name}</span>
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                  vuln.riskLevel === 'Critical' || vuln.riskLevel === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{vuln.riskLevel} Risk</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{vuln.impact}</p>
                              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-700">
                                <strong className="font-bold text-slate-800 block mb-1">Remediation Guidance:</strong>
                                {vuln.recommendation}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {modalTab === 'optimizations' && (
                    <div className="space-y-4">
                      {(!activeScanDetails.optimizations || activeScanDetails.optimizations.length === 0) ? (
                        <div className="p-12 text-center text-slate-400 text-sm">No optimization recommendations.</div>
                      ) : (
                        activeScanDetails.optimizations.map((opt: any, idx: number) => (
                          <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex gap-4 items-start hover:bg-slate-50 transition-colors">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{opt.type} Suggestion</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{opt.suggestion}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {modalTab === 'code' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 font-mono">
                        Source Code Content
                      </div>
                      <pre className="p-4 text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto bg-slate-950 text-slate-200">
                        {activeScanDetails.code || '# Code content is not available for this run.'}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                  <button
                    onClick={() => setSelectedScanId(null)}
                    className="px-5 py-2 bg-slate-800 text-white font-semibold rounded-lg text-xs hover:bg-slate-700 transition-colors shadow-sm active:scale-[0.98]"
                  >
                    Close Report
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
