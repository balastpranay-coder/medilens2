import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { AddPatientPage } from './pages/AddPatientPage';
import { PatientProfilePage } from './pages/PatientProfilePage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportDetailsPage } from './pages/ReportDetailsPage';
import { VerificationPage } from './pages/VerificationPage';
import { TimelinePage } from './pages/TimelinePage';
import { AISummaryPage } from './pages/AISummaryPage';
import { ReviewCenterPage } from './pages/ReviewCenterPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { PatientExportPage } from './pages/PatientExportPage';
import { SearchPage } from './pages/SearchPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />

          {/* Protected Clinical Workspace Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/review-center" element={<ReviewCenterPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<AddPatientPage />} />
            <Route path="/patients/:id" element={<PatientProfilePage />} />
            <Route path="/patients/:id/export" element={<PatientExportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/:id" element={<ReportDetailsPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/ai-summary" element={<AISummaryPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
};
