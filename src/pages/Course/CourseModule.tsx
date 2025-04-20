
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

interface QuizQuestion {
  q: string;
  a: string;
  options: string[];
}

const quizzes: {[key: string]: QuizQuestion[]} = {
  // We'll add quiz data here, similar to the original HTML script
};

const CourseModule: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [submitted, setSubmitted] = useState(false);

  const moduleNumber = moduleId ? parseInt(moduleId.replace('part', '')) : 0;
  const moduleQuestions = quizzes[moduleNumber] || [];

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const submitQuiz = () => {
    setSubmitted(true);
    const score = moduleQuestions.filter((q, index) => 
      selectedAnswers[index] === q.a
    ).length;

    // Here you would typically update progress in a more sophisticated way
    alert(`Quiz completed. Score: ${score}/${moduleQuestions.length}`);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        Module {moduleNumber}: Course Content
      </h1>

      <div className="quiz-container">
        {moduleQuestions.map((question, index) => (
          <div key={index} className="mb-4">
            <p className="font-semibold mb-2">{question.q}</p>
            {question.options.map(option => (
              <label 
                key={option} 
                className={`block mb-1 p-2 border rounded ${
                  submitted 
                    ? (option === question.a 
                        ? 'bg-green-100 border-green-300' 
                        : selectedAnswers[index] === option 
                          ? 'bg-red-100 border-red-300' 
                          : '')
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name={`q${index}`}
                  value={option}
                  checked={selectedAnswers[index] === option}
                  onChange={() => handleAnswerSelect(index, option)}
                  disabled={submitted}
                />
                <span className="ml-2">{option}</span>
              </label>
            ))}
          </div>
        ))}

        {!submitted && (
          <button 
            onClick={submitQuiz}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseModule;
