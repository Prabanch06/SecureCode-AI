import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'db.json');

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

export interface ScanRecord {
  id: string;
  project: string;
  language: string;
  code: string;
  scores: {
    readability: number;
    maintainability: number;
    security: number;
    performance: number;
    overall: number;
  };
  bugs: Bug[];
  vulnerabilities: Vulnerability[];
  optimizations: Optimization[];
  reviewSummary: string;
  date: string; // ISO String
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Developer' | 'Viewer';
  status: 'Active' | 'Pending';
  lastActive?: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  emailAlerts: boolean;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
}

export interface EmailRecord {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  folder: 'inbox' | 'sent';
  read: boolean;
}

export interface ApiUsageLog {
  id: string;
  timestamp: string; // ISO String
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface Repository {
  id: string;
  name: string;
  git_url: string;
  branch: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  repositories: Repository[];
  created_at: string;
}

export interface DatabaseSchema {
  scans: ScanRecord[];
  team: TeamMember[];
  profile: UserProfile;
  apiUsageLogs: ApiUsageLog[];
  projects: Project[];
  emails: EmailRecord[];
}

const defaultDatabase: DatabaseSchema = {
  scans: [
    {
      id: '1',
      project: 'AuthService',
      language: 'Python',
      code: '# Sample AuthService Code\nimport os\nimport jwt\n\ndef generate_token(user_id):\n    # Mock authentication token generation\n    payload = {"user_id": user_id}\n    return jwt.encode(payload, "secret-key", algorithm="HS256")\n',
      scores: {
        readability: 80,
        maintainability: 75,
        security: 70,
        performance: 85,
        overall: 78
      },
      bugs: [
        { severity: 'Medium', line: 7, issue: 'Hardcoded JWT secret key "secret-key" is insecure.', suggestedFix: 'Use environment variables: os.environ.get("JWT_SECRET")' }
      ],
      vulnerabilities: [
        { riskLevel: 'High', name: 'Information Disclosure / Key exposure', impact: 'Hardcoded key allows token falsification.', recommendation: 'Extract secret credentials to safe vaults or dotenv configuration.' }
      ],
      optimizations: [
        { type: 'Architecture', suggestion: 'Move encryption operations to a dedicated security module.' }
      ],
      reviewSummary: 'The authentication service uses standard libraries, but security is compromised due to hardcoded secrets. Readability is decent, and performance is optimal.',
      date: '2026-06-18T12:00:00.000Z'
    },
    {
      id: '2',
      project: 'UserDashboard',
      language: 'JavaScript',
      code: 'function renderDashboard(user) {\n  const container = document.getElementById("dashboard");\n  container.innerHTML = "<h1>Welcome " + user.name + "</h1>";\n}',
      scores: {
        readability: 95,
        maintainability: 95,
        security: 90,
        performance: 98,
        overall: 95
      },
      bugs: [],
      vulnerabilities: [],
      optimizations: [],
      reviewSummary: 'Clean code. No obvious bugs. Small potential for XSS if user name is not sanitised.',
      date: '2026-06-17T09:30:00.000Z'
    },
    {
      id: '3',
      project: 'PaymentGateway',
      language: 'Java',
      code: 'public class PaymentGateway {\n  public void process(double amt) {\n    System.out.println("Processing amount: " + amt);\n  }\n}',
      scores: {
        readability: 65,
        maintainability: 60,
        security: 60,
        performance: 65,
        overall: 62
      },
      bugs: [
        { severity: 'High', line: 3, issue: 'Floating point double shouldn\'t be used for currency values.', suggestedFix: 'Use java.math.BigDecimal instead' }
      ],
      vulnerabilities: [
        { riskLevel: 'Medium', name: 'Precision Loss in Calculations', impact: 'Financial operations might lose fractions of cents leading to audit issues.', recommendation: 'Use BigDecimal or long integer representing cents.' }
      ],
      optimizations: [
        { type: 'Performance', suggestion: 'Avoid System.out.println in production; replace with SLF4J / Logback logger.' }
      ],
      reviewSummary: 'Needs significant refactoring for precision safety and production-ready logging in currency management.',
      date: '2026-06-15T15:45:00.000Z'
    }
  ],
  team: [
    { id: '1', name: 'Alex Chen', email: 'alex.chen@example.com', role: 'Admin', status: 'Active', lastActive: '2 mins ago' },
    { id: '2', name: 'Sarah Miller', email: 'sarah.m@example.com', role: 'Developer', status: 'Active', lastActive: '1 hr ago' },
    { id: '3', name: 'James Wilson', email: 'j.wilson@example.com', role: 'Developer', status: 'Active', lastActive: '5 hrs ago' },
    { id: '4', name: 'Elena Rodriguez', email: 'elena.r@example.com', role: 'Viewer', status: 'Pending' }
  ],
  profile: {
    displayName: 'Alex Chen',
    email: 'alex.chen@example.com',
    role: 'Developer',
    twoFactorEnabled: false,
    emailAlerts: true,
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: ''
  },
  apiUsageLogs: [
    // Pre-populated 7 days of token logs mirroring Dashboard/API Usage tab expectations
    { id: 'l1', timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(), endpoint: '/api/analyze', inputTokens: 4000, outputTokens: 2400, cost: 0.12 },
    { id: 'l2', timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), endpoint: '/api/analyze', inputTokens: 3000, outputTokens: 1398, cost: 0.08 },
    { id: 'l3', timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), endpoint: '/api/analyze', inputTokens: 2000, outputTokens: 9800, cost: 0.24 },
    { id: 'l4', timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), endpoint: '/api/analyze', inputTokens: 2780, outputTokens: 3908, cost: 0.15 },
    { id: 'l5', timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), endpoint: '/api/analyze', inputTokens: 1890, outputTokens: 4800, cost: 0.13 },
    { id: 'l6', timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), endpoint: '/api/analyze', inputTokens: 2390, outputTokens: 3800, cost: 0.11 },
    { id: 'l7', timestamp: new Date().toISOString(), endpoint: '/api/analyze', inputTokens: 3490, outputTokens: 4300, cost: 0.18 }
  ],
  projects: [
    {
      id: '1',
      name: 'AuthService',
      description: 'Enterprise auth provider microservice',
      repositories: [
        { id: '1', name: 'auth-service', git_url: 'https://github.com/org/auth-service.git', branch: 'main' }
      ],
      created_at: '2026-06-18T12:00:00.000Z'
    },
    {
      id: '2',
      name: 'UserDashboard',
      description: 'Portal frontend interface',
      repositories: [],
      created_at: '2026-06-17T09:30:00.000Z'
    },
    {
      id: '3',
      name: 'PaymentGateway',
      description: 'Payment integration service',
      repositories: [],
      created_at: '2026-06-15T15:45:00.000Z'
    }
  ],
  emails: [
    {
      id: 'e1',
      from: 'system@bughunter.ai',
      to: 'alex.chen@example.com',
      subject: 'Welcome to BugHunter AI!',
      body: 'Hi Alex,\n\nWelcome to BugHunter AI! We are thrilled to have you on board. You can start scanning your source code repositories immediately under the "New Analysis" tab.\n\nBest regards,\nThe BugHunter Team',
      date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      folder: 'inbox',
      read: true
    },
    {
      id: 'e2',
      from: 'alerts@bughunter.ai',
      to: 'alex.chen@example.com',
      subject: '[SECURITY ALERT] Hardcoded Secret Key Found',
      body: 'Hi Alex,\n\nA high-severity vulnerability was identified in the project "AuthService". A hardcoded JWT secret key was found in file "main.py" at line 7.\n\nPlease update the file immediately using environment variables or a secrets manager.\n\nView details: http://localhost:3000/history',
      date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      folder: 'inbox',
      read: false
    },
    {
      id: 'e3',
      from: 'sarah.m@example.com',
      to: 'alex.chen@example.com',
      subject: 'Sarah Miller accepted your team invitation',
      body: 'Sarah Miller has accepted your invitation to join the BugHunter organization as a Developer.\n\nShe is now listed as an Active member on the Team Management page.',
      date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      folder: 'inbox',
      read: false
    },
    {
      id: 'e4',
      from: 'alex.chen@example.com',
      to: 'elena.r@example.com',
      subject: 'Invitation to join BugHunter AI organization',
      body: 'You have been invited to join the BugHunter AI workspace as a Viewer.\n\nPlease accept the invitation here: http://localhost:3000/accept-invite?id=4',
      date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      folder: 'sent',
      read: true
    }
  ]
};

