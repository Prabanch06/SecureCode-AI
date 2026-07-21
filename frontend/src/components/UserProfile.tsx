import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Key, Bell, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function UserProfile() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [emailjsServiceId, setEmailjsServiceId] = useState('');
  const [emailjsTemplateId, setEmailjsTemplateId] = useState('');
  const [emailjsPublicKey, setEmailjsPublicKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        setDisplayName(data.displayName || '');
        setEmail(data.email || '');
        setRole(data.role || '');
        setTwoFactorEnabled(data.twoFactorEnabled || false);
        setEmailAlerts(data.emailAlerts !== undefined ? data.emailAlerts : true);
        setEmailjsServiceId(data.emailjsServiceId || '');
        setEmailjsTemplateId(data.emailjsTemplateId || '');
        setEmailjsPublicKey(data.emailjsPublicKey || '');
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const saveProfileData = async (updatedFields: any) => {
    try {
      const updatedProfile = {
        displayName,
        email,
        role,
        twoFactorEnabled,
        emailAlerts,
        emailjsServiceId,
        emailjsTemplateId,
        emailjsPublicKey,
        ...updatedFields
      };
      
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });
      if (!res.ok) throw new Error('Failed to save profile');
      toast.success('Profile updated successfully.', { description: 'Your information has been saved.' });
    } catch (err) {
      toast.error('Failed to update profile.');
      console.error(err);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileData({ displayName, email });
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileData({ twoFactorEnabled });
  };

  const handleSaveEmailIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileData({ emailjsServiceId, emailjsTemplateId, emailjsPublicKey });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <p className="text-slate-500 text-sm">Manage your personal information and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Profile Details */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Personal Information</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <input
                    type="text"
                    value={role}
                    disabled
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Security Settings</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveSecurity} className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-800 mb-2">Change Password</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current Password"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-800">Two-Factor Authentication</h3>
                      <p className="text-xs text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={twoFactorEnabled}
                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2">
                    <Key className="w-4 h-4" /> Update Security
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notifications Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Notifications</h2>
            </div>
            <div className="p-4 space-y-4">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Email Alerts</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Receive reports via email.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-snug">Critical security vulnerabilities will always trigger an immediate notification.</p>
                </div>
              </div>
            </div>

          {/* Email Integration Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Email Integration</h2>
            </div>
            <div className="p-5">
              <form onSubmit={handleSaveEmailIntegration} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">EmailJS Service ID</label>
                  <input
                    type="text"
                    placeholder="e.g. service_gmail"
                    value={emailjsServiceId}
                    onChange={(e) => setEmailjsServiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">EmailJS Template ID</label>
                  <input
                    type="text"
                    placeholder="e.g. template_invite"
                    value={emailjsTemplateId}
                    onChange={(e) => setEmailjsTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">EmailJS Public Key</label>
                  <input
                    type="text"
                    placeholder="e.g. user_xxxxxxxxx"
                    value={emailjsPublicKey}
                    onChange={(e) => setEmailjsPublicKey(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-1">
                  <span className="text-[10px] font-bold text-blue-800 block uppercase">Setup Requirements:</span>
                  <p className="text-[10px] text-blue-700 leading-snug">
                    Create an account on <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">EmailJS</a>. Add your email service (Gmail), create a template, and bind the variables: <code className="font-mono bg-blue-100 px-1 rounded">to_email</code>, <code className="font-mono bg-blue-100 px-1 rounded">subject</code>, and <code className="font-mono bg-blue-100 px-1 rounded">message</code>.
                  </p>
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save API Keys
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
