
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-black text-white px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold">PROCANNEDU</div>
        <div className="space-x-4">
          <Link to="/" className="hover:text-gray-300">Home</Link>
          <Link to="/welcome" className="hover:text-gray-300">Welcome</Link>
          <Link to="/course" className="hover:text-gray-300">Course</Link>
          <Link to="/enroll" className="hover:text-gray-300">Enroll</Link>
          <Link to="/overview" className="hover:text-gray-300">MCA RVT Program Overview</Link>
        </div>
        <div>
          <Button variant="outline" className="text-white border-white hover:bg-white hover:text-black">
            Log In
          </Button>
        </div>
      </nav>
      
      <main className="flex-grow bg-gradient-to-b from-green-200 to-green-100 flex items-center justify-center">
        <div className="text-center max-w-2xl px-4">
          <h1 className="text-5xl font-bold mb-6">Empowering Minds, Transforming Cannabis Education.</h1>
          <p className="text-xl mb-8">Welcome to ProCann Training</p>
          <Link to="/course">
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              Begin Here
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Index;