// Database utility methods
export function getDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    saveDatabase(defaultDatabase);
    return defaultDatabase;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    
    // Proactively initialize projects if missing or empty
    if (!db.projects || db.projects.length === 0) {
      db.projects = defaultDatabase.projects;
      saveDatabase(db);
    }

    // Proactively initialize emails if missing or empty
    if (!db.emails || db.emails.length === 0) {
      db.emails = defaultDatabase.emails;
      saveDatabase(db);
    }
    
    return db;
  } catch (error) {
    console.error('Error reading JSON database, resetting to default:', error);
    saveDatabase(defaultDatabase);
    return defaultDatabase;
  }
}

export function saveDatabase(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write JSON database:', error);
  }
}

export function getScans(): ScanRecord[] {
  return getDatabase().scans;
}

export function addScan(scan: Omit<ScanRecord, 'id' | 'date'>): ScanRecord {
  const db = getDatabase();
  const newScan: ScanRecord = {
    ...scan,
    id: Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString()
  };
  db.scans.unshift(newScan); // Newest first
  saveDatabase(db);
  return newScan;
}

export function deleteScan(id: string): boolean {
  const db = getDatabase();
  const initialLength = db.scans.length;
  db.scans = db.scans.filter(s => s.id !== id);
  if (db.scans.length !== initialLength) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getTeam(): TeamMember[] {
  return getDatabase().team;
}

export function addTeamMember(name: string, email: string, role: TeamMember['role']): TeamMember {
  const db = getDatabase();
  const newMember: TeamMember = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    email,
    role,
    status: 'Pending'
  };
  db.team.push(newMember);
  saveDatabase(db);
  return newMember;
}

