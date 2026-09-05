import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Patient } from '../types';
import { 
  Search, 
  Plus, 
  ChevronRight, 
  AlertCircle
} from 'lucide-react';

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
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Review Required':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Discharged':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of clinical records and registered patients.
          </p>
        </div>

        <Link to="/patients/new" className="clinical-btn-primary self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Patient</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
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
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading patient records...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-700 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Patient</th>
                  <th className="px-3 py-2.5">Age</th>
                  <th className="px-3 py-2.5">Sex</th>
                  <th className="px-3 py-2.5">Reports</th>
                  <th className="px-3 py-2.5">Last Updated</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{p.patient_identifier}</div>
                      <div className="text-[10px] text-slate-400 font-normal">ID #{p.id}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {p.age !== null ? `${p.age} yrs` : 'N/A'}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {p.sex}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {p.report_count ?? 0}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-[11px]">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/patients/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-900 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <span>Open Record</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">No patients yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a patient record to begin organizing clinical information.
            </p>
            <div className="pt-2">
              <Link to="/patients/new" className="clinical-btn-primary">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Patient</span>
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
