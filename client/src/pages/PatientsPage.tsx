import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Patient } from '../types';
import { 
  Search, 
  Plus, 
  ChevronRight, 
  AlertCircle,
  Users,
  FileText
} from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

export const PatientsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/patients?status=${statusFilter}`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await authFetch(url);
      if (res.ok) {
        const json = await res.json();
        setPatients(json.patients || []);
      } else {
        setError('Failed to fetch patient records.');
      }
    } catch (err) {
      setError('Connection error loading patients.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'badge-normal';
      case 'Review Required':
        return 'badge-low';
      case 'Discharged':
        return 'badge-unknown';
      default:
        return 'badge-unknown';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Patients</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Directory of registered patient profiles and clinical history
          </p>
        </div>

        <Link to="/patients/new" className="clinical-btn-primary self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" />
          <span>New Patient</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            className="clinical-input w-full pl-8 py-1.5 text-xs"
            placeholder="Search patients by identifier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Review Required">Review Required</option>
            <option value="Discharged">Discharged</option>
          </select>
          <button onClick={fetchPatients} className="clinical-btn-secondary py-1.5">
            Filter
          </button>
        </div>
      </div>

      {/* Medical Records Table */}
      <div className="clinical-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Loading patient records..." rows={5} />
        ) : error ? (
          <div className="p-6 text-center text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Patient Identifier</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Documents</th>
                  <th>Clinical Items</th>
                  <th>Last Activity</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="cursor-pointer transition-colors"
                  >
                    <td className="font-semibold text-slate-900 dark:text-white">
                      <div>{p.patient_identifier}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-normal">ID #{p.id}</div>
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {p.age !== null ? `${p.age} yrs` : 'N/A'}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {p.sex}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {p.report_count ?? 0}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300">
                      {p.info_count ?? 0}
                    </td>
                    <td className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={getStatusBadge(p.status)}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/patients/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-teal-800 dark:text-teal-400 hover:underline font-semibold inline-flex items-center gap-0.5 text-xs"
                      >
                        <span>Open Workspace</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No patients yet"
            description="Create a patient record to begin organizing clinical information."
            actionLabel="New Patient"
            onAction={() => navigate('/patients/new')}
          />
        )}
      </div>

    </div>
  );
};
