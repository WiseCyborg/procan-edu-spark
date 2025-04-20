
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const TOTAL_MODULES = 18;

const CourseLayout: React.FC = () => {
  const [completedModules, setCompletedModules] = useState<{[key: string]: boolean}>({});
  const [moduleScores, setModuleScores] = useState<{[key: string]: number}>({});

  const updateProgress = () => {
    const completedCount = Object.keys(completedModules).length;
    return `Progress: ${completedCount}/${TOTAL_MODULES} modules completed`;
  };

  const moduleList = Array.from({ length: TOTAL_MODULES }, (_, i) => ({
    id: `part${i + 1}`,
    title: `Part ${i + 1}`,
    description: `Module description for Part ${i + 1}`
  }));

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-4">
        Maryland Responsible Vendor Training (RVT) Course
      </h1>
      
      <div className="progress text-center font-bold text-green-600 mb-6">
        {updateProgress()}
      </div>

      <nav className="grid grid-cols-3 gap-4 mb-8">
        {moduleList.map((module) => (
          <Link 
            key={module.id} 
            to={`/course/${module.id}`} 
            className={`p-4 border rounded text-center ${
              completedModules[module.id] 
                ? 'bg-green-100 border-green-300' 
                : 'bg-gray-100 border-gray-300'
            }`}
          >
            <h2>{module.title}</h2>
            <p className="text-sm text-gray-600">{module.description}</p>
          </Link>
        ))}
      </nav>

      <Link 
        to="/course/final-exam" 
        className="block w-full text-center bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
      >
        Final Exam & Certificate
      </Link>
    </div>
  );
};

export default CourseLayout;
