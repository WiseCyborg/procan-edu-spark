import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseModuleNavigationProps {
  currentModule: number;
  totalModules: number;
  /** When set, next does not assume module numbers are consecutive. */
  nextModule?: number | null;
  previousModule?: number | null;
  onNavigate?: (moduleNumber: number) => void;
}

export const useModuleNavigation = ({
  currentModule,
  totalModules,
  nextModule,
  previousModule,
  onNavigate
}: UseModuleNavigationProps) => {
  const navigate = useNavigate();

  const resolvedPrevious = previousModule !== undefined
    ? previousModule
    : (currentModule > 0 ? currentModule - 1 : null);
  const resolvedNext = nextModule !== undefined
    ? nextModule
    : (currentModule < totalModules - 1 ? currentModule + 1 : null);

  const goToPrevious = () => {
    if (resolvedPrevious === null) return;
    if (onNavigate) {
      onNavigate(resolvedPrevious);
    } else {
      navigate(`/course/part${resolvedPrevious}`);
    }
  };

  const goToNext = () => {
    if (resolvedNext === null) return;
    if (onNavigate) {
      onNavigate(resolvedNext);
    } else {
      navigate(`/course/part${resolvedNext}`);
    }
  };

  const goToModule = (moduleNumber: number) => {
    if (moduleNumber >= 0 && moduleNumber < totalModules) {
      if (onNavigate) {
        onNavigate(moduleNumber);
      } else {
        navigate(`/course/part${moduleNumber}`);
      }
    }
  };

  const goToCourse = () => {
    navigate('/course');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'k':
        case 'K':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'j':
        case 'J':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          goToCourse();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedPrevious, resolvedNext]);

  return {
    goToPrevious,
    goToNext,
    goToModule,
    goToCourse,
    canGoPrevious: resolvedPrevious !== null,
    canGoNext: resolvedNext !== null,
  };
};