export function updateTeamMemberRole(id: string, role: TeamMember['role']): boolean {
  const db = getDatabase();
  const member = db.team.find(m => m.id === id);
  if (member) {
    member.role = role;
    saveDatabase(db);
    return true;
  }
  return false;
}

export function deleteTeamMember(id: string): boolean {
  const db = getDatabase();
  const initialLength = db.team.length;
  db.team = db.team.filter(m => m.id !== id);
  if (db.team.length !== initialLength) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getProfile(): UserProfile {
  return getDatabase().profile;
}

export function saveProfile(profile: UserProfile): void {
  const db = getDatabase();
  db.profile = profile;
  saveDatabase(db);
}

export function logUsage(endpoint: string, inputTokens: number, outputTokens: number): ApiUsageLog {
  const db = getDatabase();
  
  // Calculate cost:
  // For gemini-2.5-pro or general: $1.25 per million input tokens, $5.00 per million output tokens (approximate generic)
  const inputCost = (inputTokens / 1_000_000) * 1.25;
  const outputCost = (outputTokens / 1_000_000) * 5.00;
  const totalCost = parseFloat((inputCost + outputCost).toFixed(4));
  
  const logEntry: ApiUsageLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    endpoint,
    inputTokens,
    outputTokens,
    cost: totalCost
  };
  
  db.apiUsageLogs.push(logEntry);
  saveDatabase(db);
  return logEntry;
}

export function getUsageLogs(): ApiUsageLog[] {
  return getDatabase().apiUsageLogs;
}

export function getEmails(): EmailRecord[] {
  return getDatabase().emails || [];
}

export function addEmail(email: Omit<EmailRecord, 'id' | 'date'>): EmailRecord {
  const db = getDatabase();
  const newEmail: EmailRecord = {
    ...email,
    id: Math.random().toString(36).substring(2, 9),
    date: new Date().toISOString()
  };
  db.emails = db.emails || [];
  db.emails.unshift(newEmail); // Newest first
  saveDatabase(db);
  return newEmail;
}

export function markEmailAsRead(id: string): boolean {
  const db = getDatabase();
  db.emails = db.emails || [];
  const email = db.emails.find(e => e.id === id);
  if (email) {
    email.read = true;
    saveDatabase(db);
    return true;
  }
  return false;
}
