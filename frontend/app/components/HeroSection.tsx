import React from 'react';
import { ChevronRight } from 'lucide-react';
import Navbar from './Navbar';
import DashboardPreview from './DashboardPreview';

type HeroSectionProps = {
  onStart: () => void;
};

export default function HeroSection({ onStart }: HeroSectionProps) {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4 selection:bg-[#10b981] selection:text-white" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Hero Container */}
      <div className="relative w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden bg-[#d9d9d9] rounded-2xl sm:rounded-3xl flex flex-col shadow-2xl">
        
        {/* Background Video */}
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          // @ts-ignore
          disableRemotePlayback
          webkit-playsinline="true"
          x5-playsinline="true"
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
        >
          <source 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4" 
            type="video/mp4" 
          />
        </video>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/15 backdrop-blur-[2px] z-0 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/10 z-0 pointer-events-none"></div>

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col h-full w-full overflow-y-auto custom-scrollbar">
          
          <Navbar />

          <div className="flex-1 flex flex-col items-center px-4 pt-[100px] sm:pt-[130px] pb-8 sm:pb-12 text-center">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-sm text-[13px] font-medium text-neutral-800 border border-white/50 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              AetherAutoML Core 2.0
            </div>

            {/* Headline */}
            <h1 
              className="mt-5 sm:mt-6 max-w-4xl text-neutral-900"
              style={{
                fontSize: 'clamp(36px, 8vw, 72px)',
                lineHeight: 1.05,
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Orchestrating <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic", fontWeight: 400, color: "#10b981" }}>AI Agents</span><br />
              for tomorrow's pipelines
            </h1>

            {/* Subtitle */}
            <p 
              className="mt-4 sm:mt-6 text-neutral-700 px-2 max-w-2xl mx-auto"
              style={{ fontSize: 'clamp(14px, 3.5vw, 18px)' }}
            >
              The All-In-One Orchestrator Powering the Future of Machine Learning.
              Describe your problem, attach data, and watch agents build your models.
            </p>

            {/* CTA */}
            <button 
              className="mt-6 sm:mt-8 inline-flex items-center gap-3 bg-[#0b0f1a] text-white rounded-full pl-6 sm:pl-7 pr-2 py-2 sm:py-2.5 text-[14px] font-medium hover:bg-black transition-colors shadow-lg hover:shadow-xl group cursor-pointer"
              onClick={onStart}
            >
              Start Orchestrating
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-[#10b981] transition-colors">
                <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4" />
              </div>
            </button>
            
            <div className="mt-12 w-full">
              <DashboardPreview />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
