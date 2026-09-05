import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Activity, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  KeyRound
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, signup } = useAuth();
  const { success, error } = useToast();

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('demo.clinician@medlens.org');
  const [password, setPassword] = useState('MedLensDemo2025!');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Clinical Reviewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    setIsSignUp(searchParams.get('mode') === 'signup');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both your email address and password.');
      setIsSubmitting(false);
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setFormError('Please enter your full name and title.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isSignUp) {
        const res = await signup(email, password, fullName, role);
        if (res.success) {
          success('Clinician profile created successfully.');
          navigate('/dashboard');
        } else {
          setFormError(res.error || 'Failed to create account.');
          error(res.error || 'Registration failed.');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          success('Authenticated successfully.');
          navigate('/dashboard');
        } else {
          setFormError(res.error || 'Invalid credentials. Please verify or use Quick Access.');
          error(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setFormError('A system error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async () => {
    setEmail('demo.clinician@medlens.org');
    setPassword('MedLensDemo2025!');
    setIsSubmitting(true);
    setFormError(null);

    const res = await login('demo.clinician@medlens.org', 'MedLensDemo2025!');
    if (res.success) {
      success('Logged in successfully as Clinical Reviewer.');
      navigate('/dashboard');
    } else {
      setFormError(res.error || 'Login failed.');
      error(res.error || 'Login failed.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-blue-600 selection:text-white">
      
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">MedLens</span>
        </Link>
        <h1 className="text-xl font-bold text-white tracking-tight">
          {isSignUp ? 'Create Clinician Profile' : 'Clinical Portal Authentication'}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Clinical Information & Medical Report Intelligence Platform
        </p>
      </div>

      <div className="relative z-10 mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          
          {/* Direct 1-Click Access Card */}
          {!isSignUp && (
            <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-blue-950/70 to-slate-900 border border-blue-600/30 text-xs shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Instant Clinician Access</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                Click below to sign in instantly with authorized reviewer privileges without typing.
              </p>
              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs transition shadow-md shadow-blue-900/30"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>One-Click Clinician Login</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </>
                )}
              </button>

              {/* Explicit Credentials Display */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-blue-300 select-all font-semibold">demo.clinician@medlens.org</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password:</span>
                  <span className="text-blue-300 select-all font-semibold">MedLensDemo2025!</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-200 text-xs flex items-center gap-2">
              <span className="font-semibold">Error:</span> {formError}
            </div>
          )}

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-700/80 w-full" />
            <span className="bg-slate-800 px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              {isSignUp ? 'Registration Details' : 'Or Sign In Manually'}
            </span>
            <div className="border-t border-slate-700/80 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isSignUp && (
              <>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Full Name & Title
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Alex Morgan, MD"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Clinical Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="Clinical Reviewer">Clinical Reviewer</option>
                    <option value="Attending Physician">Attending Physician</option>
                    <option value="Medical Officer">Medical Officer</option>
                    <option value="Clinical Informatics Specialist">Clinical Informatics Specialist</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-9 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs transition shadow-md shadow-indigo-900/30 mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Register Clinician Profile' : 'Authenticate & Enter'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center border-t border-slate-700/60 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline transition"
            >
              {isSignUp
                ? 'Already have credentials? Sign in here'
                : "Need a new clinician profile? Create one here"}
            </button>
          </div>

        </div>

        <div className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>MedLens Clinical Workspace • Institutional Review Mode</span>
        </div>
      </div>

    </div>
  );
};
