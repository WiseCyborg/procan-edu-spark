export const useAnnounce = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById(`live-region-${priority}`);
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => { 
        if (liveRegion) {
          liveRegion.textContent = ''; 
        }
      }, 1000);
    }
  };
  
  return { announce };
};
