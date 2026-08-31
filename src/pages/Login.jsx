import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';

export function Login() {
  const [role, setRole] = useState('candidate');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const { login, loginStaff } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    
    try {
      const success = role === 'candidate'
        ? await login(identifier, password)
        : await loginStaff(identifier, password);
      if (success) {
        navigate(role === 'candidate' ? '/dashboard' : '/admin');
      }
    } catch (error) {
      setLoginError(error.message || 'Unable to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setResetStatus(`A password reset link has been sent to ${forgotEmail}.`);
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-5xl py-3 md:py-4">
        <div className="grid overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur md:grid-cols-[0.85fr_1.15fr]">
          <aside className="relative hidden overflow-hidden bg-[#10243d] p-8 text-white md:flex md:flex-col md:justify-between lg:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[36px] border-cyan-300/10" />
            <div className="relative">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-[#10243d] shadow-lg shadow-cyan-300/20">
                <span className="material-symbols-outlined text-2xl">security</span>
              </div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">ExamGuard / Secure access</p>
              <h1 className="max-w-sm text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">Confidence before every question.</h1>
              <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">A trusted examination workspace built for focused candidates and vigilant teams.</p>
            </div>
            <div className="relative flex items-center gap-3 text-sm text-slate-300">
              <span className="material-symbols-outlined text-cyan-300">verified_user</span>
              Identity-aware. Session-secure. Exam-ready.
            </div>
          </aside>

          <section className="p-5 sm:p-6 lg:p-8">
            <div className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Welcome back</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in to ExamGuard</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Choose your workspace to continue securely.</p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3" role="tablist" aria-label="Sign in role">
              {[
                { id: 'candidate', icon: 'school', title: 'Candidate', text: 'Take your exams' },
                { id: 'staff', icon: 'admin_panel_settings', title: 'Staff / Admin', text: 'Manage assessments' }
              ].map((option) => (
                <button key={option.id} type="button" role="tab" aria-selected={role === option.id} onClick={() => { setRole(option.id); setIdentifier(''); setPassword(''); setShowPassword(false); setLoginError(''); }} className={`min-h-[96px] rounded-2xl border p-3 text-left ${role === option.id ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/10' : 'border-slate-200 bg-slate-50/70 text-slate-500'}`}>
                  <span className="material-symbols-outlined mb-2 text-2xl">{option.icon}</span>
                  <span className="block text-sm font-bold">{option.title}</span>
                  <span className="mt-1 block text-xs text-slate-400">{option.text}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-stack-md">
              {loginError && (
                <div role="alert" className="min-h-[44px] rounded-lg border border-error/30 bg-error/10 p-2.5 text-sm font-semibold text-error">
                  {loginError}
                </div>
              )}
              {!loginError && <div aria-hidden="true" className="min-h-[44px]" />}
              <div className="space-y-stack-sm">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="identifier">
                  {role === 'candidate' ? 'Candidate Email' : 'Staff / Admin ID'}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{role === 'candidate' ? 'mail' : 'badge'}</span>
                  <input
                    type={role === 'candidate' ? 'email' : 'text'}
                    id="identifier"
                    placeholder={role === 'candidate' ? 'you@institution.edu' : 'Enter your staff ID'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete={role === 'candidate' ? 'username' : 'off'}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-stack-sm">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-bold text-primary transition hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center py-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label className="ml-2 cursor-pointer select-none text-xs text-slate-500" htmlFor="remember">
                  Remember this device
                </label>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Authenticating...' : `Continue as ${role === 'candidate' ? 'Candidate' : 'Staff'}`}</span>
                {!isLoading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              {role === 'candidate' ? <p className="text-sm text-slate-500">New to ExamGuard? <Link to="/register" className="font-bold text-primary hover:underline">Create an account</Link></p> : <p className="text-xs text-slate-400">Staff access is provisioned by your examination administrator.</p>}
            </div>
        </section>
        </div>

        {/* Footer Links */}
        <div className="mt-6 flex justify-center gap-6">
          <a className="text-xs text-slate-400 transition hover:text-slate-600" href="/#privacy">
            Privacy Policy
          </a>
          <a className="text-xs text-slate-400 transition hover:text-slate-600" href="/#terms">
            Terms of Use
          </a>
        </div>
      </div>

      <Modal
        isOpen={showForgotModal}
        title="Forgot Password"
        onClose={() => {
          setShowForgotModal(false);
          setResetStatus('');
        }}
        actions={[
          {
            label: 'Send Reset Link',
            onClick: () => {
              setResetStatus(`A password reset link has been sent to ${forgotEmail}.`);
            },
            closeOnClick: false,
            variant: 'primary'
          }
        ]}
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Enter the email address associated with your account and we will send you a password reset link.
          </p>
          <div>
            <label htmlFor="forgot-email" className="font-label-md text-label-md text-on-surface-variant block mb-2">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-surface-container-low focus:outline-none focus:border-primary"
            />
          </div>
          {resetStatus && (
            <div className="rounded-xl bg-secondary/10 border border-secondary-container p-4 text-secondary">
              {resetStatus}
            </div>
          )}
        </form>
      </Modal>
    </AuthLayout>
  );
}

export default Login
