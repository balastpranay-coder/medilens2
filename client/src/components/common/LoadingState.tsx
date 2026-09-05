import React from 'react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading clinical data...',
  rows = 4
}) => {
  return (
    <div className="py-6 px-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <div className="w-3.5 h-3.5 border-2 border-teal-800 dark:border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <span>{message}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i} 
            className="h-9 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
};
