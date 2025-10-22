import { useIsMobile } from './use-mobile';

export const useResponsiveNavigation = () => {
  const isMobile = useIsMobile();
  
  // Check for tablet range (768px - 1023px)
  const isTablet = typeof window !== 'undefined' 
    ? window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches 
    : false;
    
  const isDesktop = typeof window !== 'undefined'
    ? window.matchMedia('(min-width: 1024px)').matches
    : true;
  
  return {
    navPattern: isMobile ? 'sheet' : isTablet ? 'sidebar' : 'horizontal',
    touchOptimized: isMobile || isTablet,
    buttonSize: isMobile ? 'touch' : 'default'
  };
};
