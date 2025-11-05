import { ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

export const SwipeUpIndicator = () => {
  return (
    <motion.div
      className="md:hidden flex flex-col items-center gap-1 text-muted-foreground/60 py-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <span className="text-xs font-medium">Swipe up for details</span>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      >
        <ChevronUp className="h-5 w-5" />
      </motion.div>
    </motion.div>
  );
};
