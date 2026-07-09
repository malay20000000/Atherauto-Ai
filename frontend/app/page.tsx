"use client";
import React, { useState, useEffect, useRef } from 'react';
import HeroSection from './components/HeroSection';

type Stage = { name: string; status: string; };

export default function Home() {
  const [runId, setRunId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [problemStatement, setProblemStatement] = useState("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [edaData, setEdaData] = useState<any>(null);
  const [imputationStrategy, setImputationStrategy] = useState<string>('mean');
  const [logs, setLogs] = useState<string[]>([]);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);
  const [clusterUtil, setClusterUtil] = useState(78);
  const [throughput, setThroughput] = useState(4.2);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const defaultStages = [
    { name: 'Intake', status: 'pending' },
    { name: 'Data Acquisition', status: 'pending' },
    { name: 'Profiling', status: 'pending' },
    { name: 'Cleaning', status: 'pending' },
    { name: 'Feature Engineering', status: 'pending' },
    { name: 'Model Competition', status: 'pending' },
    { name: 'Tuning', status: 'pending' },
    { name: 'Evaluation', status: 'pending' },
    { name: 'Packaging', status: 'pending' },
  ];

  const currentStages = stages.length > 0 ? stages : defaultStages;
  const activeStage = currentStages.find(s => s.status === 'running' || s.status === 'human_intervention_required');
  const isComplete = runId && !activeStage && currentStages.every(s => s.status === 'completed');

  useEffect(() => {
    if (isComplete && runId && !finalMetrics) {
      fetch(`http://127.0.0.1:8000/api/runs/${runId}/metrics`)
        .then(res => res.json())
        .then(data => setFinalMetrics(data))
        .catch(e => console.error("Metrics not ready yet", e));
    }
  }, [isComplete, runId, finalMetrics]);

  const startNewRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemStatement.trim()) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("problem_statement", problemStatement);
      if (datasetFile) formData.append("dataset", datasetFile);

      const res = await fetch("http://127.0.0.1:8000/api/runs", {
        method: "POST",
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setRunId(data.run_id);
        setIsPolling(true);
      } else {
        alert("Failed to start run.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveStage = async (stageName: string, decision?: object) => {
    if (!runId) return;
    try {
      const opts: RequestInit = { method: "POST" };
      if (decision) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify({ decision });
      }
      await fetch(`http://127.0.0.1:8000/api/runs/${runId}/stage/${stageName}/approve`, opts);
      if (stageName === 'Profiling') setEdaData(null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeStage?.name === 'Profiling' && activeStage?.status === 'human_intervention_required' && !edaData) {
      fetch(`http://127.0.0.1:8000/api/runs/${runId}/eda`)
        .then(res => res.json())
        .then(data => setEdaData(data))
        .catch(e => console.error("EDA not ready yet", e));
    }
  }, [activeStage, runId, edaData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && runId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/runs/${runId}`);
          if (res.ok) {
            const data = await res.json();
            setStages(data.stages);
            if (data.status === 'completed' || data.status === 'failed') setIsPolling(false);
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPolling, runId]);

  useEffect(() => {
    if (runId && !isComplete) {
      const interval = setInterval(() => {
        setClusterUtil(prev => Math.max(60, Math.min(95, prev + Math.floor(Math.random() * 7 - 3))));
        setThroughput(prev => {
          const newVal = prev + (Math.random() * 0.6 - 0.3);
          return Number(Math.max(2.1, Math.min(7.5, newVal)).toFixed(1));
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [runId, isComplete]);

  useEffect(() => {
    if (!runId) return;
    setLogs([]);
    const ws = new WebSocket(`ws://127.0.0.1:8000/api/runs/${runId}/ws`);
    ws.onmessage = (event) => setLogs(prev => [...prev, event.data]);
    return () => ws.close();
  }, [runId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!runId) {
    if (!showConfig) {
      return (
        <HeroSection onStart={() => setShowConfig(true)} />
      );
    }
    
    return (
      <main className="min-h-screen flex items-center justify-center p-4 md:p-12 antialiased relative z-10 bg-[#ededed] font-sans selection:bg-[#10b981] selection:text-white">
        <div className="w-full max-w-2xl relative z-20 flex flex-col items-center">
          
          <div className="bg-white w-full rounded-3xl p-8 md:p-12 shadow-xl border border-neutral-200 relative overflow-hidden group">
            <h2 className="text-3xl font-semibold text-neutral-900 mb-2" style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic", fontWeight: 400 }}>Run Configuration</h2>
            <p className="text-sm text-neutral-500 mb-8 font-medium">Define your objective and attach data to ignite the orchestration process.</p>
            
            <form onSubmit={startNewRun} className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-neutral-900">Problem Statement</label>
                <textarea 
                  className="w-full bg-neutral-50 border border-neutral-200 text-sm p-4 min-h-[120px] resize-none font-medium placeholder:text-neutral-400 text-neutral-900 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] rounded-xl transition-all"
                  placeholder="Predict customer churn in the next 30 days based on usage metrics..."
                  required
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-neutral-900">Dataset (Optional)</label>
                <div className="relative group/upload cursor-pointer h-16 rounded-xl border border-dashed border-neutral-300 flex items-center justify-center bg-neutral-50 hover:bg-[#10b981]/5 hover:border-[#10b981]/50 transition-all">
                   <input 
                     accept=".csv" 
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                     type="file"
                     onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
                   />
                   <div className="flex items-center gap-3">
                      <div className="flex flex-col text-center">
                        <span className="text-neutral-900 font-medium text-[13px]">{datasetFile ? datasetFile.name : 'Click or drag a .csv file to upload'}</span>
                        {!datasetFile && <span className="text-[11px] text-neutral-500 mt-0.5 font-medium">If omitted, agents will synthesize mock data</span>}
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                 <button 
                   disabled={isSubmitting}
                   className="w-full h-12 bg-[#0b0f1a] text-white font-medium text-[14px] rounded-full shadow-lg hover:shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale" 
                   type="submit"
                 >
                   <span>{isSubmitting ? 'Initializing Orchestrator...' : 'Ignite Pipeline'}</span>
                   <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                   </div>
                 </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Execution & Complete State Layout (Bento Grid)
  return (
    <div className="bg-[#ededed] min-h-screen font-sans text-neutral-900 overflow-x-hidden relative selection:bg-[#10b981] selection:text-white">
      
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 pt-4 sm:pt-6 px-3 sm:px-4 flex justify-center">
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-sm border border-neutral-200 pl-3 pr-2 py-2 relative flex items-center justify-between w-full max-w-[1200px]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#10b981] to-[#0ea5e9] flex items-center justify-center text-white shadow-inner">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-[15px] tracking-tight hidden sm:block">AetherAutoML</span>
          </div>
          <button onClick={() => {
            setRunId(null);
            setShowConfig(true);
            setStages([]);
            setFinalMetrics(null);
            setEdaData(null);
            setLogs([]);
            setProblemStatement("");
            setDatasetFile(null);
          }} className="bg-[#0b0f1a] text-white font-medium px-4 py-1.5 rounded-full shadow-sm hover:bg-black transition-colors flex items-center gap-2 text-[13px]">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            New Run
          </button>
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="mt-[100px] p-4 md:p-8 min-h-[calc(100vh-100px)] max-w-[1200px] mx-auto relative w-full flex flex-col">
        
        <header className="mb-6 relative z-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-[#0ea5e9]' : 'bg-[#10b981] animate-pulse'}`}></span>
              <span className="text-[11px] text-neutral-500 tracking-wider font-semibold uppercase">
                {isComplete ? 'Run Complete' : 'Live Orchestration'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Run <span className="text-neutral-400 ml-1">{runId}</span>
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 relative z-10">
          
          {/* Vertical Timeline */}
          <section className="xl:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-neutral-200 flex flex-col h-[700px]">
            <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
              <h3 className="text-[15px] font-semibold text-neutral-900">Pipeline Stages</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 relative custom-scrollbar">
              <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-neutral-200 z-0"></div>
              <ul className="flex flex-col gap-6 relative z-10">
                {currentStages.map((stage, i) => {
                  const isCompleted = stage.status === 'completed';
                  const isRunning = stage.status === 'running';
                  const isIntervention = stage.status === 'human_intervention_required';
                  const isPending = stage.status === 'pending';
                  const isFailed = stage.status === 'failed';

                  return (
                    <li key={i} className={`flex gap-4 items-start ${isPending ? 'opacity-50 grayscale' : ''} relative pb-2`}>
                      
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold relative z-10 transition-all duration-300
                        ${isCompleted ? 'bg-[#10b981] text-white shadow-sm' : ''}
                        ${isRunning ? 'bg-white border-2 border-[#10b981] text-[#10b981] shadow-sm' : ''}
                        ${isIntervention ? 'bg-white border-2 border-[#8b5cf6] text-[#8b5cf6] shadow-sm' : ''}
                        ${isFailed ? 'bg-red-500 text-white' : ''}
                        ${isPending ? 'bg-neutral-100 text-neutral-400 border border-neutral-200' : ''}
                      `}>
                        {isCompleted && <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                        {isRunning && <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-ping"></div>}
                        {isIntervention && <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full animate-ping"></div>}
                        {isFailed && <span className="text-white">!</span>}
                        {isPending && <span>{i + 1}</span>}
                      </div>

                      <div className="pt-1.5 flex-1">
                        <h4 className={`text-[13px] font-semibold tracking-wide uppercase ${isRunning ? 'text-[#10b981]' : isIntervention ? 'text-[#8b5cf6]' : 'text-neutral-900'}`}>
                          {stage.name}
                        </h4>
                        
                        {isRunning && (
                          <div className="mt-2 bg-green-50 rounded-lg p-2.5 border border-green-100">
                            <p className="text-[11px] text-green-700 uppercase tracking-wider font-medium flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                              Agent processing
                            </p>
                          </div>
                        )}
                        {isIntervention && (
                          <div className="mt-2 bg-purple-50 rounded-lg p-3 border border-purple-100">
                            <p className="text-[11px] text-[#8b5cf6] mb-1.5 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              Human Checkpoint
                            </p>
                            {stage.name === 'Profiling' ? (
                               <p className="text-[11px] text-neutral-600 mb-3 font-medium">Review the Data Story on the right, then approve to continue.</p>
                            ) : stage.name === 'Cleaning' ? (
                               <div className="mb-3">
                                 <p className="text-[11px] text-neutral-600 mb-1.5 font-medium">Select Imputation Strategy:</p>
                                 <select className="w-full bg-white border border-neutral-200 text-[12px] rounded-md p-2 focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] outline-none text-neutral-800" value={imputationStrategy} onChange={e => setImputationStrategy(e.target.value)}>
                                   <option value="mean">Mean Imputation</option>
                                   <option value="median">Median Imputation</option>
                                   <option value="drop">Drop Rows</option>
                                 </select>
                               </div>
                            ) : null}
                            <button 
                              onClick={() => approveStage(stage.name, stage.name === 'Cleaning' ? { strategy: imputationStrategy } : undefined)} 
                              className="px-3 py-2 bg-[#8b5cf6] text-white rounded-md text-[11px] font-bold uppercase tracking-wide hover:bg-[#7c3aed] transition-colors w-full active:scale-[0.98]"
                            >
                              Approve & Continue
                            </button>
                          </div>
                        )}
                        {isCompleted && (
                          <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">Task resolved</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Main Content Area */}
          <section className="xl:col-span-8 flex flex-col gap-4 h-[700px]">
            {isComplete ? (
              // Final Complete View
              <div className="bg-white border border-neutral-200 shadow-sm rounded-3xl relative overflow-hidden flex-1 flex flex-col p-8">
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-semibold text-neutral-900 mb-6" style={{ fontFamily: "var(--font-instrument-serif), serif", fontStyle: "italic" }}>Final Model Performance</h3>
                    <div className="flex items-baseline gap-4 mb-8">
                      <span className="text-[72px] leading-[80px] font-bold text-neutral-900 tracking-tighter">
                        {finalMetrics ? 
                          (finalMetrics.accuracy ? `${(finalMetrics.accuracy * 100).toFixed(1)}%` : `${(finalMetrics.r2 * 100).toFixed(1)}%`) 
                          : '...'}
                      </span>
                      <span className="text-sm text-neutral-500 font-medium">
                        {finalMetrics && finalMetrics.r2 ? 'R2 Score' : 'Validation Accuracy'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-12">
                      <div className="bg-[#f5f2ee] rounded-2xl p-5 border border-neutral-100">
                        <div className="text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-semibold">
                          {finalMetrics && finalMetrics.f1 ? 'F1 Score' : 'RMSE'}
                        </div>
                        <div className="text-2xl text-neutral-900 font-bold">
                          {finalMetrics ? 
                            (finalMetrics.f1 ? finalMetrics.f1.toFixed(3) : finalMetrics.rmse.toFixed(3))
                            : '...'}
                        </div>
                      </div>
                      <div className="bg-[#f5f2ee] rounded-2xl p-5 border border-neutral-100">
                        <div className="text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-semibold">
                          {finalMetrics && finalMetrics.precision ? 'Precision' : 'MAE'}
                        </div>
                        <div className="text-2xl text-neutral-900 font-bold">
                          {finalMetrics ? 
                            (finalMetrics.precision ? finalMetrics.precision.toFixed(3) : finalMetrics.mae.toFixed(3))
                            : '...'}
                        </div>
                      </div>
                      <div className="bg-[#f5f2ee] rounded-2xl p-5 border border-neutral-100">
                        <div className="text-[11px] text-neutral-500 mb-1 uppercase tracking-wider font-semibold">Model Size</div>
                        <div className="text-2xl text-neutral-900 font-bold">~5MB</div>
                      </div>
                    </div>
                  </div>
                  <a 
                    href={`http://127.0.0.1:8000/api/runs/${runId}/download`}
                    className="w-full h-14 rounded-full text-white bg-[#0b0f1a] shadow-lg font-medium text-[14px] flex items-center justify-center gap-3 transition-all hover:bg-black hover:shadow-xl active:scale-[0.99]"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download Final Model Package
                  </a>
                </div>
              </div>
            ) : (
              // Active Execution View
              <>
                <div className="flex-1 bg-white border border-neutral-200 shadow-sm rounded-3xl p-6 relative overflow-hidden flex flex-col group">
                  
                  <div className="flex justify-between items-center mb-6 relative z-10 border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f5f2ee] border border-neutral-200 flex items-center justify-center shadow-inner">
                        <svg className="w-5 h-5 text-neutral-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v2h-1c0 3.87-3.13 7-7 7H9c-3.87 0-7-3.13-7-7H1v-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 9a5 5 0 0 0-5 5h16a5 5 0 0 0-5-5H9z"/></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">{activeStage?.name || 'Initializing...'}</h3>
                        <p className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1.5 font-medium uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
                          Executing Tasks
                        </p>
                      </div>
                    </div>
                  </div>

                  {edaData ? (
                    <div className="flex-1 relative z-10 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="bg-[#f5f2ee] border border-neutral-200 rounded-2xl p-5 shadow-sm">
                        <h4 className="text-[14px] font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-neutral-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
                          Data Story
                        </h4>
                        <p className="text-neutral-700 text-sm font-medium leading-relaxed">{edaData.data_story}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm">
                          <h5 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Feature Correlations</h5>
                          <div className="flex flex-col gap-1.5">
                            {edaData.correlations.map((c: any, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-[#f5f2ee] p-2 rounded-lg">
                                <span className="text-[12px] font-semibold text-neutral-800">{c.feature}</span>
                                <span className={`text-[12px] font-bold ${c.correlation > 0 ? 'text-[#10b981]' : 'text-red-500'}`}>{c.correlation > 0 ? '+' : ''}{c.correlation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm">
                          <h5 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Dataset Overview</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#f5f2ee] p-3 rounded-lg text-center">
                              <div className="text-xl font-bold text-neutral-900">{edaData.num_rows}</div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Rows</div>
                            </div>
                            <div className="bg-[#f5f2ee] p-3 rounded-lg text-center">
                              <div className="text-xl font-bold text-neutral-900">{edaData.num_columns}</div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Columns</div>
                            </div>
                            <div className="col-span-2 bg-red-50 p-3 rounded-lg text-center border border-red-100">
                              <div className="text-lg font-bold text-red-600">{edaData.missing_values.feature1}</div>
                              <div className="text-[10px] uppercase tracking-widest text-red-500 font-medium">Missing Values Found</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 relative z-10">
                      {/* Visual Node */}
                      <div className="bg-[#f5f2ee] border border-neutral-200 rounded-2xl p-4 flex flex-col justify-center items-center relative overflow-hidden shadow-inner">
                        <div className="relative w-32 h-32 flex items-center justify-center my-6">
                          <div className="absolute inset-0 border-[3px] border-dashed border-[#10b981]/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                          <div className="w-12 h-12 bg-[#10b981] rounded-full animate-pulse flex items-center justify-center shadow-lg"></div>
                        </div>
                        
                        <div className="text-center relative z-10">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-[#10b981] font-bold mb-1">Neural Orchestrator</div>
                          <div className="text-[12px] text-neutral-500 font-medium">Processing {activeStage?.name}...</div>
                        </div>
                      </div>
                      
                      {/* Terminal Log */}
                      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col relative shadow-sm">
                        <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
                          <span className="text-[11px] text-neutral-500 font-mono font-medium">agent_sysout.log</span>
                          {activeStage && (
                            <span className="flex h-1.5 w-1.5 ml-auto relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]"></span>
                            </span>
                          )}
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto relative custom-scrollbar bg-[#f5f2ee]">
                          <div className="flex flex-col gap-1.5 font-mono text-[11px] text-neutral-600 min-h-full">
                            {logs.map((log, idx) => (
                              <div key={idx} className={`${log.startsWith('>') ? 'font-bold text-neutral-800' : 'text-neutral-500'}`}>
                                {log}
                              </div>
                            ))}
                            {!isComplete && <div className="animate-pulse opacity-50">&gt; _</div>}
                            <div ref={logsEndRef} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-36 relative z-10">
                  <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between group transition-all">
                    <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Cluster Utilization</h4>
                    <div className="flex justify-between items-end">
                      <span className="text-5xl font-bold text-neutral-900 tracking-tighter">{clusterUtil}%</span>
                      <span className="text-[10px] text-[#10b981] bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-bold uppercase">Optimal</span>
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between group transition-all">
                    <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Throughput</h4>
                    <div className="flex items-center gap-4 mt-auto">
                      <div className="w-10 h-10 rounded-full border-[3px] border-[#f5f2ee] border-t-[#0ea5e9] animate-spin"></div>
                      <div>
                        <div className="text-2xl font-bold text-neutral-900 tracking-tight">{throughput} GB/s</div>
                        <div className="text-[11px] text-neutral-500 font-medium">Processing velocity</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        /* No extra animations needed for the clean light theme */
      `}} />
    </div>
  );
}
