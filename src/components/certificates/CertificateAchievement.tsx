import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import { Award, Download, Share2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CertificateAchievementProps {
  certificateNumber: string;
  userName: string;
  completionDate: string;
  tierStatus: 'green' | 'yellow' | 'red';
  userPhoto?: string;
  onDownload: () => void;
  onShare: () => void;
  certificationLevel?: 'agent' | 'manager';
}

export const CertificateAchievement: React.FC<CertificateAchievementProps> = ({
  certificateNumber,
  userName,
  completionDate,
  tierStatus,
  userPhoto,
  onDownload,
  onShare,
  certificationLevel = 'agent'
}) => {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const tierColors = {
    green: { bg: 'bg-stoplight-green', text: 'text-stoplight-green', emoji: '🟢' },
    yellow: { bg: 'bg-stoplight-yellow', text: 'text-stoplight-yellow', emoji: '🟡' },
    red: { bg: 'bg-stoplight-red', text: 'text-stoplight-red', emoji: '🔴' }
  };

  const tier = tierColors[tierStatus];
  const isManagerCertification = certificationLevel === 'manager';

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-stoplight-cream to-white p-4">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-2xl w-full"
      >
        {/* Achievement Banner */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Award className={`w-24 h-24 mx-auto mb-4 ${tier.text}`} />
            <h1 className="text-4xl font-bold text-stoplight-charcoal mb-2 font-playfair italic">
              Achievement Unlocked!
            </h1>
            <p className="text-xl text-gray-600 font-inter">
              You've completed the Maryland Responsible Vendor Training
            </p>
          </motion.div>
        </div>

        {/* Certificate Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white border-4 border-stoplight-green rounded-lg shadow-2xl p-4 sm:p-8 relative"
        >
          {/* Professional ID Photo - Top Right on desktop, centered on mobile */}
          {userPhoto && (
            <div className="flex justify-center sm:block sm:absolute sm:top-8 sm:right-8 mb-4 sm:mb-0">
              <div className="relative">
                <div className="w-24 h-32 sm:w-32 sm:h-40 rounded-lg overflow-hidden border-4 border-gray-300 shadow-lg bg-white">
                  <img 
                    src={userPhoto} 
                    alt="Certificate holder"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Verified Badge Overlay */}
                <div className="absolute -bottom-2 -right-2 bg-stoplight-green rounded-full p-1.5 shadow-md">
                  <BadgeCheck className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          )}

          <div className="text-center space-y-4 sm:pr-40">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge className={`${tier.bg} text-white text-lg px-4 py-2`}>
                {tier.emoji} {tierStatus.toUpperCase()} TIER CERTIFIED
              </Badge>
              {isManagerCertification && (
                <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
                  👔 MANAGER LEVEL
                </Badge>
              )}
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-stoplight-charcoal font-playfair italic break-words">
              {userName}
            </h2>
            
            <p className="text-gray-600 font-inter">
              has successfully completed all {isManagerCertification ? '23' : '18'} modules of responsible cannabis education 
              {isManagerCertification && ' including advanced manager-level training '}
              and is now part of Maryland's community of certified professionals.
            </p>
            
            <div className="border-t-2 border-b-2 border-stoplight-green/20 py-4 my-4">
              <p className="text-sm text-gray-500 mb-1">
                {isManagerCertification ? 'Manager-Level ' : ''}Certificate Number
              </p>
              <p className="text-base sm:text-xl font-bold text-stoplight-charcoal font-mono break-all">
                {certificateNumber}
              </p>
              <p className="text-sm text-gray-500 mt-2">{completionDate}</p>
            </div>
            
            <p className="text-sm italic text-gray-600 font-inter">
              "Keep your certificate safe — and your standards even higher."
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center gap-4 mt-8"
        >
          <Button 
            size="lg" 
            onClick={onDownload}
            className="bg-stoplight-green hover:bg-stoplight-green/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Certificate
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Achievement
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};