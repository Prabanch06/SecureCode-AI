import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, ShieldAlert, Trash2, Check, X, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Developer' | 'Viewer';
  status: 'Active' | 'Pending';
  lastActive?: string;
}

const mockTeam: TeamMember[] = [
  { id: '1', name: 'Alex Chen', email: 'alex.chen@example.com', role: 'Admin', status: 'Active', lastActive: '2 mins ago' },
  { id: '2', name: 'Sarah Miller', email: 'sarah.m@example.com', role: 'Developer', status: 'Active', lastActive: '1 hr ago' },
  { id: '3', name: 'James Wilson', email: 'j.wilson@example.com', role: 'Developer', status: 'Active', lastActive: '5 hrs ago' },
  { id: '4', name: 'Elena Rodriguez', email: 'elena.r@example.com', role: 'Viewer', status: 'Pending' }
];

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Developer' | 'Viewer'>('Developer');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch team');
      const data = await res.json();
      setMembers(data);
    } catch (err: any) {
      toast.error('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    const toastId = toast.loading('Sending invitation email...');

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteEmail.split('@')[0],
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (!res.ok) throw new Error('Failed to send invite');
      const newMember = await res.json();

      // Retrieve profile for EmailJS configuration
      const profileRes = await fetch('/api/profile');
      let serviceId = '';
      let templateId = '';
      let publicKey = '';
      if (profileRes.ok) {
        const profile = await profileRes.json();
        serviceId = profile.emailjsServiceId || '';
        templateId = profile.emailjsTemplateId || '';
        publicKey = profile.emailjsPublicKey || '';
      }

      const subjectLine = 'Invitation to join BugHunter AI organization';
      const emailBody = `You have been invited to join the BugHunter AI workspace as a ${inviteRole}.\n\n` +
        `Please accept the invitation here: http://localhost:3000/accept-invite?id=${newMember.id}\n\n` +
        `Best regards,\nThe BugHunter Team`;

      const isConfigured = serviceId.trim() && templateId.trim() && publicKey.trim();

      if (isConfigured) {
        // Send email via EmailJS
        await emailjs.send(
          serviceId.trim(),
          templateId.trim(),
          {
            to_email: inviteEmail.trim(),
            subject: subjectLine,
            message: emailBody
          },
          publicKey.trim()
        );
        toast.success('Invitation sent and emailed via EmailJS!', { id: toastId });
      } else {
        // Simulated fallback mode
        await new Promise(resolve => setTimeout(resolve, 1200));
        toast.success('Invitation sent (Simulated Sandbox)', {
          id: toastId,
          description: `An invitation email has been simulated for ${newMember.email}. Configure EmailJS keys to send actual emails.`
        });
      }

      // Log sent email to database
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'alex.chen@example.com',
          to: inviteEmail.trim(),
          subject: subjectLine,
          body: emailBody,
          folder: 'sent',
          read: true
        })
      });

      // Also log to inbox if in simulated sandbox mode so user can view/accept it in the Email Hub
      if (!isConfigured) {
        await fetch('/api/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'system@bughunter.ai',
            to: inviteEmail.trim(),
            subject: `[Invitation] ${subjectLine}`,
            body: emailBody,
            folder: 'inbox',
            read: false
          })
        });
      }

      setMembers([...members, newMember]);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('Developer');
    } catch (err: any) {
      toast.error('Failed to invite member', { id: toastId });
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove member');

      setMembers(members.filter(m => m.id !== id));
      toast.success('Member removed', { description: `${name} has been removed from the team.` });
    } catch (err: any) {
      toast.error('Failed to remove member');
      console.error(err);
    }
  };

  const handleUpdateRole = async (id: string, newRole: typeof inviteRole) => {
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');

      setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
      toast.success('Role updated', { description: `Permissions have been updated.` });
    } catch (err: any) {
      toast.error('Failed to update role');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500 text-sm">Manage team access and repository permissions.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-blue-600 outline-none hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Search team members by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700" 
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{filteredMembers.length}</span> members found
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No members match your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as any)}
                        className="bg-white border outline-none border-slate-200 text-slate-700 text-xs rounded border-slate-300 focus:ring-blue-500 focus:border-blue-500 p-1"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Developer">Developer</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        member.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {member.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 block"></span>}
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {member.lastActive || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={member.role === 'Admin' && members.filter(m => m.role === 'Admin').length === 1}
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal Overlay */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Invite Team Member</h3>
              <button 
                onClick={() => !isInviting && setIsInviteModalOpen(false)}
                disabled={isInviting}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  disabled={isInviting}
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Role</label>
                <select 
                  value={inviteRole}
                  disabled={isInviting}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="Admin">Admin (Full access)</option>
                  <option value="Developer">Developer (Run scans, view code)</option>
                  <option value="Viewer">Viewer (Read-only reports)</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isInviting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isInviting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Send Invite
                    </>
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
