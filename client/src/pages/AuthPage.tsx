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
  ShieldCheck
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, signup } = useAuth();
  const { success, error } = useToast();

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      setIsSubmitting(false);
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setFormError('Please enter your full name.');
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
          setFormError(res.error || 'Invalid credentials.');
          error(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setFormError('A system error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo.clinician@medlens.org');
    setPassword('MedLensDemo2025!');
    setIsSubmitting(true);
    setFormError(null);

    const res = await login('demo.clinician@medlens.org', 'MedLensDemo2025!');
    if (res.success) {
      success('Logged in successfully as Clinical Reviewer.');
      navigate('/dashboard');
    } else {
      setFormError(res.error || 'Clinician login failed.');
      error(res.error || 'Clinician login failed.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded bg-blue-900 flex items-center justify-center text-white">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xl font-semibold text-slate-900 tracking-tight">MedLens</span>
        </Link>
        <h1 className="text-xl font-semibold text-slate-900">
          {isSignUp ? 'Create Clinician Profile' : 'Clinical Portal Login'}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Clinical Information & Medical Report Intelligence
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          
          {/* Clinician One-Click Quick Access */}
          {!isSignUp && (
            <div className="p-3 rounded bg-blue-50/50 border border-blue-200/80 text-xs text-blue-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-950">Reviewer Quick Access</span>
                <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded">Demo Account</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Sign in directly as an authorized Clinical Reviewer to inspect records and process reports.
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isSubmitting}
                className="w-full clinical-btn-primary py-2 text-xs"
              >
                <span>One-Click Clinician Login</span>
              </button>
            </div>
          )}

          {formError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {isSignUp && (
              <>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Full Name & Title
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
                  <label className="block font-medium text-slate-700 mb-1">
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
                    <option value="Clinical Informatics Specialist">Clinical Informatics Specialist</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Institutional Email
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
              <label className="block font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="clinical-input w-full pl-8"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full clinical-btn-primary py-2 text-xs mt-1"
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

          <div className="text-center border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError(null);
              }}
              className="text-xs text-blue-900 hover:underline font-medium"
            >
              {isSignUp
                ? 'Already have an account? Sign in here'
                : "Need a new account? Create profile"}
            </button>
          </div>

        </div>

        <div className="mt-4 text-center text-[11px] text-slate-500">
          MedLens Clinical Workspace • Institutional & Non-Diagnostic Mode
        </div>
      </div>

    </div>
  );
};
