import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import Gauge from './Gauge';

export default function DashboardPreview() {
  const [activeTabCard1, setActiveTabCard1] = useState('Compute');
  const [activeTabCard3, setActiveTabCard3] = useState('F1 Score');

  return (
    <div className="px-3 sm:px-4 pb-8 sm:pb-12 z-20">
      <div className="bg-[#f5f2ee] rounded-3xl p-4 sm:p-6 w-full max-w-[880px] mx-auto shadow-xl border border-white/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Card 1 — Executions / Compute */}
          <div className="bg-white rounded-2xl p-5 flex flex-col shadow-sm border border-neutral-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
              <span className="text-[13px] font-semibold text-neutral-900">Pipeline Runs</span>
              <span className="text-[13px] text-neutral-500 ml-auto">This Month</span>
            </div>
            
            <div className="flex items-end gap-2 mb-1">
              <span className="text-[28px] font-semibold leading-none">1,248</span>
              <div className="flex items-center gap-1 bg-green-50 text-green-600 rounded-full px-2 py-0.5 text-[11px] font-medium mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>+14 (12%)</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 mb-6">Compared to last month</div>
            
            <div className="text-center text-[12px] font-medium text-neutral-700 mb-2">Compute Target optimal</div>
            
            <div className="mb-auto">
              <Gauge value={78} color="#10b981" showLabels min="150h" max="200h" />
            </div>
            
            <div className="mt-4 bg-neutral-100 rounded-full p-1 flex">
              <button 
                onClick={() => setActiveTabCard1('Compute')}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-full transition-all ${activeTabCard1 === 'Compute' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Compute
              </button>
              <button 
                onClick={() => setActiveTabCard1('Executions')}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-full transition-all ${activeTabCard1 === 'Executions' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Executions
              </button>
            </div>
          </div>

          {/* Card 2 — Models Trained */}
          <div className="bg-white rounded-2xl p-5 flex flex-col shadow-sm border border-neutral-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div>
              <span className="text-[13px] font-semibold text-neutral-900">Models Generated</span>
              <span className="text-[13px] text-neutral-500 ml-auto">Today</span>
            </div>
            
            <div className="flex items-end gap-2 mb-1">
              <span className="text-[28px] font-semibold leading-none">8,402</span>
              <div className="flex items-center gap-1 bg-green-50 text-green-600 rounded-full px-2 py-0.5 text-[11px] font-medium mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>+420</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 mb-6">Across all pipelines</div>
            
            <div className="text-center text-[12px] font-medium text-neutral-700 mb-2">Success Rate</div>
            
            <div className="mb-auto">
              <Gauge value={92} color="#8b5cf6" showLabels={false} />
            </div>
            
            <div className="mt-4 bg-neutral-100 rounded-full p-1 flex">
              <div className="flex-1 text-center text-[12px] font-medium py-1.5 rounded-full transition-all bg-white shadow-sm text-neutral-900">
                All Models
              </div>
            </div>
          </div>

          {/* Card 3 — Model Performance */}
          <div className="bg-white rounded-2xl p-5 flex flex-col shadow-sm border border-neutral-100 sm:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#0ea5e9]"></div>
              <span className="text-[13px] font-semibold text-neutral-900">Accuracy</span>
              <span className="text-[13px] text-neutral-500 ml-auto">Latest Run</span>
            </div>
            
            <div className="flex items-end gap-2 mb-1">
              <span className="text-[28px] font-semibold leading-none">96.4%</span>
              <div className="flex items-center gap-1 bg-green-50 text-green-600 rounded-full px-2 py-0.5 text-[11px] font-medium mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>+2.1%</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 mb-6">Compared to baseline</div>
            
            <div className="mb-auto mt-6">
              <Gauge value={96} color="#0ea5e9" showLabels={false} />
            </div>
            
            <div className="mt-4 bg-neutral-100 rounded-full p-1 flex">
              <button 
                onClick={() => setActiveTabCard3('F1 Score')}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-full transition-all ${activeTabCard3 === 'F1 Score' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                F1 Score
              </button>
              <button 
                onClick={() => setActiveTabCard3('Accuracy')}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-full transition-all ${activeTabCard3 === 'Accuracy' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                Accuracy
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
