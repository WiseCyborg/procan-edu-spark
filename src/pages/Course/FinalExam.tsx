
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { CertificateAchievement } from '@/components/certificates/CertificateAchievement';
import { CameraUnavailableDialog } from '@/components/exam/CameraUnavailableDialog';
import { ProtectedCourseAccess } from '@/components/ProtectedCourseAccess';
import { RemedialRecommendations } from '@/components/exam/RemedialRecommendations';
import { ExamAttemptHistory } from '@/components/exam/ExamAttemptHistory';
import { AwaitingVerification } from '@/components/exam/AwaitingVerification';
import { useExamAttempts } from '@/hooks/useExamAttempts';
import { useUserProgress } from '@/hooks/useUserProgress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, History, AlertTriangle, BookOpen } from 'lucide-react';
import {
  quizzes,
  sectionTitles,
  comarSections,
  gradeExam,
  selfTestGrader,
  getQuestionId,
  PASSING_SCORE,
  TOTAL_SECTIONS,
  type QuizQuestion,
  type TopicScore,
} from './finalExamData';

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


const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

const FinalExam: React.FC = () => {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [moduleGatingChecked, setModuleGatingChecked] = useState(false);
  
  // Use user progress hook for module completion checking
  const { 
    areAllModulesCompleted, 
    getCompletedModulesCount, 
    getFirstIncompleteModule,
    isLoading: progressLoading,
    REQUIRED_FOR_EXAM 
  } = useUserProgress(COURSE_ID);
  
  // Use exam attempts hook for cooldown and history
  const {
    attempts,
    attemptsLoading,
    stats,
    canRetakeNow,
    timeUntilRetakeFormatted,
    refetchAttempts,
    refetchStats
  } = useExamAttempts();
  
  const [userData, setUserData] = useState<UserData>({
    name: '',
    phone: '',
    email: '',
    ip: ''
  });
  const [examStage, setExamStage] = useState<
    'verification' | 'awaiting_verification' | 'ready' | 'exam' | 'results' | 'certificate'
  >('verification');
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(1);
  const [totalScore, setTotalScore] = useState(0); // raw correct count during exam; equals overall percentage after finalize
  const [submittedSections, setSubmittedSections] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<ExamResult>({});
  const [topicScores, setTopicScores] = useState<TopicScore[]>([]);
  const [shuffledQuizzes, setShuffledQuizzes] = useState<{[key: number]: QuizQuestion[]}>({});
  const [examAttemptId, setExamAttemptId] = useState<string | null>(null);
  const [examStartedAt, setExamStartedAt] = useState<Date | null>(null);
  const [persistedAttempt, setPersistedAttempt] = useState<{
    total_score: number;
    is_passed: boolean;
    passing_score: number;
    topic_scores: TopicScore[];
    time_taken: number;
    completed_at: string;
  } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
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
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quiz data, section titles, COMAR mapping, and the grader live in
  // ./finalExamData so they're testable and shuffle-independent.

  // Run grader self-test once in dev — guards BUG-017 from regressing silently.
  useEffect(() => {
    if (import.meta.env.DEV) {
      try { selfTestGrader(); }
      catch (e) { console.error(e); }
    }
  }, []);


  // Check if all modules are completed before allowing exam access
  useEffect(() => {
    if (progressLoading) return;
    
    const allComplete = areAllModulesCompleted();
    const completedCount = getCompletedModulesCount();
    
    if (!allComplete) {
      const firstIncomplete = getFirstIncompleteModule();
      toast.error(
        `You must complete all ${REQUIRED_FOR_EXAM} modules before taking the final exam. ` +
        `You have completed ${completedCount} of ${REQUIRED_FOR_EXAM}. ` +
        `Please complete Module ${firstIncomplete} next.`
      );
      navigate('/course');
      return;
    }
    
    setModuleGatingChecked(true);
  }, [progressLoading, areAllModulesCompleted, getCompletedModulesCount, getFirstIncompleteModule, navigate, REQUIRED_FOR_EXAM]);

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

  // Pre-shuffle quiz options once when exam starts
  useEffect(() => {
    if (examStage === 'exam') {
      // Reset answers when exam starts
      setAnswers({});
      
      const shuffled: {[key: number]: QuizQuestion[]} = {};
      
      Object.keys(quizzes).forEach(sectionKey => {
        const section = parseInt(sectionKey);
        shuffled[section] = quizzes[section].map(question => ({
          ...question,
          options: shuffleArray([...question.options])
        }));
      });
      
      setShuffledQuizzes(shuffled);
    }
  }, [examStage]);

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
            finalizeExam(results);
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

  const createCheckinAndAwait = async (photoDataUrl?: string, skipReason?: string) => {
    try {
      // Use atomic RPC — creates both exam_attempts + exam_checkins in one transaction
      const metadata = skipReason ? {
        photo_verification_skipped: true,
        bypass_reason: skipReason,
        bypass_timestamp: new Date().toISOString()
      } : {};

      const { data, error } = await supabase.rpc('start_exam_with_checkin', {
        p_course_id: COURSE_ID,
        p_photo_url: photoDataUrl || null,
        p_bypass_reason: skipReason || null,
        p_ip_address: userData.ip || null,
        p_metadata: metadata
      });

      if (error || !data) {
        console.error('[FinalExam] start_exam_with_checkin error:', error);
        toast.error('Failed to start exam. Please try again.');
        return;
      }

      const result = data as unknown as { attempt_id: string; checkin_id: string; status: string; attempt_number: number };
      setExamAttemptId(result.attempt_id);
      setCheckinId(result.checkin_id);

      if (skipReason) {
        setExamStage('ready');
        toast.info('Photo verification skipped. Proceeding to exam.');
      } else {
        setExamStage('awaiting_verification');
        toast.success('Photo submitted! Awaiting manager verification.');
      }
    } catch (error) {
      console.error('Check-in creation error:', error);
      toast.error('An unexpected error occurred.');
    }
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
    
    createCheckinAndAwait(undefined, bypassReason.trim());
  };

  const startPhotoVerification = async () => {
    // Validate form
    if (!userData.name || !userData.phone || !userData.email) {
      toast.error("Please fill in all fields");
      return;
    }

    // Check cooldown before allowing exam start
    if (!canRetakeNow) {
      toast.error(
        `You must wait ${timeUntilRetakeFormatted} before retaking the exam. Use this time to review your weak topics.`
      );
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
    
    // Create check-in and await manager verification
    createCheckinAndAwait(photoPreview);
  };

  const handleVerificationComplete = useCallback(() => {
    setExamStage('ready');
  }, []);

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

  const startExam = async () => {
    const startedAt = new Date();
    setExamStartedAt(startedAt);
    setExamStage('exam');
    setSectionTimeLeft(300);
    setTotalTimeLeft(5400);

    // Record started_at on the existing attempt row (created at check-in)
    if (examAttemptId) {
      try {
        await supabase
          .from('exam_attempts')
          .update({ started_at: startedAt.toISOString() })
          .eq('id', examAttemptId);
      } catch (err) {
        console.error('Failed to record exam started_at:', err);
      }
    }
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
    // Grade by the question's STABLE id + correct option VALUE — never by
    // rendered/shuffled index. This is the BUG-017 fix.
    const sectionResults = questions.map((question) => {
      const selectedAnswer = answers[question.id];
      return {
        question: question.q,
        selected: selectedAnswer || "Not answered",
        correct: question.a,
        isCorrect: selectedAnswer !== undefined && selectedAnswer === question.a,
      };
    });

    const sectionScore = sectionResults.filter(result => result.isCorrect).length;

    // Build a fresh snapshot so we don't depend on stale React state when finalizing
    const nextResults: ExamResult = { ...results, [section]: sectionResults };
    const nextSubmitted = new Set(submittedSections);
    nextSubmitted.add(section);
    const nextTotalCorrect = Object.values(nextResults).reduce(
      (sum, secResults) => sum + secResults.filter(r => r.isCorrect).length,
      0
    );

    setResults(nextResults);
    setSubmittedSections(nextSubmitted);
    setTotalScore(nextTotalCorrect);

    // Check if all 18 sections are now complete
    if (nextSubmitted.size >= 18) {
      finalizeExam(nextResults);
    } else {
      toast.success(`Section ${section} submitted. Score: ${sectionScore}/${questions.length}`);

      // Move to next un-submitted section (default: section + 1)
      let nextSection = section + 1;
      while (nextSection <= 18 && nextSubmitted.has(nextSection)) nextSection++;
      if (nextSection <= 18) {
        setCurrentSection(nextSection);
        setSectionTimeLeft(300);
      }
    }
  };


  // Compute final results, persist to exam_attempts, and transition to the
  // results screen. Grading runs through the canonical `gradeExam` helper —
  // the same one that's covered by selfTestGrader().
  const finalizeExam = async (_allResults: ExamResult) => {
    if (isFinalizing) return;
    setIsFinalizing(true);

    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);

    // Grade from the raw answers map (stable question id -> selected option text).
    const graded = gradeExam(answers);
    const { overallPercent, isPassed, topicScores: calculatedTopicScores } = graded;

    const completedAtIso = new Date().toISOString();
    const timeTakenSec = examStartedAt
      ? Math.max(0, Math.round((Date.now() - examStartedAt.getTime()) / 1000))
      : (5400 - totalTimeLeft);

    setTopicScores(calculatedTopicScores);
    setTotalScore(overallPercent); // total_score now represents the overall percentage 0–100

    if (!examAttemptId) {
      console.error('Cannot persist exam results: examAttemptId is null');
      toast.error('Could not save your exam results. Please contact support.');
      setPersistedAttempt({
        total_score: overallPercent,
        is_passed: false,
        passing_score: PASSING_SCORE,
        topic_scores: calculatedTopicScores,
        time_taken: timeTakenSec,
        completed_at: completedAtIso,
      });
      setExamStage('results');
      setIsFinalizing(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('exam_attempts')
        .update({
          total_score: overallPercent,
          passing_score: PASSING_SCORE,
          is_passed: isPassed,
          time_taken: timeTakenSec,
          completed_at: completedAtIso,
          topic_scores: calculatedTopicScores as any,
        })
        .eq('id', examAttemptId);

      if (updateError) {
        console.error('Error persisting exam attempt:', updateError);
        toast.error('Failed to save exam results. Please contact support.');
      }

      // Also store individual topic scores (best-effort)
      const topicScoreInserts = calculatedTopicScores.map(ts => ({
        exam_attempt_id: examAttemptId,
        section_number: ts.section_number,
        comar_section: ts.comar_section,
        topic_area: ts.topic_area,
        questions_correct: ts.questions_correct,
        questions_total: ts.questions_total,
        score_percentage: ts.score_percentage,
        needs_remediation: ts.needs_remediation
      }));
      await supabase.from('exam_topic_scores').insert(topicScoreInserts);

      // Re-read the persisted attempt so the UI mirrors what's actually in the DB
      const { data: persisted, error: readErr } = await supabase
        .from('exam_attempts')
        .select('total_score, is_passed, passing_score, topic_scores, time_taken, completed_at')
        .eq('id', examAttemptId)
        .maybeSingle();

      if (readErr || !persisted) {
        setPersistedAttempt({
          total_score: overallPercent,
          is_passed: isPassed,
          passing_score: PASSING_SCORE,
          topic_scores: calculatedTopicScores,
          time_taken: timeTakenSec,
          completed_at: completedAtIso,
        });
      } else {
        setPersistedAttempt({
          total_score: persisted.total_score ?? overallPercent,
          is_passed: persisted.is_passed === true,
          passing_score: persisted.passing_score ?? PASSING_SCORE,
          topic_scores: (persisted.topic_scores as unknown as TopicScore[]) || calculatedTopicScores,
          time_taken: persisted.time_taken ?? timeTakenSec,
          completed_at: persisted.completed_at ?? completedAtIso,
        });
      }

      refetchAttempts();
      refetchStats();
    } catch (error) {
      console.error('Error finalizing exam:', error);
      toast.error('An error occurred saving your exam.');
      setPersistedAttempt({
        total_score: overallPercent,
        is_passed: isPassed,
        passing_score: PASSING_SCORE,
        topic_scores: calculatedTopicScores,
        time_taken: timeTakenSec,
        completed_at: completedAtIso,
      });
    }

    setExamStage('results');
    setIsFinalizing(false);
  };



  const generateCertificate = async () => {
    // Gate strictly on the persisted attempt — UI cannot bypass the DB result.
    if (!examAttemptId || !persistedAttempt || persistedAttempt.is_passed !== true) {
      toast.error('Certificate is only available for a passing attempt.');
      return;
    }

    try {
      // Generate certificate using secure edge function (uses persisted, not client-computed, values)
      const { data: certData, error: certError } = await supabase.functions.invoke('generate-certificate', {
        body: {
          exam_attempt_id: examAttemptId,
          user_data: userData,
          exam_results: {
            total_score: persistedAttempt.total_score,
            total_questions: Object.values(quizzes).reduce((sum, section) => sum + section.length, 0),
            time_taken: persistedAttempt.time_taken,
            passing_score: persistedAttempt.passing_score,
            topic_scores: persistedAttempt.topic_scores,
          }
        }
      });

      if (certError) {
        console.error('Error generating certificate:', certError);
        toast.error('Failed to generate certificate. You can retry from your dashboard.');

        // Record the failure on the attempt's metadata (do NOT toggle is_passed)
        const { data: existingAttempt } = await supabase
          .from('exam_attempts')
          .select('metadata')
          .eq('id', examAttemptId)
          .single();

        const currentMetadata = (existingAttempt?.metadata as Record<string, any>) || {};
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
          .eq('id', examAttemptId);
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

  // Render navigation menu - Mobile optimized
  const renderNavMenu = () => {
    return (
      <div className="bg-gray-800 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6">
        <h3 className="font-semibold text-sm md:text-base mb-2 md:mb-3">Exam Progress</h3>
        <div className="grid grid-cols-6 md:grid-cols-9 gap-1 md:gap-2">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((section) => (
            <button
              key={section}
              onClick={() => submittedSections.has(section) && setCurrentSection(section)}
              disabled={!submittedSections.has(section) && section !== currentSection}
              className={`p-2 md:p-3 rounded text-xs md:text-sm font-medium transition-colors min-h-[44px] md:min-h-0 ${
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
        <p className="text-xs md:text-sm text-gray-300 mt-2">
          Completed: {submittedSections.size}/18 sections
        </p>
      </div>
    );
  };

  // Render exam section content based on current section - Mobile optimized
  const renderExamSection = () => {
    const section = currentSection;
    
    return (
      <div className="space-y-4 md:space-y-6">
        {renderNavMenu()}
        
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            Part {section}: {sectionTitles[section]}
          </h2>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Test your knowledge of {sectionTitles[section].toLowerCase()}.</p>
          
          {(shuffledQuizzes[section] || quizzes[section] || []).map((question, index) => (
            <div key={index} className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 rounded-lg">
              <p className="font-medium mb-3 text-base md:text-lg">{index + 1}. {question.q}</p>
              {question.options.map((option, i) => (
                <label key={i} className="block mb-2 p-3 md:p-4 border-2 rounded-lg hover:bg-white hover:border-primary transition-all cursor-pointer min-h-[48px] flex items-center">
                  <input 
                    type="radio" 
                    name={`q${section}${index}`} 
                    value={option}
                    checked={answers[`q${section}${index}`] === option}
                    onChange={() => setAnswers(prev => ({
                      ...prev,
                      [`q${section}${index}`]: option
                    }))}
                    className="mr-3 h-4 w-4 md:h-5 md:w-5 flex-shrink-0" 
                  />
                  <span className="text-sm md:text-base">{option}</span>
                </label>
              ))}
            </div>
          ))}
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 mt-4 md:mt-6 pt-4 md:pt-6 border-t">
            {section > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentSection(section - 1)}
                className="w-full sm:w-auto h-11 md:h-10 text-base md:text-sm"
              >
                Go Back
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={pauseTimer}
              className="w-full sm:w-auto h-11 md:h-10 text-base md:text-sm"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button 
              variant="outline" 
              onClick={restartSectionTimer}
              className="w-full sm:w-auto h-11 md:h-10 text-base md:text-sm"
            >
              Restart Timer
            </Button>
            <Button 
              onClick={submitSection} 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 h-11 md:h-10 text-base md:text-sm"
            >
              Submit Section
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render results screen with topic-level scoring — sourced from the persisted attempt.
  const renderResults = () => {
    // Prefer persisted values so UI and database agree. Fall back to client computation
    // only while persistence is still in flight (very brief window).
    const overallPercent = persistedAttempt?.total_score ?? 0;
    const passed = persistedAttempt?.is_passed === true;
    const sourceTopicScores: TopicScore[] = persistedAttempt?.topic_scores ?? topicScores;
    const elapsedTime = persistedAttempt?.time_taken ?? (5400 - totalTimeLeft);

    return (
      <div className="space-y-6">
        {/* Topic-Level Scoring and Remedial Recommendations */}
        <RemedialRecommendations
          topicScores={sourceTopicScores}
          overallPassed={passed}
          overallScore={overallPercent}
        />

        {/* Detailed Section Results */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Detailed Results by Section</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Total Time: {formatTime(elapsedTime)} · Overall: {overallPercent}% ·{' '}
            {passed ? (
              <span className="text-green-600 font-semibold">Passed</span>
            ) : (
              <span className="text-destructive font-semibold">Did not pass</span>
            )}
          </p>

          <div className="space-y-2">
            {sourceTopicScores.map(ts => (
              <div
                key={ts.section_number}
                className={`p-3 rounded-lg border ${
                  ts.score_percentage >= 80
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-destructive/30 bg-destructive/5'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">
                    Section {ts.section_number}: {ts.section_title}
                  </span>
                  <span className={`font-bold ${
                    ts.score_percentage >= 80 ? 'text-green-600' : 'text-destructive'
                  }`}>
                    {ts.questions_correct}/{ts.questions_total} ({ts.score_percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

          {!passed && (
            <p className="mt-4 text-sm text-muted-foreground">
              To earn the certificate, every section must reach at least 80% and the overall score must be at least{' '}
              {persistedAttempt?.passing_score ?? 80}%.
            </p>
          )}

          <div className="mt-6 flex justify-center">
            {passed ? (
              <Button size="lg" onClick={generateCertificate} disabled={isFinalizing}>
                Generate Certificate
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate('/course')}>
                Return to Course
              </Button>
            )}
          </div>
        </div>
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
    
    // Determine tier status from the persisted overall percentage (0–100).
    const overallPct = persistedAttempt?.total_score ?? 0;
    const tierStatus: 'green' | 'yellow' | 'red' =
      overallPct >= 90 ? 'green' : overallPct >= 80 ? 'yellow' : 'red';

    
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

  // Show loading while checking module completion
  if (progressLoading || !moduleGatingChecked) {
    return (
      <ProtectedCourseAccess requiresCompleteProfile={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              <p className="text-muted-foreground mt-4">Verifying course completion...</p>
            </div>
          </div>
        </div>
      </ProtectedCourseAccess>
    );
  }

  return (
    <ProtectedCourseAccess requiresCompleteProfile={true}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-green-700 mb-6">
          Maryland Responsible Vendor Training (RVT)
          <br />
          <span className="text-xl font-normal">Final Exam</span>
        </h1>

        {/* History Toggle Button - Show on verification stage */}
        {examStage === 'verification' && attempts && attempts.length > 0 && (
          <div className="max-w-md mx-auto mb-4">
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full"
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? 'Hide' : 'View'} Attempt History ({attempts.length})
            </Button>
          </div>
        )}

        {/* Show Attempt History */}
        {showHistory && examStage === 'verification' && (
          <div className="max-w-4xl mx-auto mb-6">
            <ExamAttemptHistory
              attempts={attempts || []}
              stats={stats}
              timeUntilRetakeFormatted={timeUntilRetakeFormatted}
              canRetakeNow={canRetakeNow}
            />
          </div>
        )}
      
      {/* Timer display - only shown during exam - Mobile optimized */}
      {examStage === 'exam' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto mb-4 md:mb-6">
          <div className="bg-primary text-white p-3 md:p-4 rounded-lg text-center">
            <div className="text-xs md:text-sm mb-1">Total Time Remaining</div>
            <div className="text-2xl md:text-3xl font-bold font-mono">{formatTime(totalTimeLeft)}</div>
          </div>
          <div className="bg-accent text-white p-3 md:p-4 rounded-lg text-center">
            <div className="text-xs md:text-sm mb-1">Section Time Remaining</div>
            <div className="text-2xl md:text-3xl font-bold font-mono">{formatTime(sectionTimeLeft)}</div>
          </div>
        </div>
      )}
      
      {/* Photo Verification Stage - Mobile optimized */}
      {examStage === 'verification' && !showHistory && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Photo Verification</h2>
          
          {/* Cooldown Warning */}
          {!canRetakeNow && timeUntilRetakeFormatted && (
            <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <AlertDescription className="text-sm md:text-base text-yellow-700 dark:text-yellow-400">
                <strong>Cooldown Active:</strong> You must wait {timeUntilRetakeFormatted} before retaking the exam.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="mb-4 text-sm md:text-base">Please provide your information and verify your identity with a photo before starting the exam.</p>
          
          <div className="space-y-3 md:space-y-4">
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
                className="h-11 md:h-10 text-base md:text-sm"
                autoComplete="name"
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
                className="h-11 md:h-10 text-base md:text-sm"
                autoComplete="tel"
                inputMode="tel"
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
                className="h-11 md:h-10 text-base md:text-sm"
                autoComplete="email"
                inputMode="email"
              />
            </div>
            
            {/* Gate 9: Camera bypass option - Mobile optimized */}
            <div className="border-t pt-3 md:pt-4">
              <label className="flex items-start space-x-2 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={skipPhotoVerification}
                  onChange={(e) => setSkipPhotoVerification(e.target.checked)}
                  className="mt-1 h-4 w-4 md:h-5 md:w-5 flex-shrink-0"
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
                    className="h-11 md:h-10 text-base md:text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be recorded for compliance purposes
                  </p>
                </div>
              )}
            </div>
            
            <Button className="w-full" onClick={startPhotoVerification} disabled={!canRetakeNow || attemptsLoading}>
              {skipPhotoVerification ? 'Proceed to Exam' : 'Start Photo Verification'}
            </Button>
            
            {!canRetakeNow && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Button will be enabled when cooldown expires
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Awaiting Manager Verification Stage */}
      {examStage === 'awaiting_verification' && checkinId && examAttemptId && (
        <AwaitingVerification
          checkinId={checkinId}
          attemptId={examAttemptId}
          onVerified={handleVerificationComplete}
        />
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

      <CameraUnavailableDialog
        open={showCameraUnavailable}
        onClose={() => setShowCameraUnavailable(false)}
        onRetry={retryCameraAccess}
        errorType={cameraError}
      />
    </div>
    </ProtectedCourseAccess>
  );
};

export default FinalExam;
