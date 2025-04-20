
import React from 'react';

const Welcome = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center text-[#2c3e50] mb-4">Welcome to ProCann Training</h1>
        <p className="text-center italic text-lg mb-8">Empowering Maryland Dispensaries Through Cannabis Education</p>
        
        <div className="prose max-w-none">
          <div className="mb-8">
            <p className="mb-4">At ProCann Training, we proudly deliver the Maryland Cannabis Administration (MCA) certified <strong>Responsible Vendor Training (RVT)</strong> — designed specifically for dispensary professionals across the state.</p>
            <p className="mb-4">Our program is tailored to meet <em>COMAR allowbreak 14.17.11.01–.19</em>, ensuring your staff is trained, compliant, and confident in every role they perform.</p>
            <p className="mb-4">From registration and ID verification to safe cannabis handling, recordkeeping, and security protocols, ProCann provides the tools and knowledge needed to meet Maryland's highest standards for cannabis retail.</p>
            <p>Whether you're a manager, budtender, or inventory specialist — you're in the right place.</p>
          </div>

          <div className="border-t border-gray-200 my-8"></div>

          <h2 className="text-2xl font-bold text-[#2980b9] mb-4">Why Train with ProCann?</h2>
          <ul className="list-disc pl-6 mb-8">
            <li>MCA-compliant RVT curriculum</li>
            <li>Mobile-ready, easy-to-access TalentLMS platform</li>
            <li>Built by Maryland-based cannabis compliance experts</li>
            <li>Fast certification & instant test results</li>
            <li>Custom support for dispensary teams of all sizes</li>
          </ul>

          <div className="border-t border-gray-200 my-8"></div>

          <p className="text-center font-bold">Let's make Maryland a leader in cannabis education — one responsible vendor at a time.</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
