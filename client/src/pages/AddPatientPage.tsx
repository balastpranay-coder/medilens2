import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, 
  ShieldAlert, 
  UserPlus
} from 'lucide-react';

export const AddPatientPage: React.FC = () => {
  const { authFetch } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [status, setStatus] = useState('Active');
  const [initialNotes, setInitialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleGenerateId = async () => {
    const year = new Date().getFullYear();
    try {
      const res = await authFetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        const nextNum = (data.total !== undefined ? data.total : (data.patients ? data.patients.length : 0)) + 1;
        const padded = String(nextNum).padStart(4, '0');
        setIdentifier(`PT-${year}-${padded}`);
        return;
      }
    } catch {
      // fallback
    }
    setIdentifier(`PT-${year}-0001`);
  };

  useEffect(() => {
    if (!identifier) {
      handleGenerateId();
    }
  }, []);

  // Auto calculate age if DOB entered
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const birth = new Date(val);
      const now = new Date();
      let calculatedAge = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0 && calculatedAge < 130) {
        setAge(calculatedAge.toString());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!identifier.trim()) {
      setFormError('Patient Identifier is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/patients', {
        method: 'POST',
        body: JSON.stringify({
          patient_identifier: identifier.trim(),
          age: age ? parseInt(age, 10) : null,
          date_of_birth: dob || null,
          sex,
          status,
          initial_notes: initialNotes.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        success(`Patient ${data.patient.patient_identifier} registered successfully.`);
        navigate(`/patients/${data.patient.id}`);
      } else {
        setFormError(data.error || 'Failed to create patient.');
        error(data.error || 'Could not create patient.');
      }
    } catch (err: any) {
      setFormError('Network connection failure.');
      error('Failed to communicate with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      
      {/* Top back button */}
      <div>
        <Link
          to="/patients"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients</span>
        </Link>
        <div className="border-b border-slate-200 pb-3">
          <h1 className="text-xl font-semibold text-slate-900">Register Patient</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Initialize a new clinical patient record. All manually entered information is flagged with <strong className="text-blue-900">Source: User Provided</strong>.
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Intake Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        
        {/* Section 1: Demographics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Demographics & Identity</h2>
            <button
              type="button"
              onClick={handleGenerateId}
              className="text-xs text-blue-900 hover:underline font-medium"
            >
              Generate Identifier
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Patient Identifier */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Patient Identifier <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PT-2026-0001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="clinical-input w-full font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Unique clinical identifier used for cross-referencing and searches.
              </p>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={handleDobChange}
                className="clinical-input w-full text-xs"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Age (years)
              </label>
              <input
                type="number"
                min="0"
                max="130"
                placeholder="e.g. 52"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="clinical-input w-full text-xs"
              />
            </div>

            {/* Biological Sex */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sex <span className="text-rose-600">*</span>
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="clinical-input w-full text-xs"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Patient Status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Record Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="clinical-input w-full text-xs"
              >
                <option value="Active">Active</option>
                <option value="Review Required">Review Required</option>
                <option value="Discharged">Discharged</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Initial Clinical Notes */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Initial Clinical Notes</h2>
          <textarea
            rows={3}
            placeholder="Document initial presenting symptoms, referral notes, or intake summary..."
            value={initialNotes}
            onChange={(e) => setInitialNotes(e.target.value)}
            className="clinical-input w-full text-xs"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <Link to="/patients" className="clinical-btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="clinical-btn-primary"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Registering...' : 'Register Patient'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
