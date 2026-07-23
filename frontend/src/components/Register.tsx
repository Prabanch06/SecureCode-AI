import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, User, Eye, Shield, Github } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import api from '../lib/api';

interface RegisterProps {
  onRegisterSuccess: (user: any) => void;
  onNavigateToLogin: () => void;
}

export function Register({ onRegisterSuccess, onNavigateToLogin }: RegisterProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleGithubLogin = () => {
    window.location.href = '/api/auth/accounts/github/login/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register/', { username, email, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      onRegisterSuccess(res.data.user);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.username?.[0] || 
        err.response?.data?.email?.[0] || 
        err.response?.data?.password?.[0] || 
        'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#D4E9F7] flex items-center justify-center p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="w-full max-w-5xl bg-white/40 backdrop-blur-md rounded-[2.5rem] p-4 md:p-8 shadow-xl border border-white/60 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Illustration */}
        <div className="hidden lg:flex lg:col-span-6 flex-col items-center justify-center p-4">
          <motion.img 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            src="/assets/login_illustration.png" 
            alt="Developer coding vector illustration" 
            className="w-full max-w-md h-auto object-contain rounded-2xl"
          />
        </div>

        {/* Right Side: Form Card */}
        <div className="col-span-1 lg:col-span-6">
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl space-y-8 border border-slate-100/50"
          >
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold text-[#2e266f] tracking-tight">Create Account</h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                An Intelligent Vulnerability Detection and Secure Code Review System
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-500 text-sm leading-relaxed"
              >
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                    <Eye className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#3b3486] hover:bg-[#2c2763] disabled:bg-[#4b43a3] text-white rounded-full text-sm font-semibold shadow-lg shadow-[#3b3486]/20 active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Sign Up'
                )}
              </motion.button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGithubLogin}
              className="w-full py-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Github className="w-5 h-5 text-slate-900" />
              <span>Sign up with GitHub</span>
            </motion.button>

            <div className="pt-2 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <button onClick={onNavigateToLogin} className="text-[#3b3486] hover:underline font-semibold cursor-pointer">
                Sign in
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
