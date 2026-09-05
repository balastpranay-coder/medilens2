import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const ClinicalDisclaimerBanner: React.FC<Props> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-50/90 border-y border-amber-200 px-3 py-1.5 text-[11px] text-amber-950 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium truncate">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="truncate">
            <strong>Notice:</strong> MedLens organizes records and does <u>not</u> diagnose, prescribe treatment, or recommend medications/dosages.
          </span>
        </div>
        <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-200 shrink-0">
          Non-Diagnostic
        </span>
      </div>
    );
  }

  return (
    <aside aria-label="Clinical Safety Notice" className="bg-amber-50/80 border-b border-amber-200/80 px-3.5 py-1.5 text-[11px] sm:text-xs text-amber-950">
      <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <p className="text-[11px] sm:text-xs text-amber-900 leading-tight truncate sm:whitespace-normal">
            <span className="font-semibold text-amber-950 mr-1">SAFETY NOTICE:</span>
            Organizes & summarizes medical documents. MedLens must <strong>never</strong> diagnose, prescribe treatment, recommend medications or dosages, or make autonomous clinical decisions.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider whitespace-nowrap">
            Reviewer Supervised
          </span>
        </div>
      </div>
    </aside>
  );
};
