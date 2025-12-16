import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginatedContentProps {
  content: string;
  onPageChange?: (page: number, totalPages: number) => void;
  onComplete?: () => void;
  className?: string;
}

// Split content by H2 (##) headers into pages
const splitContentIntoPages = (content: string): string[] => {
  if (!content) return [''];
  
  // Split by ## headers but keep the header with its content
  const sections = content.split(/(?=^## )/gm);
  
  // Filter out empty sections and trim
  const pages = sections
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // If no H2 headers found, try splitting by paragraphs into chunks
  if (pages.length <= 1 && content.length > 800) {
    const paragraphs = content.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const para of paragraphs) {
      if (currentChunk.length + para.length > 600 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 1 ? chunks : [content];
  }
  
  return pages.length > 0 ? pages : [content];
};

// Simple markdown to HTML conversion
const markdownToHtml = (markdown: string): string => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>)/gims, '<ul class="list-disc my-2">$1</ul>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(?!<[hulo])(.+)$/gim, '<p class="mb-3">$1</p>');
};

export const PaginatedContent: React.FC<PaginatedContentProps> = ({
  content,
  onPageChange,
  onComplete,
  className
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  
  const pages = useMemo(() => splitContentIntoPages(content), [content]);
  const totalPages = pages.length;
  
  // Reset to first page when content changes
  useEffect(() => {
    setCurrentPage(0);
  }, [content]);
  
  // Notify parent of page changes
  useEffect(() => {
    onPageChange?.(currentPage, totalPages);
  }, [currentPage, totalPages, onPageChange]);
  
  // Check for completion
  useEffect(() => {
    if (currentPage === totalPages - 1) {
      onComplete?.();
    }
  }, [currentPage, totalPages, onComplete]);
  
  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setDirection(page > currentPage ? 1 : -1);
      setCurrentPage(page);
    }
  }, [currentPage, totalPages]);
  
  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);
  
  // Handle swipe gestures
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentPage > 0) {
      goPrev();
    } else if (info.offset.x < -threshold && currentPage < totalPages - 1) {
      goNext();
    }
  }, [currentPage, totalPages, goNext, goPrev]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'j') {
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        goPrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);
  
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };
  
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </span>
        <div className="flex gap-1.5">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToPage(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                idx === currentPage 
                  ? "bg-primary w-4" 
                  : idx < currentPage 
                    ? "bg-primary/50" 
                    : "bg-muted-foreground/30"
              )}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      </div>
      
      {/* Content area with swipe */}
      <div className="relative overflow-hidden min-h-[200px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <div 
              className="prose prose-sm md:prose-base max-w-none dark:prose-invert 
                         prose-p:mb-3 prose-headings:mt-4 prose-headings:mb-2 
                         prose-li:my-1 prose-ul:my-2 prose-ol:my-2
                         select-none"
              dangerouslySetInnerHTML={{ 
                __html: markdownToHtml(pages[currentPage] || '') 
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentPage === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-sm text-muted-foreground hidden sm:block">
          Swipe or use arrow keys
        </span>
        
        <Button
          onClick={goNext}
          disabled={currentPage === totalPages - 1}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
