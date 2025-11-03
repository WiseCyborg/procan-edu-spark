
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { CertificateAchievement } from '@/components/certificates/CertificateAchievement';
import { CameraUnavailableDialog } from '@/components/exam/CameraUnavailableDialog';

interface QuizQuestion {
  q: string;
  a: string;
  options: string[];
}

interface UserData {
  name: string;
  phone: string;
  email: string;
  ip: string;
  photo?: string;
  certificateNumber?: string;
}

interface ExamResult {
  [key: string]: Array<{
    question: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }>;
}

const FinalExam: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData>({
    name: '',
    phone: '',
    email: '',
    ip: ''
  });
  const [examStage, setExamStage] = useState<
    'verification' | 'ready' | 'exam' | 'results' | 'certificate'
  >('verification');
  const [currentSection, setCurrentSection] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [submittedSections, setSubmittedSections] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<ExamResult>({});
  const [sectionTimeLeft, setSectionTimeLeft] = useState(300); // 5 minutes
  const [totalTimeLeft, setTotalTimeLeft] = useState(5400); // 90 minutes
  const [isPaused, setIsPaused] = useState(false);
  const [timerRestarts, setTimerRestarts] = useState<{[key: string]: number}>({});
  const [showPhotoPopup, setShowPhotoPopup] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCameraUnavailable, setShowCameraUnavailable] = useState(false);
  const [cameraError, setCameraError] = useState<'no-camera' | 'permission-denied' | 'https-required' | 'in-use' | 'unknown'>('unknown');
  const [skipPhotoVerification, setSkipPhotoVerification] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quiz data - All 18 sections with 2 questions each
  const quizzes: {[key: number]: QuizQuestion[]} = {
    1: [
      { q: "Which federal law classifies cannabis as a Schedule I drug?", a: "Controlled Substances Act", options: ["Controlled Substances Act", "Food and Drug Act", "Tax Code"] },
      { q: "What is Maryland's legal possession limit for personal cannabis use?", a: "1.5 oz", options: ["1 oz", "1.5 oz", "2 oz"] }
    ],
    2: [
      { q: "What is a key SOP for dispensary operations?", a: "Daily inventory checks", options: ["Daily inventory checks", "Monthly sales reports", "Random pricing"] },
      { q: "Who must approve SOPs in Maryland?", a: "Maryland Cannabis Administration", options: ["FDA", "DEA", "Maryland Cannabis Administration"] }
    ],
    3: [
      { q: "What must be tracked in inventory?", a: "Batch numbers", options: ["Employee hours", "Batch numbers", "Store hours"] },
      { q: "How often should inventory be reconciled?", a: "Daily", options: ["Weekly", "Daily", "Monthly"] }
    ],
    4: [
      { q: "What is required before a sale?", a: "ID verification", options: ["ID verification", "Credit check", "Membership"] },
      { q: "What is the minimum age for cannabis purchase?", a: "21", options: ["19", "21", "25"] }
    ],
    5: [
      { q: "What safety measure prevents diversion?", a: "Locked storage", options: ["Open shelves", "Locked storage", "Public display"] },
      { q: "What should be worn when handling cannabis?", a: "Gloves", options: ["Gloves", "Aprons", "Masks"] }
    ],
    6: [
      { q: "What is the primary psychoactive component of cannabis?", a: "THC", options: ["CBD", "THC", "CBN"] },
      { q: "Which is a potential adverse effect of cannabis?", a: "Anxiety", options: ["Pain relief", "Anxiety", "Improved sleep"] }
    ],
    7: [
      { q: "How long must sales records be kept?", a: "5 years", options: ["1 year", "3 years", "5 years"] },
      { q: "What must be recorded for each sale?", a: "Customer ID", options: ["Customer ID", "Employee mood", "Weather"] }
    ],
    8: [
      { q: "What is required for dispensary security?", a: "Surveillance cameras", options: ["Open windows", "Surveillance cameras", "Signage"] },
      { q: "Who must be notified of a security breach?", a: "Maryland Cannabis Administration", options: ["Local police only", "Maryland Cannabis Administration", "No one"] }
    ],
    9: [
      { q: "What ensures compliance with COMAR?", a: "Regular audits", options: ["Customer feedback", "Regular audits", "Sales targets"] },
      { q: "What is a penalty for non-compliance?", a: "Fines", options: ["Fines", "Awards", "Promotions"] }
    ],
    10: [
      { q: "What must cannabis packaging be?", a: "Child-resistant", options: ["Transparent", "Child-resistant", "Colorful"] },
      { q: "What is prohibited on packaging?", a: "Cartoon characters", options: ["Dosage info", "Cartoon characters", "Batch numbers"] }
    ],
    11: [
      { q: "What must be on a cannabis label?", a: "THC content", options: ["THC content", "Store logo", "Employee name"] },
      { q: "What warning is required on labels?", a: "Keep out of reach of children", options: ["Enjoy responsibly", "Keep out of reach of children", "Use daily"] }
    ],
    12: [
      { q: "What is required for cannabis transport?", a: "Secure vehicle", options: ["Open truck", "Secure vehicle", "Public transit"] },
      { q: "Who can transport cannabis?", a: "Licensed agents", options: ["Customers", "Licensed agents", "Anyone"] }
    ],
    13: [
      { q: "How must cannabis waste be disposed?", a: "Rendered unusable", options: ["Thrown in trash", "Rendered unusable", "Recycled"] },
      { q: "What records are kept for waste?", a: "Weight and date", options: ["Employee name", "Weight and date", "Customer feedback"] }
    ],
    14: [
      { q: "What must be tested in cannabis?", a: "Pesticides", options: ["Color", "Pesticides", "Texture"] },
      { q: "Who conducts cannabis testing?", a: "Licensed labs", options: ["Dispensary staff", "Licensed labs", "Customers"] }
    ],
    15: [
      { q: "What should customers be educated on?", a: "Dosage forms", options: ["Store hours", "Dosage forms", "Employee names"] },
      { q: "What symptom should customers report?", a: "Acute intoxication", options: ["Happiness", "Acute intoxication", "Energy"] }
    ],
    16: [
      { q: "What is an emergency procedure?", a: "Evacuation plan", options: ["Price adjustment", "Evacuation plan", "Staff meeting"] },
      { q: "Who is notified in an emergency?", a: "Authorities", options: ["Customers", "Authorities", "Media"] }
    ],
    17: [
      { q: "How often must agents be trained?", a: "Every 12 months", options: ["Every 6 months", "Every 12 months", "Every 2 years"] },
      { q: "What training covers drug interactions?", a: "RVT", options: ["Sales training", "RVT", "Marketing"] }
    ],
    18: [
      { q: "What is an ethical duty of agents?", a: "Confidentiality", options: ["Upselling", "Confidentiality", "Advertising"] },
      { q: "What should agents avoid?", a: "Misrepresenting products", options: ["Educating customers", "Misrepresenting products", "Following SOPs"] }
    ]
  };

  const sectionTitles: {[key: number]: string} = {
    1: "Federal and State Cannabis Laws",
    2: "Standard Operating Procedures",
    3: "Inventory Management",
    4: "Sales Procedures",
    5: "Safety Protocols",
    6: "Health and Pharmacology",
    7: "Record Keeping",
    8: "Security Measures",
    9: "Compliance Standards",
    10: "Packaging Regulations",
    11: "Labeling Requirements",
    12: "Transportation Guidelines",
    13: "Waste Management",
    14: "Testing Standards",
    15: "Customer Education",
    16: "Emergency Procedures",
    17: "Training Requirements",
    18: "Ethical Standards"
  };

  // Check if all modules are completed before allowing exam access
  useEffect(() => {
    try {
      const completedModules = JSON.parse(localStorage.getItem('completedModules') || '{}');
      const moduleCount = Object.keys(completedModules).length;
      
      // Uncomment this for production to enforce module completion
      /*
      if (moduleCount < TOTAL_MODULES) {
        toast.error("You must complete all modules before taking the final exam.");
        navigate('/course');
      }
      */
    } catch (error) {
      console.error('Error checking module completion:', error);
    }
  }, [navigate]);

  useEffect(() => {
    // Get user's IP address
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserData(prev => ({ ...prev, ip: data.ip }));
      } catch (error) {
        console.error('Error fetching IP:', error);
        setUserData(prev => ({ ...prev, ip: 'Unable to retrieve' }));
      }
    };
    
    fetchIp();
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, []);

  // Handle timers
  useEffect(() => {
    if (examStage !== 'exam') return;
    
    if (!isPaused) {
      // Set up section timer
      sectionTimerRef.current = setInterval(() => {
        setSectionTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(sectionTimerRef.current!);
            toast.warning(`Time's up for Section ${currentSection}! Please submit or restart the timer.`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Set up total timer
      totalTimerRef.current = setInterval(() => {
        setTotalTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(totalTimerRef.current!);
            showFinalResults();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [isPaused, examStage, currentSection]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleUserDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Camera detection and compatibility check
  const detectCameraSupport = async (): Promise<{ supported: boolean; error?: 'no-camera' | 'permission-denied' | 'https-required' | 'in-use' | 'unknown' }> => {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { supported: false, error: 'no-camera' };
    }

    // Check for HTTPS (required for production)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return { supported: false, error: 'https-required' };
    }

    // Try to enumerate devices to check for camera
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera) {
        return { supported: false, error: 'no-camera' };
      }

      return { supported: true };
    } catch (error) {
      console.error('Error detecting camera:', error);
      return { supported: false, error: 'unknown' };
    }
  };

  // Enhanced error handling for camera errors
  const handleCameraError = (error: any): 'no-camera' | 'permission-denied' | 'https-required' | 'in-use' | 'unknown' => {
    console.error('Camera error:', error);

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'permission-denied';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'no-camera';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'in-use';
    } else if (error.name === 'SecurityError') {
      return 'https-required';
    }

    return 'unknown';
  };

  const skipPhotoAndProceed = () => {
    if (!bypassReason.trim()) {
      toast.error("Please provide a reason for skipping photo verification");
      return;
    }
    
    setUserData(prev => ({ 
      ...prev, 
      photo: undefined 
    }));
    
    setExamStage('ready');
    toast.info('Photo verification skipped. Proceeding to exam.');
  };

  const startPhotoVerification = async () => {
    // Validate form
    if (!userData.name || !userData.phone || !userData.email) {
      toast.error("Please fill in all fields");
      return;
    }

    // Gate 9: Allow skip option if checkbox is checked
    if (skipPhotoVerification) {
      skipPhotoAndProceed();
      return;
    }

    // Check camera support first
    const cameraCheck = await detectCameraSupport();
    if (!cameraCheck.supported) {
      setCameraError(cameraCheck.error || 'unknown');
      setShowCameraUnavailable(true);
      return;
    }
    
    setShowInstructions(true);
    setShowPhotoPopup(true);
    
    // Set up camera with mobile optimizations
    setTimeout(async () => {
      if (videoRef.current) {
        try {
          // Detect if iOS
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          
          // Mobile-optimized constraints
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            
            // iOS-specific fixes
            if (isIOS) {
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.setAttribute('autoplay', 'true');
              // Explicitly call play() for iOS
              await videoRef.current.play().catch(e => console.error('iOS play error:', e));
            }
          }
        } catch (err: any) {
          const errorType = handleCameraError(err);
          setCameraError(errorType);
          setShowCameraUnavailable(true);
          setShowPhotoPopup(false);
        }
      }
    }, 100);
  };

  const retryCameraAccess = async () => {
    setShowCameraUnavailable(false);
    await startPhotoVerification();
  };

  const takeTestShot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/png');
        setPhotoPreview(photo);
        setShowInstructions(false);
        toast.success('Preview captured! Review your photo or take another shot.');
      }
    }
  };

  const submitFinalPhoto = () => {
    if (!photoPreview) {
      toast.error("Please take a photo first");
      return;
    }
    
    setUserData(prev => ({ ...prev, photo: photoPreview }));
    
    // Stop camera stream
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setShowPhotoPopup(false);
    setExamStage('ready');
    toast.success('Photo verified! You can now start the exam.');
  };

  const retakePhoto = () => {
    setPhotoPreview('');
    setShowInstructions(true);
  };

  const cancelPhotoCapture = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setShowPhotoPopup(false);
    setPhotoPreview('');
    setShowInstructions(false);
  };

  const startExam = () => {
    setExamStage('exam');
    setSectionTimeLeft(300);
    setTotalTimeLeft(5400);
  };

  const pauseTimer = () => {
    setIsPaused(prev => !prev);
  };

  const restartSectionTimer = () => {
    setSectionTimeLeft(300);
    setTimerRestarts(prev => ({
      ...prev,
      [currentSection]: (prev[currentSection] || 0) + 1
    }));
  };

  const submitSection = () => {
    const section = currentSection;
    const questions = quizzes[section] || [];
    const sectionResults = questions.map((question, index) => {
      const selected = document.querySelector(`input[name="q${section}${index}"]:checked`) as HTMLInputElement;
      return {
        question: question.q,
        selected: selected ? selected.value : "Not answered",
        correct: question.a,
        isCorrect: selected && selected.value === question.a
      };
    });
    
    const sectionScore = sectionResults.filter(result => result.isCorrect).length;
    setTotalScore(prev => prev + sectionScore);
    
    setResults(prev => ({
      ...prev,
      [section]: sectionResults
    }));
    
    setSubmittedSections(prev => {
      const newSet = new Set(prev);
      newSet.add(section);
      return newSet;
    });
    
    // Check if all sections are completed
    if (submittedSections.size >= 17 && section === 18) {
      showFinalResults();
    } else {
      toast.success(`Section ${section} submitted. Score: ${sectionScore}/${questions.length}`);
      
      // Move to next section
      if (section < 18) {
        setCurrentSection(section + 1);
        setSectionTimeLeft(300);
      }
    }
  };

  const showFinalResults = () => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
    
    setExamStage('results');
  };

  const generateCertificate = async () => {
    try {
      // First record the exam attempt in the database (Gate 9 & 10 metadata)
      const { data: examData, error: examError } = await supabase
        .from('exam_attempts')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          course_id: 'default-course-id', // You might want to get this dynamically
          total_score: totalScore,
          passing_score: 80,
          is_passed: true,
          time_taken: 5400 - totalTimeLeft,
          photo_verification_url: userData.photo,
          ip_address: userData.ip,
          completed_at: new Date().toISOString(),
          metadata: skipPhotoVerification ? {
            photo_verification_skipped: true,
            bypass_reason: bypassReason,
            bypass_timestamp: new Date().toISOString()
          } : {}
        })
        .select()
        .single();

      if (examError) {
        console.error('Error recording exam attempt:', examError);
        toast.error('Failed to record exam attempt');
        return;
      }

      // Generate certificate using secure edge function
      const { data: certData, error: certError } = await supabase.functions.invoke('generate-certificate', {
        body: {
          exam_attempt_id: examData.id,
          user_data: userData,
          exam_results: {
            total_score: totalScore,
            total_questions: Object.values(quizzes).reduce((sum, section) => sum + section.length, 0),
            time_taken: 5400 - totalTimeLeft,
            passing_score: 80
          }
        }
      });

      if (certError) {
        console.error('Error generating certificate:', certError);
        toast.error('Failed to generate certificate. You can retry from your dashboard.');
        
        // Update exam_attempts with certificate failure
        const currentMetadata = (examData.metadata as Record<string, any>) || {};
        await supabase
          .from('exam_attempts')
          .update({
            metadata: {
              ...currentMetadata,
              certificate_generation_failed: true,
              failure_reason: certError.message,
              failure_timestamp: new Date().toISOString()
            } as any
          })
          .eq('id', examData.id);
        return;
      }

      // Store certificate number for display
      setUserData(prev => ({ ...prev, certificateNumber: certData.certificate_number }));
      setExamStage('certificate');
      toast.success('Certificate generated successfully!');
    } catch (error) {
      console.error('Error in certificate generation:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const printCertificate = () => {
    window.print();
  };

  const emailCertificate = () => {
    toast.success('Certificate would be emailed to ' + userData.email);
  };

  // Render navigation menu
  const renderNavMenu = () => {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-3">Exam Progress</h3>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((section) => (
            <button
              key={section}
              onClick={() => submittedSections.has(section) && setCurrentSection(section)}
              disabled={!submittedSections.has(section) && section !== currentSection}
              className={`p-2 rounded text-sm font-medium transition-colors ${
                section === currentSection
                  ? 'bg-primary text-white'
                  : submittedSections.has(section)
                  ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title={sectionTitles[section]}
            >
              {section}
              {submittedSections.has(section) && ' ✓'}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-300 mt-2">
          Completed: {submittedSections.size}/18 sections
        </p>
      </div>
    );
  };

  // Render exam section content based on current section
  const renderExamSection = () => {
    const section = currentSection;
    
    return (
      <div className="space-y-6">
        {renderNavMenu()}
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2">
            Part {section}: {sectionTitles[section]}
          </h2>
          <p className="text-gray-600 mb-6">Test your knowledge of {sectionTitles[section].toLowerCase()}.</p>
          
          {(quizzes[section] || []).map((question, index) => (
            <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium mb-3 text-lg">{index + 1}. {question.q}</p>
              {shuffleArray(question.options).map((option, i) => (
                <label key={i} className="block mb-2 p-3 border-2 rounded-lg hover:bg-white hover:border-primary transition-all cursor-pointer">
                  <input 
                    type="radio" 
                    name={`q${section}${index}`} 
                    value={option} 
                    className="mr-3" 
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            {section > 1 && (
              <Button variant="outline" onClick={() => setCurrentSection(section - 1)}>
                Go Back
              </Button>
            )}
            <Button variant="outline" onClick={pauseTimer}>
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="outline" onClick={restartSectionTimer}>
              Restart Timer
            </Button>
            <Button onClick={submitSection} className="bg-primary hover:bg-primary/90">
              Submit Section
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render results screen
  const renderResults = () => {
    const totalQuestions = Object.values(quizzes).reduce((sum, section) => sum + section.length, 0);
    const percentage = (totalScore / totalQuestions) * 100;
    const passed = percentage >= 80;
    const elapsedTime = 5400 - totalTimeLeft;
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">
          {passed ? 'Congratulations!' : 'Exam Results'}
        </h2>
        
        <p className="text-xl mb-4">
          You scored {totalScore}/{totalQuestions} ({percentage.toFixed(2)}%)
        </p>
        
        <p className="mb-6">
          {passed 
            ? `You've completed the Responsible Vendor Training! You're part of Maryland's growing community of responsible cannabis professionals. Keep your certificate safe — and your standards even higher.`
            : 'A minimum score of 80% is required to pass. Please review the materials and try again.'}
        </p>
        
        <p className="mb-4">
          Total Time: {formatTime(elapsedTime)}
        </p>
        
        {passed ? (
          <Button size="lg" onClick={generateCertificate}>
            Generate Certificate
          </Button>
        ) : (
          <Button size="lg" onClick={() => navigate('/course')}>
            Return to Course
          </Button>
        )}
      </div>
    );
  };

  // Render certificate using CertificateAchievement component
  const renderCertificate = () => {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Determine tier status (can be calculated based on score)
    const tierStatus: 'green' | 'yellow' | 'red' = 
      totalScore >= 32 ? 'green' : totalScore >= 28 ? 'yellow' : 'red';
    
    return (
      <CertificateAchievement
        certificateNumber={userData.certificateNumber || 'PROCESSING'}
        userName={userData.name}
        completionDate={date}
        tierStatus={tierStatus}
        userPhoto={userData.photo}
        onDownload={printCertificate}
        onShare={emailCertificate}
      />
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-green-700 mb-6">
        Maryland Responsible Vendor Training (RVT)
        <br />
        <span className="text-xl font-normal">Final Exam</span>
      </h1>
      
      {/* Timer display - only shown during exam */}
      {examStage === 'exam' && (
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
          <div className="bg-primary text-white p-4 rounded-lg text-center">
            <div className="text-sm mb-1">Total Time Remaining</div>
            <div className="text-3xl font-bold font-mono">{formatTime(totalTimeLeft)}</div>
          </div>
          <div className="bg-accent text-white p-4 rounded-lg text-center">
            <div className="text-sm mb-1">Section Time Remaining</div>
            <div className="text-3xl font-bold font-mono">{formatTime(sectionTimeLeft)}</div>
          </div>
        </div>
      )}
      
      {/* Photo Verification Stage */}
      {examStage === 'verification' && (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Photo Verification</h2>
          <p className="mb-4">Please provide your information and verify your identity with a photo before starting the exam.</p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input 
                id="name" 
                name="name" 
                value={userData.name} 
                onChange={handleUserDataChange} 
                required 
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input 
                id="phone" 
                name="phone" 
                type="tel" 
                value={userData.phone} 
                onChange={handleUserDataChange} 
                required 
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                value={userData.email} 
                onChange={handleUserDataChange} 
                required 
              />
            </div>
            
            {/* Gate 9: Camera bypass option */}
            <div className="border-t pt-4">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipPhotoVerification}
                  onChange={(e) => setSkipPhotoVerification(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-600">
                  Skip photo verification (camera unavailable or technical issues)
                </span>
              </label>
              
              {skipPhotoVerification && (
                <div className="mt-3">
                  <label htmlFor="bypassReason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for skipping <span className="text-red-600">*</span>
                  </label>
                  <Input
                    id="bypassReason"
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    placeholder="e.g., Camera not working, iOS issue, etc."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be recorded for compliance purposes
                  </p>
                </div>
              )}
            </div>
            
            <Button className="w-full" onClick={startPhotoVerification}>
              {skipPhotoVerification ? 'Proceed to Exam' : 'Start Photo Verification'}
            </Button>
          </div>
        </div>
      )}
      
      {/* Ready to Start Stage */}
      {examStage === 'ready' && (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Ready to Begin</h2>
          <p className="mb-6">
            Your identity has been verified. You are about to start the final exam which consists of 18 sections.
            You will have 90 minutes to complete the entire exam.
          </p>
          
          <Button size="lg" onClick={startExam}>
            Start Exam
          </Button>
        </div>
      )}
      
      {/* Exam Stage */}
      {examStage === 'exam' && renderExamSection()}
      
      {/* Results Stage */}
      {examStage === 'results' && renderResults()}
      
      {/* Certificate Stage */}
      {examStage === 'certificate' && renderCertificate()}
      
      {/* Enhanced Photo Capture Popup with Face Guide */}
      {showPhotoPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-4">Photo Verification</h2>
            
            {showInstructions && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold mb-2">Please follow these steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Ensure your face is centered in the camera frame</li>
                  <li>Use good lighting and remove any hats or sunglasses</li>
                  <li>Click "Take Test Shot" to preview your photo</li>
                  <li>Repeat as needed, then submit the final photo</li>
                </ol>
              </div>
            )}
            
            <div className="mb-4 flex justify-center relative">
              {!photoPreview ? (
                <div className="relative">
                  <video 
                    ref={videoRef}
                    className="w-full max-w-md h-auto bg-gray-200 rounded-lg" 
                    autoPlay 
                    playsInline
                  />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-80 border-4 border-white rounded-full opacity-50"></div>
                  </div>
                </div>
              ) : (
                <img 
                  src={photoPreview} 
                  alt="Photo preview" 
                  className="w-full max-w-md h-auto rounded-lg shadow-md"
                />
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex flex-wrap gap-2 justify-between">
              <Button variant="outline" onClick={cancelPhotoCapture}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {!photoPreview ? (
                  <Button onClick={takeTestShot} className="bg-primary hover:bg-primary/90">
                    Take Test Shot
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={retakePhoto}>
                      Retake Photo
                    </Button>
                    <Button onClick={submitFinalPhoto} className="bg-green-600 hover:bg-green-700">
                      Submit Final Photo
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Unavailable Dialog */}
      <CameraUnavailableDialog
        open={showCameraUnavailable}
        onClose={() => setShowCameraUnavailable(false)}
        onRetry={retryCameraAccess}
        errorType={cameraError}
      />
    </div>
  );
};

export default FinalExam;
