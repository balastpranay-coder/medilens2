import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const ClinicalDisclaimerBanner: React.FC<Props> = ({ compact = false }) => {
  return (
    <aside aria-label="Clinical Safety Notice" className="bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 px-3 py-1 text-[11px] text-amber-950 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <p className="text-[11px] leading-tight truncate sm:whitespace-normal">
            <span className="font-semibold text-amber-900 dark:text-amber-300 mr-1">Clinical safety:</span>
            MedLens organizes and summarizes provided medical information. It does not diagnose, prescribe, or make autonomous clinical decisions.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800 uppercase tracking-wider whitespace-nowrap">
            Reviewer Supervised
          </span>
        </div>
      </div>
    </aside>
  );
};
