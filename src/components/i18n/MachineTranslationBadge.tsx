import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MachineTranslationBadgeProps {
  className?: string;
  /** If true, always render regardless of language. Default: hide when i18n.language === 'en'. */
  force?: boolean;
}

/**
 * Subtle badge shown on compliance-bearing content that is currently
 * machine-translated (or untranslated) in a non-English UI language.
 *
 * Do NOT use on marketing / FAQ pages.
 */
export const MachineTranslationBadge: React.FC<MachineTranslationBadgeProps> = ({
  className,
  force = false,
}) => {
  const { i18n, t } = useTranslation();
  const base = (i18n.language || 'en').split('-')[0];
  if (!force && base === 'en') return null;

  return (
    <div
      role="note"
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50/70 px-2.5 py-1 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>
        {t('i18n.machineTranslatedNotice', {
          defaultValue: 'Machine-translated — pending review',
        })}
      </span>
    </div>
  );
};

export default MachineTranslationBadge;
