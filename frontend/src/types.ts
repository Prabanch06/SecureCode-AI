export interface AnalysisScores {
  readability: number;
  maintainability: number;
  security: number;
  performance: number;
  overall: number;
}

export interface Bug {
  severity: "High" | "Medium" | "Low";
  line: number | string;
  issue: string;
  suggestedFix: string;
}

export interface Vulnerability {
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  name: string;
  impact: string;
  recommendation: string;
}

export interface Optimization {
  type: "Performance" | "Memory" | "Database" | "Architecture";
  suggestion: string;
}

export interface AnalysisResponse {
  scores: AnalysisScores;
  bugs: Bug[];
  vulnerabilities: Vulnerability[];
  optimizations: Optimization[];
  reviewSummary: string;
}

export interface ScanHistory {
  id: string;
  project: string;
  language: string;
  bugs: number;
  vulnerabilities: number;
  score: number;
  date: string;
}
