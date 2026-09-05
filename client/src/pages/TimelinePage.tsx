import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TimelineEvent, Patient } from '../types';
import { 
  Filter, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  Edit3, 
  PlusCircle, 
  AlertTriangle
} from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const { authFetch, user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimeline = async () => {
    setIsLoading(true);
    try {
      let url = `/api/timeline?event_type=${selectedType}`;
      if (selectedPatient !== 'all') {
        url += `&patient_id=${selectedPatient}`;
      }
      const res = await authFetch(url);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || []);
      }
    } catch (err) {
      console.error('Failed to load timeline events', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await authFetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        setPatients(json.patients || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedPatient, selectedType]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'PATIENT_CREATED':
        return { bg: 'bg-blue-50 text-blue-900 border-blue-200', icon: User };
      case 'INFO_ADDED':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: PlusCircle };
      case 'INFO_EDITED':
        return { bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: Edit3 };
      case 'INFO_DELETED':
        return { bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: AlertTriangle };
      case 'REPORT_UPLOADED':
        return { bg: 'bg-blue-50 text-blue-900 border-blue-200', icon: FileText };
      case 'REPORT_VERIFIED':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
      case 'SUMMARY_GENERATED':
        return { bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: FileText };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock };
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clinical Timeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of patient records, document processing, and verification actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="clinical-input py-1.5 text-xs font-mono"
          >
            <option value="all">All Patients</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.patient_identifier}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="clinical-input py-1.5 text-xs"
          >
            <option value="all">All Event Types</option>
            <option value="PATIENT_CREATED">Patient Created</option>
            <option value="INFO_ADDED">Information Added</option>
            <option value="INFO_EDITED">Information Edited</option>
            <option value="REPORT_UPLOADED">Report Uploaded</option>
            <option value="REPORT_VERIFIED">Report Verified</option>
            <option value="SUMMARY_GENERATED">Summary Generated</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading timeline events...
          </div>
        ) : events.length > 0 ? (
          <div className="relative pl-5 border-l border-slate-200 space-y-4">
            {events.map((evt) => {
              const badge = getEventBadge(evt.event_type);
              const Icon = badge.icon;
              return (
                <div key={evt.id} className="relative">
                  <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-900 border-2 border-white"></div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border ${badge.bg}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {evt.event_type.replace('_', ' ')}
                        </span>
                        <h3 className="font-semibold text-slate-900 text-xs">{evt.title}</h3>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {evt.patient_identifier && (
                          <Link to={`/patients/${evt.patient_id}`} className="font-mono text-blue-900 hover:underline mr-2">
                            {evt.patient_identifier}
                          </Link>
                        )}
                        <span>{new Date(evt.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {evt.description && (
                      <p className="text-slate-600 text-[11px] leading-relaxed pt-0.5">
                        {evt.description}
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 pt-0.5">
                      Logged by: <strong className="text-slate-600">{evt.author_name || user?.full_name || user?.email || 'Reviewer'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center text-xs text-slate-500">
            No events recorded for the selected filter.
          </div>
        )}
      </div>

    </div>
  );
};
