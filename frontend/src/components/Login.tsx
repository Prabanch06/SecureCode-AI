import React, { useState } from 'react';
import { Lock, ShieldAlert, User, Eye, Shield, ArrowLeft, KeyRound, Mail, CheckCircle2, Github } from 'lucide-react';
import { motion } from 'motion/react';
import api from '../lib/api';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  onNavigateToRegister: () => void;
}

export function Login({ onLoginSuccess, onNavigateToRegister }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const handleGithubLogin = () => {
    window.location.href = '/api/auth/accounts/github/login/';
  };

  // Forgot password flow states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      onLoginSuccess(res.data.user);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.non_field_errors?.[0] || 
        'Invalid username or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password/', { username_or_email: resetEmail });
      setSuccessMessage(`Simulated OTP: ${res.data.otp || '123456'}. Enter it below along with your new password.`);
      toast.success('Verification code generated!');
      setForgotStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'User not found or request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password/', {
        username_or_email: resetEmail,
        otp: otpCode,
        new_password: newPassword
      });
      toast.success('Password updated successfully! Please log in.');
      setIsForgotPassword(false);
      setForgotStep(1);
      setResetEmail('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to reset password. Check verification code.');
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
            {isForgotPassword ? (
              <div className="space-y-6">
                <button 
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMessage(''); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-xs font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-[#2e266f] tracking-tight">
                    {forgotStep === 1 ? 'Forgot Password' : 'Reset Password'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {forgotStep === 1 
                      ? "Enter your registered username or email address and we'll send a code to reset your password."
                      : "Enter the verification code sent to your email and choose a new password."}
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

                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-green-50 border border-green-200 rounded-2xl flex gap-3 text-green-700 text-xs leading-relaxed"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}

                {forgotStep === 1 ? (
                  <form onSubmit={handleRequestReset} className="space-y-6">
                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                          <Mail className="w-5 h-5" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Username or email address"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
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
                        'Request Reset OTP'
                      )}
                    </motion.button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyReset} className="space-y-5">
                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                          <KeyRound className="w-5 h-5" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="6-digit verification code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          type="password"
                          required
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          type="password"
                          required
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
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
                        'Reset Password'
                      )}
                    </motion.button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <h2 className="text-3xl md:text-4xl font-bold text-[#2e266f] tracking-tight">Welcome To SecureCode</h2>
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
                        <User className="w-5 h-5" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Username/email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
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
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b3486] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Extra actions */}
                  <div className="flex items-center justify-between text-xs text-slate-500 px-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                        className="w-4.5 h-4.5 rounded-full border border-slate-300 text-[#3b3486] focus:ring-0 focus:ring-offset-0 cursor-pointer appearance-none checked:bg-[#3b3486] checked:border-transparent relative after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[2px] after:w-[4px] after:h-[8px] after:border-white after:border-r-2 after:border-b-2 after:rotate-45"
                      />
                      <span>Remember me</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMessage(''); }}
                      className="hover:underline text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Forget password
                    </button>
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
                      'Login'
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
                  <span>Sign in with GitHub</span>
                </motion.button>

                <div className="pt-2 text-center text-sm text-slate-400">
                  Don't have an account?{' '}
                  <button onClick={onNavigateToRegister} className="text-[#3b3486] hover:underline font-semibold cursor-pointer">
                    Sign up
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
