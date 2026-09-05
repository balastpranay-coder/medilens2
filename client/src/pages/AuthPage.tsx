import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationResult } from '../config/firebase';
import { 
  Stethoscope, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ShieldCheck,
  Eye,
  EyeOff,
  Phone,
  KeyRound,
  AlertTriangle,
  Upload,
  Cpu,
  UserCheck,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    user, 
    isFirebaseConfigured, 
    missingEnvVars,
    loginWithGoogle, 
    sendPhoneVerification, 
    verifyPhoneOtp, 
    loginWithEmail, 
    signupWithEmail 
  } = useAuth();
  const { success, error } = useToast();

  const [authMethod, setAuthMethod] = useState<'google' | 'phone' | 'email'>('google');
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');

  // Phone OTP state
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneStep, setPhoneStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setFormError(null);
    setIsLoading(true);
    setLoadingMessage('Opening Google Authentication...');

    try {
      const res = await loginWithGoogle();
      if (res.success) {
        success('Authenticated successfully with Google.');
        navigate('/dashboard');
      } else {
        setFormError(res.error || 'Google sign-in could not be completed.');
        error(res.error || 'Google sign-in failed.');
      }
    } catch (err: any) {
      setFormError('An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Phone: Send SMS OTP Handler
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
      setFormError('Please enter a valid mobile number.');
      return;
    }

    const fullPhone = `${countryCode}${cleanNumber}`;
    setIsLoading(true);
    setLoadingMessage('Sending verification code via SMS...');

    try {
      const res = await sendPhoneVerification(fullPhone, 'recaptcha-container');
      if (res.success && res.confirmationResult) {
        setConfirmationResult(res.confirmationResult);
        setPhoneStep('enter_otp');
        success(`SMS verification code dispatched to ${fullPhone}.`);
      } else {
        setFormError(res.error || 'Failed to send SMS code.');
        error(res.error || 'Unable to send SMS verification code.');
      }
    } catch (err: any) {
      setFormError('Failed to trigger SMS verification.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Phone: Verify OTP Handler
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!confirmationResult) {
      setFormError('No verification request found. Please request a new code.');
      setPhoneStep('enter_phone');
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setFormError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Verifying code & authenticating session...');

    try {
      const res = await verifyPhoneOtp(confirmationResult, otpCode.trim());
      if (res.success) {
        success('Phone verified. Secure session established.');
        navigate('/dashboard');
      } else {
        setFormError(res.error || 'Invalid verification code. Please try again.');
        error(res.error || 'Verification code failed.');
      }
    } catch (err: any) {
      setFormError('Error verifying code.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Email Submit Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage(isSignUp ? 'Creating clinical profile...' : 'Authenticating credentials...');

    try {
      if (isSignUp) {
        const res = await signupWithEmail(email, password, fullName);
        if (res.success) {
          success('Profile registered successfully.');
          navigate('/dashboard');
        } else {
          setFormError(res.error || 'Failed to register account.');
          error(res.error || 'Registration failed.');
        }
      } else {
        const res = await loginWithEmail(email, password);
        if (res.success) {
          success('Authenticated successfully.');
          navigate('/dashboard');
        } else {
          setFormError(res.error || 'Invalid email or password.');
          error(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setFormError('An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Clinical Value & Workflow */}
        <div className="md:col-span-5 bg-teal-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">MedLens</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                  CLINICAL INTELLIGENCE
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                AI-Powered Clinical Information Intelligence
              </h2>
              <p className="text-xs text-teal-100/90 leading-relaxed">
                Transform fragmented medical records into structured, verifiable information with zero invented data.
              </p>
            </div>

            {/* 4-Step Visual Workflow */}
            <div className="pt-2 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                System Workflow
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/10">
                  <Upload className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>1. Ingest Authorized Documents (PDF/Images)</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/10">
                  <Cpu className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>2. Deterministic Structured Extraction</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/10">
                  <UserCheck className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>3. Verbatim Provenance & Human Verification</span>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/10">
                  <FileCheck2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>4. Longitudinal Trends & Reconciled Records</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-[11px] text-teal-200/80">
            Strictly Non-Diagnostic • Human Reviewer Supervised
          </div>
        </div>

        {/* Right Column: Authentication Form */}
        <div className="md:col-span-7 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isSignUp ? 'Create Reviewer Account' : 'Clinician Authentication'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in with Google, verified SMS OTP, or authorized email credentials.
              </p>
            </div>

            {/* Missing Firebase Environment Configuration Banner */}
            {!isFirebaseConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Firebase Production Authentication Setup</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Real authentication is connected via Firebase. To authenticate with Google or Phone SMS on Vercel or locally, please configure the following environment variables:
                </p>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded border border-amber-200/60 font-mono text-[10px] space-y-0.5">
                  {missingEnvVars.map(v => (
                    <div key={v} className="text-amber-900 dark:text-amber-300">• {v}</div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-800 dark:text-amber-400">
                  Add <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">medilens2-58yu.vercel.app</code> to Firebase Auth → Authorized Domains.
                </p>
              </div>
            )}

            {/* Error banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{formError}</div>
              </div>
            )}

            {/* Primary Action 1: Continue with Google */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Or authenticate with
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>
            </div>

            {/* Method Tabs: Phone SMS OTP vs Email */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); setFormError(null); }}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  authMethod === 'phone'
                    ? 'border-teal-700 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone SMS OTP</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); setFormError(null); }}
                className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  authMethod === 'email'
                    ? 'border-teal-700 text-teal-700 dark:border-teal-400 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email & Password</span>
              </button>
            </div>

            {/* FORM 1: Phone SMS OTP Authentication */}
            {authMethod === 'phone' && (
              <div className="space-y-4 pt-1">
                {phoneStep === 'enter_phone' ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                        Mobile Phone Number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-teal-600"
                        >
                          <option value="+91">🇮🇳 +91 (IN)</option>
                          <option value="+1">🇺🇸 +1 (US)</option>
                          <option value="+44">🇬🇧 +44 (UK)</option>
                          <option value="+61">🇦🇺 +61 (AU)</option>
                          <option value="+49">🇩🇪 +49 (DE)</option>
                          <option value="+971">🇦🇪 +971 (UAE)</option>
                          <option value="+65">🇸🇬 +65 (SG)</option>
                        </select>
                        <div className="relative flex-1">
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Enter 10-digit mobile number"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600 font-mono"
                            required
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        A real 6-digit SMS verification code will be sent via Firebase SMS Gateway.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !phoneNumber.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{loadingMessage || 'Sending verification code...'}</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-950 dark:text-teal-200 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] text-teal-700 dark:text-teal-400 font-bold uppercase">Dispatched to</span>
                        <span className="font-mono font-bold">{countryCode} {phoneNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setPhoneStep('enter_phone'); setOtpCode(''); }}
                        className="text-[11px] font-bold text-teal-800 dark:text-teal-300 hover:underline"
                      >
                        Change Number
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                        6-Digit SMS Verification Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-teal-600"
                        required
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || otpCode.length < 6}
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{loadingMessage || 'Verifying code...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify & Continue to Workspace</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* FORM 2: Email & Password Authentication */}
            {authMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-1">
                {isSignUp && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                      Full Name & Title
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Alex Mercer, MD"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Institutional Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clinician@hospital.org"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{loadingMessage || 'Authenticating...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Reviewer Profile' : 'Sign In with Password'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setFormError(null); }}
                    className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline"
                  >
                    {isSignUp ? 'Already registered? Sign in here' : 'Need an authorized account? Register here'}
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Footer security note */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Encrypted Session • Verified Reviewer Access</span>
          </div>

        </div>

      </div>

    </div>
  );
};
