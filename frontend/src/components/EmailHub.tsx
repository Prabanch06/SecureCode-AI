import React, { useState, useEffect } from 'react';
import { Mail, Send, Inbox, Settings, Search, Trash2, Loader2, Check, AlertCircle, Sparkles, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  folder: 'inbox' | 'sent';
  read: boolean;
}

const renderBodyWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function EmailHub() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'compose' | 'config'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // EmailJS configuration states
  const [serviceId, setServiceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Compose states
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/emails');
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data = await res.json();
      setEmails(data);
      
      // Auto-select first email in the current folder if none selected
      if (data.length > 0 && !selectedEmailId) {
        const folderEmails = data.filter((e: Email) => e.folder === activeFolder);
        if (folderEmails.length > 0) {
          setSelectedEmailId(folderEmails[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load mailbox data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setServiceId(data.emailjsServiceId || '');
        setTemplateId(data.emailjsTemplateId || '');
        setPublicKey(data.emailjsPublicKey || '');
      }
    } catch (err) {
      console.error('Failed to load profile settings', err);
    }
  };

  useEffect(() => {
    fetchEmails();
    fetchProfile();
  }, []);

  // Update selection when active folder changes
  useEffect(() => {
    const folderEmails = emails.filter((e: Email) => e.folder === activeFolder);
    if (folderEmails.length > 0) {
      setSelectedEmailId(folderEmails[0].id);
    } else {
      setSelectedEmailId(null);
    }
  }, [activeFolder, emails]);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmailId(email.id);
    if (email.folder === 'inbox' && !email.read) {
      try {
        const res = await fetch(`/api/emails/${email.id}/read`, { method: 'PUT' });
        if (res.ok) {
          setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
        }
      } catch (err) {
        console.error('Failed to mark email as read', err);
      }
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const profileRes = await fetch('/api/profile');
      if (!profileRes.ok) throw new Error('Failed to fetch profile metadata');
      const profileData = await profileRes.json();

      const updatedProfile = {
        ...profileData,
        emailjsServiceId: serviceId,
        emailjsTemplateId: templateId,
        emailjsPublicKey: publicKey
      };

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });

      if (!res.ok) throw new Error('Failed to update email settings');
      toast.success('EmailJS settings updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !subject.trim() || !bodyText.trim()) {
      toast.error('All compose fields are required');
      return;
    }

    setIsSending(true);
    const isConfigured = serviceId.trim() && templateId.trim() && publicKey.trim();
    const toastId = toast.loading(isConfigured ? 'Sending email via EmailJS...' : 'Sending simulated email...');

    try {
      if (isConfigured) {
        // Send email via EmailJS
        // Parameters match common template keys: to_email, subject, message
        await emailjs.send(
          serviceId.trim(),
          templateId.trim(),
          {
            to_email: toEmail.trim(),
            subject: subject.trim(),
            message: bodyText.trim()
          },
          publicKey.trim()
        );
        toast.success('Email sent successfully via EmailJS!', { id: toastId });
      } else {
        // Simulated fallback mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Simulated email sent successfully!', {
          id: toastId,
          description: 'Configure EmailJS keys in Settings to send actual emails.'
        });
      }

      // Log sent email to backend database
      const saveRes = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'alex.chen@example.com', // Logged in user email
          to: toEmail.trim(),
          subject: subject.trim(),
          body: bodyText.trim(),
          folder: 'sent',
          read: true
        })
      });

      if (saveRes.ok) {
        const savedEmail = await saveRes.json();
        setEmails(prev => [savedEmail, ...prev]);
      }

      // Reset Form & Switch Folder
      setToEmail('');
      setSubject('');
      setBodyText('');
      setActiveFolder('sent');
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to send email: ${err.text || err.message || err}`, { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const filteredEmails = emails
    .filter(e => e.folder === activeFolder)
    .filter(e => 
      e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.to.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const selectedEmail = emails.find(e => e.id === selectedEmailId);
  const unreadCount = emails.filter(e => e.folder === 'inbox' && !e.read).length;

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Email Hub</h1>
        <p className="text-slate-500 text-sm">Send security reports, dispatch invitations, and manage alerts via EmailJS.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-1 overflow-hidden min-h-[60vh] max-h-[75vh]">
        {/* Left Pane - Folders */}
        <div className="w-56 border-r border-slate-200 bg-slate-50 flex flex-col justify-between shrink-0">
          <div className="p-4 space-y-1">
            <button 
              onClick={() => setActiveFolder('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'inbox' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                <span>Inbox</span>
              </div>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveFolder('sent')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'sent' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Mail</span>
            </button>
            
            <div className="h-px bg-slate-200 my-4" />

            <button 
              onClick={() => setActiveFolder('compose')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'compose' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-4.5 h-4.5 text-blue-600" />
              <span>Compose Email</span>
            </button>

            <button 
              onClick={() => setActiveFolder('config')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'config' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configure EmailJS</span>
            </button>
          </div>

          <div className="p-4 border-t border-slate-200 text-xs text-slate-400 flex items-center gap-1.5 justify-center">
            <span className={`w-2 h-2 rounded-full ${serviceId && templateId && publicKey ? 'bg-green-500' : 'bg-amber-400'}`}></span>
            {serviceId && templateId && publicKey ? 'EmailJS Connected' : 'Simulated Sandbox'}
          </div>
        </div>

        {/* Middle & Right Switcher */}
        {activeFolder === 'config' ? (
          /* Configuration Panel */
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            <div className="max-w-md space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  EmailJS Configuration Settings
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Connect your personal EmailJS account to enable real email dispatch for reports and invitations.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. service_gmail"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Template ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. template_invite"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Public Key</label>
                  <input 
                    type="password" 
                    placeholder="e.g. user_A1b2C3d4E5f6G7h8I"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-850"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSavingConfig}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    {isSavingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Configuration
                  </button>
                </div>
              </form>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed space-y-2 mt-6">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Note on Template parameters
                </div>
                <p>
                  Your EmailJS template should include the following variables to correctly bind reports and invitations:
                </p>
                <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
                  <li>{"{{to_email}}"} - Receiver email address</li>
                  <li>{"{{subject}}"} - Title of the message</li>
                  <li>{"{{message}}"} - Full body of the notification</li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeFolder === 'compose' ? (
          /* Compose Panel */
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            <div className="max-w-xl space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Compose New Email Message
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Send details, alerts, or queries directly from this panel.
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Email</label>
                  <input 
                    type="email" 
                    required
                    placeholder="recipient@example.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Project Code Quality Review Report"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-850"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                  <textarea 
                    required
                    rows={8}
                    placeholder="Type your message details here..."
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-850 animate-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Email
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Inbox or Sent Split Pane */
          <>
            {/* List Pane */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-white">
              {/* Search Toolbar */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 relative">
                <span className="absolute inset-y-0 left-6 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  placeholder={`Search ${activeFolder}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-850"
                />
              </div>

              {/* Mail list */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No emails found in this folder.
                  </div>
                ) : (
                  filteredEmails.map(email => (
                    <div 
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors relative flex flex-col gap-1 ${
                        selectedEmailId === email.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : ''
                      } ${!email.read && email.folder === 'inbox' ? 'bg-slate-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs truncate max-w-[170px] ${!email.read && email.folder === 'inbox' ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                          {activeFolder === 'inbox' ? email.from : `To: ${email.to}`}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(email.date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className={`text-xs truncate ${!email.read && email.folder === 'inbox' ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
                        {email.subject}
                      </div>
                      
                      <div className="text-[11px] text-slate-450 truncate">
                        {email.body}
                      </div>

                      {!email.read && email.folder === 'inbox' && (
                        <div className="absolute right-4 bottom-4 w-2 h-2 rounded-full bg-blue-600"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Preview Pane */}
            <div className="flex-1 bg-white flex flex-col min-w-0">
              {selectedEmail ? (
                <div className="flex-1 flex flex-col min-h-0 animate-none">
                  {/* Preview Header */}
                  <div className="p-6 border-b border-slate-200 shrink-0">
                    <div className="flex justify-between items-start gap-4">
                      <h2 className="text-base font-bold text-slate-800 leading-snug">
                        {selectedEmail.subject}
                      </h2>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3 flex-wrap gap-2">
                      <div className="space-y-1">
                        <div>
                          <span className="font-semibold text-slate-700">From:</span> {selectedEmail.from}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">To:</span> {selectedEmail.to}
                        </div>
                      </div>
                      <div>
                        {new Date(selectedEmail.date).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Preview Body */}
                  <div className="flex-1 p-6 overflow-y-auto font-sans text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-0 text-slate-850">
                    {renderBodyWithLinks(selectedEmail.body)}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs">
                  <Mail className="w-12 h-12 text-slate-300 mb-2.5" />
                  Select an email to read its contents.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
