import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Code, UploadCloud, Shield, CheckCircle2, AlertTriangle, Bug as BugIcon, Zap, Loader2, ArrowLeft, Download, FileText, MessageSquare, Send, X, Database, FolderGit2, Search, Sparkles, Plus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import emailjs from '@emailjs/browser';

interface Project {
  id: number;
  name: string;
  description: string;
  repositories: any[];
}

interface AnalysisResultsMapped {
  id: number;
  scores: {
    readability: number;
    maintainability: number;
    security: number;
    performance: number;
    overall: number;
  };
  bugs: Array<{ severity: string; line: string; issue: string; suggestedFix: string }>;
  vulnerabilities: Array<{ riskLevel: string; name: string; impact: string; recommendation: string }>;
  optimizations: Array<{ type: string; suggestion: string }>;
  reviewSummary: string;
}

export function CodeAnalyzer() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('Python');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Projects states
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [isFetchingGit, setIsFetchingGit] = useState(false);
  const [directRepoUrl, setDirectRepoUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Git Repo Files State
  const [repoFiles, setRepoFiles] = useState<Array<{ name: string; path: string; code: string; language: string }>>([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);

  const [results, setResults] = useState<AnalysisResultsMapped | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bugs' | 'security' | 'optimizations' | 'rag'>('overview');

  useEffect(() => {
    setRepoFiles([]);
    setSelectedFilePaths([]);
    setActiveFilePath('');
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects/projects/');
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleFetchCodeFromUrl = async (url: string) => {
    setIsFetchingGit(true);
    const toastId = toast.loading('Cloning repository & extracting source files...', {
      description: `Target: ${url}`
    });
    try {
      const res = await fetch('/api/git/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ git_url: url })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch code from Git repository');
      }
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setRepoFiles(data.files);
        const paths = data.files.map((f: any) => f.path);
        setSelectedFilePaths(paths);
        
        const firstFile = data.files[0];
        setActiveFilePath(firstFile.path);
        setCode(firstFile.code);
        setLanguage(firstFile.language);
        
        toast.success(`Successfully loaded ${data.files.length} files from repository!`, {
          id: toastId
        });
      } else {
        throw new Error('No source code files returned from clone.');
      }
      return data;
    } catch (err: any) {
      console.error(err);
      toast.error(`Git fetch failed: ${err.message}`, { id: toastId });
      return null;
    } finally {
      setIsFetchingGit(false);
    }
  };

  const selectedProject = projects.find(p => p.id.toString() === selectedProjectId);
  const gitUrl = selectedProject?.repositories?.[0]?.git_url || '';

  const handleFetchGitCode = () => {
    if (gitUrl) {
      handleFetchCodeFromUrl(gitUrl);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/projects/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc
        })
      });
      if (!res.ok) throw new Error('Failed to create project');
      const newProj = await res.json();
      
      const newProjId = newProj.id.toString();
      setSelectedProjectId(newProjId);
      
      // Add repo details
      if (newRepoUrl.trim()) {
        await fetch('/api/projects/repositories/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: newProj.id,
            name: newProjectName.toLowerCase() + '-repo',
            git_url: newRepoUrl
          })
        });
        
        // Auto-fetch code immediately
        const fetchedData = await handleFetchCodeFromUrl(newRepoUrl);
        if (fetchedData && fetchedData.code) {
          // Auto-trigger scan job immediately
          await runAnalysis(fetchedData.code, fetchedData.language, newProjId);
        }
      }

      toast.success('Project created and repo linked successfully');
      setIsAddProjectOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewRepoUrl('');
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add project');
    } finally {
      setIsImporting(false);
    }
  };

  const runAnalysis = async (codeToAnalyze: string, lang: string, projectId: string) => {
    setIsAnalyzing(true);
    setError(null);
    const toastId = toast.loading('Executing code analysis pipelines...', { description: 'Running static analysis rules & Gemini code review.' });

    try {
      // Trigger scan job
      const res = await fetch('/api/analysis/jobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectId,
          code: codeToAnalyze,
          language: lang,
          file_name: lang.toLowerCase() === 'python' ? 'main.py' : 'index.js'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to trigger scan job');
      }
      
      const jobData = await res.json();
      
      // Auto Index in ChromaDB for RAG search
      await fetch('/api/rag/index/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: lang.toLowerCase() === 'python' ? 'main.py' : 'index.js',
          code: codeToAnalyze
        })
      });

      // Query AI Review Suggestions from Gemini to construct reviewSummary
      const reviewRes = await fetch('/api/ai/review/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToAnalyze, language: lang })
      });
      const reviewData = reviewRes.ok ? await reviewRes.json() : { reviewSummary: 'Detailed review completed.', suggestions: [] };

      // Map Job metrics to Local Mapped Results
      const mi = jobData.tech_debt?.maintainability_index || 80;
      const cc = jobData.tech_debt?.cyclomatic_complexity || 2;
      
      const mappedIssues = jobData.issues || [];
      const dbBugs = mappedIssues.filter((i: any) => i.category !== 'Security');
      const dbSec = mappedIssues.filter((i: any) => i.category === 'Security');
      
      const secScore = Math.max(0, 100 - (dbSec.length * 15));
      const performanceScore = Math.max(20, 100 - (cc * 5));

      const finalMappedResults: AnalysisResultsMapped = {
        id: jobData.id,
        scores: {
          readability: Math.round(mi * 0.95),
          maintainability: Math.round(mi),
          security: secScore,
          performance: performanceScore,
          overall: Math.round((mi + secScore + performanceScore) / 3)
        },
        bugs: dbBugs.map((b: any) => ({
          severity: b.severity,
          line: b.line,
          issue: b.message,
          suggestedFix: b.suggested_fix
        })),
        vulnerabilities: dbSec.map((s: any) => ({
          riskLevel: s.severity,
          name: s.category,
          impact: s.message,
          recommendation: s.suggested_fix
        })),
        optimizations: (reviewData.suggestions || []).map((opt: any) => ({
          type: opt.type,
          suggestion: opt.issue + " -> " + opt.solution
        })),
        reviewSummary: reviewData.reviewSummary || 'Code scanned successfully.'
      };

      setResults(finalMappedResults);
      toast.success('Analysis job completed successfully', { id: toastId });

    } catch (err: any) {
      setError(err.message);
      toast.error('Analysis pipeline failed', { id: toastId, description: err.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runMultiAnalysis = async () => {
    if (repoFiles.length === 0) {
      if (!code.trim()) {
        setError('Please provide code to analyze.');
        return;
      }
      await runAnalysis(code, language, selectedProjectId || '1');
      return;
    }

    if (selectedFilePaths.length === 0) {
      toast.error('Please select at least one file to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    const toastId = toast.loading(`Initializing analysis for ${selectedFilePaths.length} files...`);

    try {
      const allBugs: any[] = [];
      const allVulns: any[] = [];
      const allOpts: any[] = [];
      const summaries: string[] = [];
      
      const scoresAccumulator = {
        readability: 0,
        maintainability: 0,
        security: 0,
        performance: 0,
        overall: 0
      };

      for (let i = 0; i < selectedFilePaths.length; i++) {
        const filePath = selectedFilePaths[i];
        const fileObj = repoFiles.find(f => f.path === filePath);
        if (!fileObj) continue;

        setScanProgress({
          current: i + 1,
          total: selectedFilePaths.length,
          fileName: fileObj.path
        });

        // 1. Trigger scan job
        const res = await fetch('/api/analysis/jobs/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: selectedProjectId || '1',
            code: fileObj.code,
            language: fileObj.language,
            file_name: fileObj.name
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(`Failed to scan file ${fileObj.path}: ${errData.error || 'Unknown error'}`);
        }

        const jobData = await res.json();

        // 2. Index in RAG
        try {
          await fetch('/api/rag/index/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_path: fileObj.path,
              code: fileObj.code
            })
          });
        } catch (e) {
          console.error(`RAG index failed for ${fileObj.path}:`, e);
        }

        // 3. Query review summary
        let reviewData = { reviewSummary: 'File scanned.', suggestions: [] };
        try {
          const reviewRes = await fetch('/api/ai/review/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: fileObj.code, language: fileObj.language })
          });
          if (reviewRes.ok) {
            reviewData = await reviewRes.json();
          }
        } catch (e) {
          console.error(`Review failed for ${fileObj.path}:`, e);
        }

        // 4. Calculate scores for this file
        const mi = jobData.tech_debt?.maintainability_index || 80;
        const cc = jobData.tech_debt?.cyclomatic_complexity || 2;
        const dbBugs = (jobData.issues || []).filter((issue: any) => issue.category !== 'Security');
        const dbSec = (jobData.issues || []).filter((issue: any) => issue.category === 'Security');
        
        const fileSecScore = Math.max(0, 100 - (dbSec.length * 15));
        const filePerfScore = Math.max(20, 100 - (cc * 5));
        const fileReadScore = Math.round(mi * 0.95);
        const fileMaintScore = Math.round(mi);

        scoresAccumulator.readability += fileReadScore;
        scoresAccumulator.maintainability += fileMaintScore;
        scoresAccumulator.security += fileSecScore;
        scoresAccumulator.performance += filePerfScore;
        scoresAccumulator.overall += Math.round((fileReadScore + fileMaintScore + fileSecScore + filePerfScore) / 4);

        // 5. Map issues with file name prepended
        allBugs.push(...dbBugs.map((b: any) => ({
          severity: b.severity,
          line: `${fileObj.path}:${b.line}`,
          issue: `[${fileObj.name}] ${b.message}`,
          suggestedFix: b.suggested_fix
        })));

        allVulns.push(...dbSec.map((s: any) => ({
          riskLevel: s.severity,
          name: `[${fileObj.name}] ${s.category}`,
          impact: s.message,
          recommendation: s.suggested_fix
        })));

        allOpts.push(...(reviewData.suggestions || []).map((opt: any) => ({
          type: opt.type,
          suggestion: `[${fileObj.name}] ${opt.issue} -> ${opt.solution}`
        })));

        if (reviewData.reviewSummary) {
          summaries.push(`### ${fileObj.name}\n${reviewData.reviewSummary}`);
        }
      }

      // Compute averages
      const totalCount = selectedFilePaths.length;
      const finalMappedResults: AnalysisResultsMapped = {
        id: Date.now(),
        scores: {
          readability: Math.round(scoresAccumulator.readability / totalCount),
          maintainability: Math.round(scoresAccumulator.maintainability / totalCount),
          security: Math.round(scoresAccumulator.security / totalCount),
          performance: Math.round(scoresAccumulator.performance / totalCount),
          overall: Math.round(scoresAccumulator.overall / totalCount)
        },
        bugs: allBugs,
        vulnerabilities: allVulns,
        optimizations: allOpts,
        reviewSummary: summaries.join('\n\n') || 'Repository audit completed successfully.'
      };

      setResults(finalMappedResults);
      toast.success(`Scanned ${totalCount} files successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error('Audit pipeline failed', { id: toastId, description: err.message });
    } finally {
      setIsAnalyzing(false);
      setScanProgress(null);
    }
  };

  const handleAnalyze = runMultiAnalysis;

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    setIsAutoDetected(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    let detectedLang = language;
    let didDetect = false;

    switch (ext) {
      case 'py': detectedLang = 'Python'; didDetect = true; break;
      case 'js':
      case 'jsx': detectedLang = 'JavaScript'; didDetect = true; break;
      case 'ts':
      case 'tsx': detectedLang = 'TypeScript'; didDetect = true; break;
      case 'java': detectedLang = 'Java'; didDetect = true; break;
      case 'cs': detectedLang = 'C#'; didDetect = true; break;
      case 'php': detectedLang = 'PHP'; didDetect = true; break;
      case 'go': detectedLang = 'Go'; didDetect = true; break;
      case 'rs': detectedLang = 'Rust'; didDetect = true; break;
      case 'kt': detectedLang = 'Kotlin'; didDetect = true; break;
    }

    if (didDetect) {
      setLanguage(detectedLang);
      setIsAutoDetected(true);
      toast.info(`Language auto-detected: ${detectedLang}`);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCode(event.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (results) {
    return (
      <AnalysisResults 
        code={code}
        results={results} 
        language={language}
        onBack={() => {
          setResults(null);
        }} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            VCS Code Intelligence Input
          </h2>
          
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none w-44"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            
            <button
              onClick={() => setIsAddProjectOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 p-2 rounded-lg text-slate-700 hover:text-slate-900 transition-colors"
              title="Add Repository Project"
            >
              <Plus className="w-4 h-4" />
            </button>

            {gitUrl && (
              <button
                onClick={handleFetchGitCode}
                disabled={isFetchingGit}
                className="bg-blue-50 hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 border border-blue-200 disabled:border-slate-200 px-3 py-2 rounded-lg text-blue-700 hover:text-blue-900 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Fetch code from Git Repository"
              >
                {isFetchingGit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderGit2 className="w-3.5 h-3.5" />}
                Fetch Git Code
              </button>
            )}
            
            <select 
              value={language}
              onChange={handleLanguageChange}
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
            >
              <option value="Python">Python</option>
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Java">Java</option>
              <option value="C#">C#</option>
              <option value="PHP">PHP</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
              <option value="Kotlin">Kotlin</option>
            </select>
            
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-300">
              <UploadCloud className="w-4 h-4" />
              Upload Source
              <input type="file" className="hidden" accept=".py,.js,.ts,.tsx,.jsx,.java,.cs,.php,.go,.rs,.kt" onChange={handleFileUpload} />
            </label>
          </div>
        </div>        <div className="flex-1 p-0 relative bg-slate-50 flex flex-row min-h-[50vh]">
          {repoFiles.length > 0 && (
            <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
              <div className="p-3 border-b border-slate-200 bg-white flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>Repository Files</span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-bold">
                    {selectedFilePaths.length} / {repoFiles.length}
                  </span>
                </div>
                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => setSelectedFilePaths(repoFiles.map(f => f.path))}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedFilePaths([])}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {repoFiles.map(file => {
                  const isChecked = selectedFilePaths.includes(file.path);
                  const isActive = activeFilePath === file.path;
                  return (
                    <div
                      key={file.path}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors group ${
                        isActive ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFilePaths(prev => [...prev, file.path]);
                          } else {
                            setSelectedFilePaths(prev => prev.filter(p => p !== file.path));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                      />
                      <button
                        onClick={() => {
                          setActiveFilePath(file.path);
                          setCode(file.code);
                          setLanguage(file.language);
                        }}
                        className={`flex-1 text-left truncate font-medium ${
                          isActive ? 'text-blue-700 font-semibold' : 'text-slate-700 hover:text-slate-900'
                        }`}
                        title={file.path}
                      >
                        {file.path}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col relative bg-white">
            {repoFiles.length > 0 && activeFilePath && (
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate max-w-[400px]">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  {activeFilePath}
                </span>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  {language}
                </span>
              </div>
            )}

            {code.trim() === '' && repoFiles.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-none">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 pointer-events-auto">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Direct GitHub Import</h3>
                      <p className="text-xs text-slate-500">Analyze any public repository without copy-pasting.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://github.com/username/repo"
                      value={directRepoUrl}
                      onChange={(e) => setDirectRepoUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                    />
                    <button
                      onClick={() => handleFetchCodeFromUrl(directRepoUrl)}
                      disabled={isFetchingGit || !directRepoUrl.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      {isFetchingGit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      Fetch & Load
                    </button>
                  </div>
                  <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                    Or simply start typing or paste code directly into the editor.
                  </div>
                </div>
              </div>
            )}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste code modules or select imported repository files..."
              className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-sm text-slate-800"
              spellCheck={false}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-t border-red-100 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={runMultiAnalysis}
            disabled={isAnalyzing || (!code.trim() && repoFiles.length === 0) || !selectedProjectId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Auditing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Start Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Project Modal */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-blue-600" />
                Import Git Repository
              </h3>
              <button 
                onClick={() => !isImporting && setIsAddProjectOpen(false)} 
                disabled={isImporting}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  required
                  disabled={isImporting}
                  placeholder="e.g. NotificationService"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  placeholder="Module details..."
                  disabled={isImporting}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Repository Git URL</label>
                <input 
                  type="url" 
                  placeholder="https://github.com/org/repo"
                  disabled={isImporting}
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddProjectOpen(false)} 
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isImporting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Importing & Analyzing...
                    </>
                  ) : (
                    "Import Project"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisResults({ 
  code,
  results, 
  language,
  onBack, 
  activeTab, 
  setActiveTab 
}: { 
  code: string;
  results: AnalysisResultsMapped;
  language: string;
  onBack: () => void;
  activeTab: 'overview' | 'bugs' | 'security' | 'optimizations' | 'rag';
  setActiveTab: (tab: any) => void;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "Hi! I'm your AI coding assistant. Ask me anything about the analysis results, security vulnerabilities, or ask me to write a patch." }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // RAG Search States
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [isSearchingRag, setIsSearchingRag] = useState(false);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;
    
    const userMsg = currentMessage;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setCurrentMessage('');
    setIsTyping(true);
    
    try {
      const nextMessages = [...chatMessages, { role: 'user', content: userMsg }].map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content
      }));

      const res = await fetch('/api/ai/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          analysis: results,
          messages: nextMessages,
          language
        })
      });

      if (!res.ok) throw new Error('Failed to get chat response');
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (err: any) {
      toast.error('Failed to get AI assistant response');
      console.error(err);
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        content: "Sorry, I had trouble reaching the Gemini service. Please make sure your server is running and GEMINI_API_KEY is configured." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSearchRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setIsSearchingRag(true);
    try {
      const res = await fetch('/api/rag/search/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery })
      });
      if (!res.ok) throw new Error('RAG search failed');
      const data = await res.json();
      setRagResults(data.results || []);
    } catch (error) {
      toast.error('Failed to run semantic code search');
      console.error(error);
    } finally {
      setIsSearchingRag(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const exportToCSV = () => {
    let csv = 'Type,Severity/Risk,Issue Name,Location,Description,Recommendation\n';
    
    results.bugs.forEach(bug => {
      csv += `Bug,${bug.severity},Logical Error,"Line ${bug.line}","${bug.issue.replace(/"/g, '""')}","${bug.suggestedFix.replace(/"/g, '""')}"\n`;
    });

    results.vulnerabilities.forEach(vuln => {
      csv += `Vulnerability,${vuln.riskLevel},"${vuln.name.replace(/"/g, '""')}",General,"${vuln.impact.replace(/"/g, '""')}","${vuln.recommendation.replace(/"/g, '""')}"\n`;
    });

    results.optimizations.forEach(opt => {
      csv += `Optimization,Info,"Review","General","${opt.suggestion.replace(/"/g, '""')}","N/A"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported to CSV successfully');
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    
    // Add title
    doc.setFontSize(20);
    doc.text("Analysis Report", 14, 22);
    
    // Add generation date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add scores section
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text("Scores", 14, 40);
    
    doc.autoTable({
      startY: 45,
      head: [['Metric', 'Score']],
      body: [
        ['Overall', results.scores.overall],
        ['Security', results.scores.security],
        ['Maintainability', results.scores.maintainability],
        ['Performance', results.scores.performance],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    let currentY = doc.lastAutoTable.finalY + 15;
    
    // Summary
    doc.setFontSize(14);
    doc.text("Review Summary", 14, currentY);
    doc.setFontSize(11);
    doc.setTextColor(80);
    const splitSummary = doc.splitTextToSize(results.reviewSummary, 180);
    doc.text(splitSummary, 14, currentY + 7);
    
    currentY += splitSummary.length * 5 + 15;
    
    // Vulnerabilities
    if (results.vulnerabilities.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Vulnerabilities", 14, currentY);
      
      const vBody = results.vulnerabilities.map(v => [
        v.riskLevel,
        v.name,
        v.impact,
        v.recommendation
      ]);
      
      doc.autoTable({
        startY: currentY + 5,
        head: [['Risk', 'Name', 'Impact', 'Recommendation']],
        body: vBody,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }
    
    // Bugs
    if (results.bugs.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Bugs", 14, currentY);
      
      const bBody = results.bugs.map(b => [
        `Line ${b.line}`,
        b.severity,
        b.issue,
        b.suggestedFix
      ]);
      
      doc.autoTable({
        startY: currentY + 5,
        head: [['Line', 'Severity', 'Issue', 'Fix']],
        body: bBody,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] }
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }
    
    // Optimizations
    if (results.optimizations.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("Optimizations", 14, currentY);
      
      const oBody = results.optimizations.map(o => [
        o.type,
        o.suggestion
      ]);
      
      doc.autoTable({
        startY: currentY + 5,
        head: [['Type', 'Suggestion']],
        body: oBody,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });
    }
    
    doc.save(`analysis_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Report exported to PDF successfully');
  };

  const emailReport = async () => {
    setIsSendingEmail(true);
    const toastId = toast.loading('Preparing code analysis report...');
    try {
      // 1. Fetch current profile to get user email and EmailJS config
      const profileRes = await fetch('/api/profile');
      if (!profileRes.ok) throw new Error('Failed to retrieve user profile');
      const profile = await profileRes.json();
      
      const targetEmail = profile.email || 'alex.chen@example.com';
      const serviceId = profile.emailjsServiceId || '';
      const templateId = profile.emailjsTemplateId || '';
      const publicKey = profile.emailjsPublicKey || '';

      // 2. Construct email subject and body
      const subjectLine = `[BugHunter AI] Scan Report for Project: ${results.scores.overall >= 80 ? 'Healthy' : 'Needs Review'}`;
      const emailBody = `Hi ${profile.displayName || 'Developer'},\n\n` +
        `Your BugHunter AI security scan has completed for project reference #${results.id}.\n\n` +
        `--- OVERALL RATING: ${results.scores.overall}/100 ---\n` +
        `• Readability: ${results.scores.readability}/100\n` +
        `• Maintainability: ${results.scores.maintainability}/100\n` +
        `• Security: ${results.scores.security}/100\n` +
        `• Performance: ${results.scores.performance}/100\n\n` +
        `--- DETECTED BUGS (${results.bugs.length}) ---\n` +
        (results.bugs.length === 0 ? 'No bugs detected.\n' : results.bugs.map((b, idx) => `${idx + 1}. Severity: ${b.severity} | Issue: ${b.issue} (Suggested Fix: ${b.suggestedFix})\n`).join('')) + '\n' +
        `--- VULNERABILITIES (${results.vulnerabilities.length}) ---\n` +
        (results.vulnerabilities.length === 0 ? 'No vulnerabilities detected.\n' : results.vulnerabilities.map((v, idx) => `${idx + 1}. Risk: ${v.riskLevel} | ${v.name}: ${v.impact}\n`).join('')) + '\n' +
        `--- SUMMARY ---\n` +
        `${results.reviewSummary}\n\n` +
        `Regards,\n` +
        `BugHunter AI Scanner Agent`;

      const isConfigured = serviceId.trim() && templateId.trim() && publicKey.trim();
      
      if (isConfigured) {
        // Send email via EmailJS
        await emailjs.send(
          serviceId.trim(),
          templateId.trim(),
          {
            to_email: targetEmail,
            subject: subjectLine,
            message: emailBody
          },
          publicKey.trim()
        );
        toast.success(`Report emailed to ${targetEmail} via EmailJS!`, { id: toastId });
      } else {
        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success(`Report emailed to ${targetEmail} (Simulated Sandbox)`, {
          id: toastId,
          description: 'Configure EmailJS keys in Settings to send actual emails.'
        });
      }

      // Save email to database sent folder
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'alex.chen@example.com',
          to: targetEmail,
          subject: subjectLine,
          body: emailBody,
          folder: 'sent',
          read: true
        })
      });
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to send email report: ${err.text || err.message || err}`, { id: toastId });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Intelligence Scan Report</h2>
            <p className="text-sm text-slate-500">Job Reference ID: #{results.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 border ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
          >
            <MessageSquare className="w-4 h-4" /> {isChatOpen ? 'Close AI Assistant' : 'Ask AI'}
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <button 
            onClick={exportToPDF}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button 
            onClick={emailReport}
            disabled={isSendingEmail}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
          >
            {isSendingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Email Report
          </button>
          <button 
            onClick={exportToCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ScoreCard label="Overall" score={results.scores.overall} />
        <ScoreCard label="Security" score={results.scores.security} />
        <ScoreCard label="Maintainability" score={results.scores.maintainability} />
        <ScoreCard label="Performance" score={results.scores.performance} />
        <ScoreCard label="Readability" score={results.scores.readability} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className={`flex-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all ${isChatOpen ? 'lg:w-2/3' : 'w-full'}`}>
          <div className="flex border-b border-slate-200 flex-wrap">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<CheckCircle2 />} label="Overview" />
            <TabButton active={activeTab === 'bugs'} onClick={() => setActiveTab('bugs')} icon={<BugIcon />} label={`Issues (${results.bugs.length})`} />
            <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield />} label={`Security (${results.vulnerabilities.length})`} />
            <TabButton active={activeTab === 'optimizations'} onClick={() => setActiveTab('optimizations')} icon={<Zap />} label="Review" />
            <TabButton active={activeTab === 'rag'} onClick={() => setActiveTab('rag')} icon={<Database />} label="RAG Search" />
          </div>

          <div className="p-6 min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      AI Review Summary
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 leading-relaxed font-sans">
                      {results.reviewSummary}
                    </div>
                  </div>
                )}

                {activeTab === 'bugs' && (
                  <div className="space-y-4">
                    {results.bugs.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No logical bugs or style violations detected. Clean module!</p>
                    ) : (
                      results.bugs.map((bug, i) => (
                        <div key={i} className="p-4 border border-amber-200 bg-amber-50 rounded-lg flex items-start gap-4">
                          <BugIcon className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-amber-900">Line {bug.line}</span>
                              <span className="text-xs bg-amber-200/50 text-amber-800 px-2 py-0.5 rounded-full font-medium">{bug.severity} Severity</span>
                            </div>
                            <p className="text-amber-800 font-medium mb-2">{bug.issue}</p>
                            {bug.suggestedFix && (
                              <div className="bg-white/60 p-3 rounded text-sm text-amber-900 border border-amber-100 font-mono">
                                <strong>Suggested Fix:</strong> {bug.suggestedFix}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-4">
                    {results.vulnerabilities.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No security vulnerabilities detected. Codebase complies with secure standards.</p>
                    ) : (
                      results.vulnerabilities.map((vuln, i) => (
                        <div key={i} className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-start gap-4">
                          <Shield className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-red-900">{vuln.name}</span>
                              <span className="text-xs bg-red-200/50 text-red-800 px-2 py-0.5 rounded-full font-medium">{vuln.riskLevel} Risk</span>
                            </div>
                            <p className="text-red-800 text-sm mb-2">{vuln.impact}</p>
                            {vuln.recommendation && (
                              <div className="bg-white/60 text-red-900 p-3 rounded text-sm border border-red-100">
                                <strong>Remediation:</strong> {vuln.recommendation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'optimizations' && (
                  <div className="space-y-4">
                    {results.optimizations.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No clean code optimization recommendations.</p>
                    ) : (
                      results.optimizations.map((opt, i) => (
                        <div key={i} className="p-4 border border-blue-200 bg-blue-50 rounded-lg flex items-start gap-4">
                          <Zap className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                          <div>
                            <span className="text-xs bg-blue-200/50 text-blue-800 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider block w-max mb-1">{opt.type}</span>
                            <p className="text-blue-950 font-medium leading-relaxed">{opt.suggestion}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'rag' && (
                  <div className="space-y-4">
                    <form onSubmit={handleSearchRag} className="flex gap-2 mb-6">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input 
                          type="text"
                          placeholder="Search repo code semantically (e.g. 'JWT secret')"
                          value={ragQuery}
                          onChange={(e) => setRagQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSearchingRag || !ragQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {isSearchingRag ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                      </button>
                    </form>
                    
                    <div className="space-y-4">
                      {ragResults.length === 0 ? (
                        <p className="text-slate-400 text-center py-8 text-xs font-medium">Use semantic query search to explore indexed code chunks.</p>
                      ) : (
                        ragResults.map((r, i) => (
                          <div key={i} className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600">
                              <span>Path: {r.file_path} (Chunk #{r.chunk_index})</span>
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Match: {(r.similarity * 100).toFixed(1)}%</span>
                            </div>
                            <pre className="p-4 font-mono text-[11px] overflow-x-auto bg-slate-900 text-slate-200 leading-normal">
                              <code>{r.document}</code>
                            </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        {isChatOpen && (
          <div className="w-full lg:w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[500px] sticky top-6">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" /> AI Code Explainer
              </h3>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
               {chatMessages.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                     {msg.content}
                   </div>
                 </div>
               ))}
               {isTyping && (
                 <div className="flex justify-start">
                   <div className="bg-white border border-slate-200 p-3 rounded-lg rounded-bl-none shadow-sm flex gap-1 items-center h-10">
                     <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                     <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                     <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                   </div>
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white shrink-0">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={currentMessage}
                  onChange={e => setCurrentMessage(e.target.value)}
                  placeholder="Ask about design patterns or request fixes..." 
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                />
                <button type="submit" disabled={!currentMessage.trim()} className="bg-blue-600 text-white p-2 text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {scanProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-xl border border-slate-200 shadow-xl p-6 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-base">Running Security Audit</h3>
              <p className="text-xs text-slate-500 mt-1">Analyzing repository files using static analysis and Gemini AI.</p>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-xs text-slate-400">
              <span className="truncate max-w-[250px] font-semibold text-slate-500">File: {scanProgress.fileName}</span>
              <span>{scanProgress.current} / {scanProgress.total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string, score: number }) {
  const isGood = score >= 80;
  const isWarn = score >= 60 && score < 80;
  const colorClass = isGood ? 'text-green-600' : isWarn ? 'text-amber-500' : 'text-red-500';
  
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
      <span className="text-xs font-bold text-slate-400 uppercase mb-1">{label}</span>
      <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 px-2 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none transition-colors ${
        active ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-b-2 border-transparent'
      }`}
    >
      <span className="w-4 h-4">{icon}</span>
      {label}
    </button>
  );
}
