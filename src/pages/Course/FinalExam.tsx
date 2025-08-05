
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quiz data
  const quizzes: {[key: number]: QuizQuestion[]} = {
    1: [
      { q: "Which federal law classifies cannabis as a Schedule I drug?", a: "Controlled Substances Act", options: ["Controlled Substances Act", "Food and Drug Act", "Tax Code"] },
      { q: "What is Maryland's legal possession limit for personal cannabis use?", a: "1.5 oz", options: ["1 oz", "1.5 oz", "2 oz"] }
    ],
    2: [
      { q: "What is a key SOP for dispensary operations?", a: "Daily inventory checks", options: ["Daily inventory checks", "Monthly sales reports", "Random pricing"] },
      { q: "Who must approve SOPs in Maryland?", a: "Maryland Cannabis Administration", options: ["FDA", "DEA", "Maryland Cannabis Administration"] }
    ],
    // ... additional quiz sections would be defined here
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

  const startPhotoVerification = () => {
    // Validate form
    if (!userData.name || !userData.phone || !userData.email) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setShowPhotoPopup(true);
    
    // Set up camera
    setTimeout(() => {
      if (videoRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            if (videoRef.current) videoRef.current.srcObject = stream;
          })
          .catch(err => {
            toast.error('Camera access denied. Please allow camera access to proceed.');
            console.error(err);
          });
      }
    }, 100);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photo = canvas.toDataURL('image/png');
        setUserData(prev => ({ ...prev, photo }));
        
        // Stop camera stream
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        setShowPhotoPopup(false);
        setExamStage('ready');
      }
    }
  };

  const cancelPhotoCapture = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setShowPhotoPopup(false);
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
      // First record the exam attempt in the database
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
          completed_at: new Date().toISOString()
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
        toast.error('Failed to generate certificate');
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

  // Render exam section content based on current section
  const renderExamSection = () => {
    const section = currentSection;
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Section {section}</h2>
        {(quizzes[section] || []).map((question, index) => (
          <div key={index} className="mb-6">
            <p className="font-medium mb-2">{question.q}</p>
            {shuffleArray(question.options).map((option, i) => (
              <label key={i} className="block mb-2 p-2 border rounded hover:bg-gray-50">
                <input 
                  type="radio" 
                  name={`q${section}${index}`} 
                  value={option} 
                  className="mr-2" 
                />
                {option}
              </label>
            ))}
          </div>
        ))}
        
        <div className="flex flex-wrap gap-2 mt-6">
          {section > 1 && (
            <Button variant="outline" onClick={() => setCurrentSection(section - 1)}>
              Previous Section
            </Button>
          )}
          <Button variant="outline" onClick={pauseTimer}>
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" onClick={restartSectionTimer}>
            Restart Timer
          </Button>
          <Button onClick={submitSection}>
            Submit Section
          </Button>
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
            ? 'You have successfully passed the Maryland Responsible Vendor Training exam.' 
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

  // Render certificate
  const renderCertificate = () => {
    const date = new Date().toLocaleDateString();
    const elapsedTime = 5400 - totalTimeLeft;
    
    return (
      <div className="certificate bg-white border-4 border-green-700 p-8 mx-auto max-w-4xl print:max-w-full">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-2">Certificate of Completion</h1>
        
        <div className="border-2 border-green-600 p-6 my-4">
          <p className="text-center">This certifies that</p>
          <h2 className="text-2xl font-bold text-center my-2">{userData.name}</h2>
          <p className="text-center mb-4">has successfully completed the</p>
          <h3 className="text-xl font-bold text-center text-green-700 mb-4">
            Maryland Responsible Vendor Training (RVT)
          </h3>
          
          <div className="text-center text-sm mb-6">
            <p>on {date}</p>
            <p>Certificate Number: <strong>{userData.certificateNumber}</strong></p>
            <p>Phone: {userData.phone} | Email: {userData.email}</p>
            <p>IP Address: {userData.ip}</p>
            <p>Total Time: {formatTime(elapsedTime)}</p>
          </div>
          
          {userData.photo && (
            <div className="flex justify-center mb-4">
              <img 
                src={userData.photo} 
                alt="User verification" 
                className="max-w-[200px] border border-gray-300" 
              />
            </div>
          )}
          
          <p className="text-center">Presented by ProCann Training</p>
          <p className="text-center">In accordance with the Maryland Cannabis Administration</p>
          <p className="text-center font-semibold">Valid: {new Date().getFullYear()} - 2025</p>
        </div>
        
        <div className="flex justify-between text-center mt-8">
          <div>
            <p className="font-serif italic text-lg">Louis Hendricks</p>
            <p className="text-sm">Louis Hendricks</p>
          </div>
          <div>
            <p className="font-serif italic text-lg">William Cunningham</p>
            <p className="text-sm">William Cunningham</p>
          </div>
          <div>
            <p className="font-serif italic text-lg">Danielle Brooks</p>
            <p className="text-sm">Danielle Brooks</p>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 mt-8 print:hidden">
          <Button onClick={printCertificate}>Print Certificate</Button>
          <Button onClick={emailCertificate}>Email Certificate</Button>
        </div>
      </div>
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
        <div className="text-center mb-6 font-mono bg-gray-100 p-2 rounded">
          <span className="mr-4">Total Time: {formatTime(totalTimeLeft)}</span>
          <span>Section Time: {formatTime(sectionTimeLeft)}</span>
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
            
            <Button className="w-full" onClick={startPhotoVerification}>
              Start Photo Verification
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
      
      {/* Photo Capture Popup */}
      {showPhotoPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Photo Verification</h2>
            <p className="mb-4">Please ensure your face is clearly visible in the camera frame.</p>
            
            <div className="mb-4">
              <video 
                ref={videoRef}
                className="w-full h-auto bg-gray-200" 
                autoPlay 
                playsInline
              />
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={cancelPhotoCapture}>
                Cancel
              </Button>
              <Button onClick={takePhoto}>
                Take Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalExam;
