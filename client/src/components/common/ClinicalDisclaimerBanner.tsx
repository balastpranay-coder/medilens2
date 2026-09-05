import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const ClinicalDisclaimerBanner: React.FC<Props> = ({ compact = false }) => {
  return (
    <aside aria-label="Clinical Safety Notice" className="bg-[#fffef2] dark:bg-amber-950/40 border-b border-[#fef08a] dark:border-amber-900/60 px-4 py-2 text-[11px] sm:text-xs text-amber-950 dark:text-amber-200 transition-colors">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 leading-tight">
            <span className="font-bold text-amber-950 dark:text-amber-100 mr-1">SAFETY NOTICE:</span>
            Organizes & summarizes medical documents. MedLens must <strong>never</strong> diagnose, prescribe treatment, recommend medications or dosages, or make autonomous clinical decisions.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fef3c7] dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-[#fde68a] dark:border-amber-700 uppercase tracking-wider whitespace-nowrap shadow-2xs">
            REVIEWER SUPERVISED
          </span>
        </div>
      </div>
    </aside>
  );
};

