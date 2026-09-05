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
  EyeOff
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, signup } = useAuth();
  const { success, error } = useToast();

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setFormError('Please enter both your institutional email and password.');
      setIsSubmitting(false);
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setFormError('Please enter your full name and clinical title.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isSignUp) {
        const res = await signup(email.trim(), password, fullName.trim(), role);
        if (res.success) {
          success('Clinician profile registered successfully.');
          navigate('/dashboard');
        } else {
          setFormError(res.error || 'Failed to create account.');
          error(res.error || 'Registration failed.');
        }
      } else {
        const res = await login(email.trim(), password);
        if (res.success) {
          success('Authenticated successfully.');
          navigate('/dashboard');
        } else {
          setFormError(res.error || 'Invalid credentials. Please verify your email and password.');
          error(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setFormError('A system error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded bg-teal-800 flex items-center justify-center text-white shadow-2xs">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">MedLens</span>
        </Link>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isSignUp ? 'Create Clinician Profile' : 'Clinical Portal Authentication'}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Clinical Information & Document Intelligence System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs space-y-4">
          
          {formError && (
            <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {isSignUp && (
              <>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name & Clinical Title
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Clinical Reviewer Name"
                      className="clinical-input w-full pl-8"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Clinical Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="clinical-input w-full"
                  >
                    <option value="Clinical Reviewer">Clinical Reviewer</option>
                    <option value="Attending Physician">Attending Physician</option>
                    <option value="Medical Officer">Medical Officer</option>
                    <option value="Laboratory Specialist">Laboratory Specialist</option>
                    <option value="Clinical Informatics Specialist">Clinical Informatics Specialist</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clinician@hospital.org"
                  className="clinical-input w-full pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="clinical-input w-full pl-8 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full clinical-btn-primary py-2 text-xs font-semibold mt-2"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{isSignUp ? 'Register Clinician Profile' : 'Authenticate & Enter'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError(null);
              }}
              className="text-xs text-teal-800 dark:text-teal-400 hover:underline font-medium"
            >
              {isSignUp
                ? 'Already registered? Sign in here'
                : 'Need a new clinician profile? Register here'}
            </button>
          </div>

        </div>

        <div className="mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-800 dark:text-teal-400" />
          <span>MedLens Clinical Information Workspace • Supervised Non-Diagnostic Mode</span>
        </div>
      </div>

    </div>
  );
};
