import React from 'react';

export default function Navbar() {
  return (
    <div className="flex justify-center pt-4 sm:pt-6 px-3 sm:px-4 absolute top-0 left-0 right-0 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-full shadow-sm border border-neutral-200 pl-3 pr-4 py-2 relative flex items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10b981] to-[#0ea5e9] flex items-center justify-center text-white shadow-inner">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-tight">AetherAutoML</span>
        </div>
      </div>
    </div>
  );
}
