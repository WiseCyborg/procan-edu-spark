import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseModuleNavigationProps {
  currentModule: number;
  totalModules: number;
  onNavigate?: (moduleNumber: number) => void;
}

export const useModuleNavigation = ({
  currentModule,
  totalModules,
  onNavigate
}: UseModuleNavigationProps) => {
  const navigate = useNavigate();

  const goToPrevious = () => {
    if (currentModule > 0) {
      const target = currentModule - 1;
      if (onNavigate) {
        onNavigate(target);
      } else {
        navigate(`/course/part${target}`);
      }
    }
  };

  const goToNext = () => {
    if (currentModule < totalModules - 1) {
      const target = currentModule + 1;
      if (onNavigate) {
        onNavigate(target);
      } else {
        navigate(`/course/part${target}`);
      }
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
  }, [currentModule, totalModules]);

  return {
    goToPrevious,
    goToNext,
    goToModule,
    goToCourse,
    canGoPrevious: currentModule > 0,
    canGoNext: currentModule < totalModules - 1
  };
};
