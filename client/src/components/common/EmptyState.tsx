import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref
}) => {
  return (
    <div className="py-8 px-4 text-center max-w-sm mx-auto space-y-2.5">
      <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto">
        <Icon className="w-4 h-4" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{description}</p>
      </div>
      {(actionLabel && (onAction || actionHref)) && (
        <div className="pt-1">
          {actionHref ? (
            <a
              href={actionHref}
              className="clinical-btn-primary text-xs"
            >
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              type="button"
              className="clinical-btn-primary text-xs"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
