"use client";
import React, { useState, useEffect, useRef } from 'react';

type Stage = { name: string; status: string; };

export default function Home() {
  const [runId, setRunId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [problemStatement, setProblemStatement] = useState("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [edaData, setEdaData] = useState<any>(null);
  const [imputationStrategy, setImputationStrategy] = useState<string>('mean');
  const [logs, setLogs] = useState<string[]>([]);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);
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
    return (
      <main className="min-h-screen flex items-center justify-center p-4 md:p-12 antialiased relative z-10 bg-mesh font-body-md overflow-hidden">
        {/* Removed dark radial gradient */}
        <div className="w-full max-w-5xl relative z-20 flex flex-col items-center">
          <div className="text-center mb-16 animate-float">
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-on-surface mb-4 drop-shadow-sm text-glow">
              Aether<span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AutoML</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto font-light tracking-wide">
              Agentic Orchestration for the Modern Data Stack.
            </p>
          </div>
          
          <div className="glass-panel w-full rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group border-black/5 hover:border-primary/30 transition-colors duration-700">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-primary/20 transition-all duration-1000"></div>
            
            <form onSubmit={startNewRun} className="relative z-10 flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold tracking-widest text-primary uppercase">I want to build a model to...</label>
                <textarea 
                  className="w-full glass-input text-base md:text-lg p-4 min-h-[100px] resize-none font-light leading-relaxed placeholder:text-on-surface-variant/50 text-on-surface"
                  placeholder="Predict customer churn in the next 30 days..."
                  required
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                />
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center justify-between border-t border-black/5 pt-8">
                <div className="w-full md:w-1/2">
                   <div className="relative group/upload cursor-pointer h-20 rounded-2xl border border-dashed border-outline-variant flex items-center justify-center bg-surface-variant/50 hover:bg-primary/10 hover:border-primary/50 transition-all">
                     <input 
                       accept=".csv" 
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                       type="file"
                       onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
                     />
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface shadow-sm flex items-center justify-center text-primary group-hover/upload:scale-110 transition-transform">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm3-10.17L14.17 8H13v6h-2V8H9.83L12 5.83zM5 18h14v2H5z"/></svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-on-surface font-medium">{datasetFile ? datasetFile.name : 'Upload Dataset (Optional)'}</span>
                          <span className="text-xs text-on-surface-variant">If omitted, we'll synthesize mock data.</span>
                        </div>
                     </div>
                   </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full md:w-1/2 h-20 relative overflow-hidden group/btn bg-primary text-white font-bold text-xl rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale" 
                  type="submit"
                >
                  <span className="relative z-10 tracking-wider">{isSubmitting ? 'INITIALIZING...' : 'IGNITE PIPELINE'}</span>
                  <svg className="w-6 h-6 relative z-10 group-hover/btn:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
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
    <div className="bg-mesh min-h-screen font-body-md text-on-surface overflow-x-hidden relative">
      <div className="absolute top-0 right-0 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0"></div>
      
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-2xl border-b border-outline-variant/30 shadow-md flex justify-between items-center h-16 px-4 md:px-8">
        <div className="flex items-center h-full">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tighter self-center leading-none">AetherAutoML</span>
        </div>
        <div className="flex items-center gap-2 h-full">
          <button onClick={() => window.location.reload()} className="bg-gradient-to-r from-primary to-secondary text-on-primary font-bold px-6 py-2 rounded-full shadow-lg hover:shadow-primary/30 hover:opacity-90 transition-all flex items-center gap-2 transform hover:-translate-y-0.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            New Run
          </button>
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="mt-16 p-4 md:p-8 min-h-[calc(100vh-64px)] max-w-7xl mx-auto relative w-full flex flex-col">
        <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        
        <header className="mb-8 relative z-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-secondary' : 'bg-primary animate-pulse'}`}></span>
              <span className="text-xs text-primary tracking-widest uppercase font-semibold">
                {isComplete ? 'Run Complete' : 'Live Orchestration'}
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-on-surface">
              Run <span className="text-lg text-on-surface-variant ml-2">{runId}</span>
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
          
          {/* Vertical Timeline */}
          <section className="xl:col-span-4 glass-panel rounded-2xl p-6 shadow-xl flex flex-col h-[700px] border border-white/40">
            <div className="flex items-center gap-2 mb-8 border-b border-outline-variant/20 pb-4">
              <h3 className="text-xl font-semibold text-on-surface">Pipeline Stages</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-outline-variant/20 z-0"></div>
              <ul className="flex flex-col gap-8 relative z-10">
                {currentStages.map((stage, i) => {
                  const isCompleted = stage.status === 'completed';
                  const isRunning = stage.status === 'running';
                  const isIntervention = stage.status === 'human_intervention_required';
                  const isPending = stage.status === 'pending';
                  const isFailed = stage.status === 'failed';

                  return (
                    <li key={i} className={`flex gap-6 items-start ${isPending ? 'opacity-40 grayscale' : ''} relative pb-6`}>
                      {isRunning && <div className="absolute -left-3 -top-3 w-12 h-12 bg-primary/30 rounded-full blur-[16px] animate-pulse z-0 pointer-events-none"></div>}
                      {isIntervention && <div className="absolute -left-3 -top-3 w-12 h-12 bg-secondary/30 rounded-full blur-[16px] animate-pulse z-0 pointer-events-none"></div>}
                      
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black relative z-10 shadow-lg transition-all duration-500
                        ${isCompleted ? 'bg-primary text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}
                        ${isRunning ? 'bg-surface border border-primary text-primary shadow-[0_0_20px_rgba(16,185,129,0.8)]' : ''}
                        ${isIntervention ? 'bg-surface border border-secondary text-secondary shadow-[0_0_20px_rgba(14,165,233,0.8)]' : ''}
                        ${isFailed ? 'bg-red-500 text-white' : ''}
                        ${isPending ? 'bg-surface-variant/50 text-white/50 border border-white/10' : ''}
                      `}>
                        {isCompleted && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                        {isRunning && <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>}
                        {isIntervention && <div className="w-2 h-2 bg-secondary rounded-full animate-ping"></div>}
                        {isFailed && <span className="text-white">!</span>}
                        {isPending && <span>{i + 1}</span>}
                      </div>

                      <div className="pt-1 flex-1">
                        <h4 className={`text-sm font-bold tracking-wider uppercase ${isRunning ? 'text-primary' : isIntervention ? 'text-secondary' : 'text-on-surface'}`}>
                          {stage.name}
                        </h4>
                        
                        {isRunning && (
                          <div className="mt-3 bg-surface rounded-xl p-3 border border-primary/20 relative overflow-hidden shadow-inner">
                            <div className="absolute bottom-0 left-0 h-[1px] bg-primary/30 w-full"></div>
                            <div className="absolute bottom-0 left-0 h-[2px] bg-primary w-[50%] animate-[shimmer_2s_infinite]"></div>
                            <p className="text-[11px] text-primary mb-1 uppercase tracking-widest font-mono">Agent processing...</p>
                          </div>
                        )}
                        {isIntervention && (
                          <div className="mt-3 bg-secondary/10 rounded-xl p-4 border border-secondary/30 relative overflow-hidden backdrop-blur-md">
                            <p className="text-xs text-secondary mb-2 font-bold uppercase tracking-widest flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></span>
                              Human Checkpoint
                            </p>
                            {stage.name === 'Profiling' ? (
                               <p className="text-xs text-on-surface-variant mb-4 leading-relaxed font-light">Review the <span className="font-bold text-secondary">Data Story</span> on the right, then approve to continue the pipeline.</p>
                            ) : stage.name === 'Cleaning' ? (
                               <div className="mb-4">
                                 <p className="text-xs text-on-surface-variant mb-2 font-light">Select Imputation Strategy:</p>
                                 <select className="w-full bg-surface border border-outline-variant/50 text-sm rounded-lg p-3 focus:ring-1 focus:ring-secondary text-on-surface shadow-inner outline-none transition-all" value={imputationStrategy} onChange={e => setImputationStrategy(e.target.value)}>
                                   <option value="mean">Mean Imputation</option>
                                   <option value="median">Median Imputation</option>
                                   <option value="drop">Drop Rows</option>
                                 </select>
                               </div>
                            ) : null}
                            <button 
                              onClick={() => approveStage(stage.name, stage.name === 'Cleaning' ? { strategy: imputationStrategy } : undefined)} 
                              className="px-4 py-3 bg-secondary text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] transition-all w-full active:scale-95 flex items-center justify-center gap-2"
                            >
                              Approve & Continue
                            </button>
                          </div>
                        )}
                        {isCompleted && (
                          <p className="text-xs text-on-surface-variant/50 mt-1 font-mono tracking-wider">Task resolved</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Main Content Area */}
          <section className="xl:col-span-8 flex flex-col gap-8 h-[700px]">
            {isComplete ? (
              // Final Complete View
              <div className="glass-panel bg-surface/80 backdrop-blur-xl border border-outline-variant/30 shadow-sm rounded-xl relative overflow-hidden flex-1 flex flex-col p-8">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(16,185,129,0.05)_0%,rgba(244,251,244,0)_70%)] animate-[pulseGlow_4s_ease-in-out_infinite_alternate] pointer-events-none"></div>
                <div className="relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-3xl font-semibold text-on-surface mb-6">Final Model Performance</h3>
                    <div className="flex items-baseline gap-4 mb-8">
                      <span className="text-[72px] leading-[80px] font-bold text-primary tracking-tighter">
                        {finalMetrics ? 
                          (finalMetrics.accuracy ? `${(finalMetrics.accuracy * 100).toFixed(1)}%` : `${(finalMetrics.r2 * 100).toFixed(1)}%`) 
                          : '...'}
                      </span>
                      <span className="text-xl text-on-surface-variant font-medium">
                        {finalMetrics && finalMetrics.r2 ? 'R2 Score' : 'Validation Accuracy'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-12">
                      <div className="bg-surface-container-lowest/50 rounded-lg p-4 border border-outline-variant/20">
                        <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">
                          {finalMetrics && finalMetrics.f1 ? 'F1 Score' : 'RMSE'}
                        </div>
                        <div className="text-2xl text-on-surface font-medium">
                          {finalMetrics ? 
                            (finalMetrics.f1 ? finalMetrics.f1.toFixed(3) : finalMetrics.rmse.toFixed(3))
                            : '...'}
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest/50 rounded-lg p-4 border border-outline-variant/20">
                        <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">
                          {finalMetrics && finalMetrics.precision ? 'Precision' : 'MAE'}
                        </div>
                        <div className="text-2xl text-on-surface font-medium">
                          {finalMetrics ? 
                            (finalMetrics.precision ? finalMetrics.precision.toFixed(3) : finalMetrics.mae.toFixed(3))
                            : '...'}
                        </div>
                      </div>
                      <div className="bg-surface-container-lowest/50 rounded-lg p-4 border border-outline-variant/20">
                        <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">Model Size</div>
                        <div className="text-2xl text-on-surface font-medium">~5MB</div>
                      </div>
                    </div>
                  </div>
                  <a 
                    href={`http://127.0.0.1:8000/api/runs/${runId}/download`}
                    className="w-full py-6 rounded-xl text-on-primary bg-gradient-to-b from-[#10b981] to-[#059669] shadow-inner font-semibold text-xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download Final Model Package
                  </a>
                </div>
              </div>
            ) : (
              // Active Execution View
              <>
                <div className="flex-1 glass-panel border border-white/10 shadow-2xl rounded-3xl p-8 relative overflow-hidden flex flex-col group">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
                  <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none transition-all duration-1000 group-hover:bg-primary/30"></div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6 text-primary animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v2h-1c0 3.87-3.13 7-7 7H9c-3.87 0-7-3.13-7-7H1v-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 9a5 5 0 0 0-5 5h16a5 5 0 0 0-5-5H9z"/></svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-wide text-on-surface uppercase">{activeStage?.name || 'Initializing...'}</h3>
                        <p className="text-xs text-primary mt-1 flex items-center gap-2 font-mono tracking-widest">
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                          Executing Tasks
                        </p>
                      </div>
                    </div>
                  </div>

                  {edaData ? (
                    <div className="flex-1 relative z-10 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 shadow-inner">
                        <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
                          Data Story
                        </h4>
                        <p className="text-on-surface-variant font-medium leading-relaxed">{edaData.data_story}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel border border-white/20 p-4 rounded-xl shadow-sm">
                          <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Feature Correlations</h5>
                          <div className="flex flex-col gap-2">
                            {edaData.correlations.map((c: any, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-surface-container/50 p-2 rounded">
                                <span className="text-sm font-semibold">{c.feature}</span>
                                <span className={`text-sm font-bold ${c.correlation > 0 ? 'text-primary' : 'text-error'}`}>{c.correlation > 0 ? '+' : ''}{c.correlation}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="glass-panel border border-white/20 p-4 rounded-xl shadow-sm">
                          <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Dataset Overview</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-surface-container/50 p-3 rounded text-center">
                              <div className="text-2xl font-bold text-on-surface">{edaData.num_rows}</div>
                              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Rows</div>
                            </div>
                            <div className="bg-surface-container/50 p-3 rounded text-center">
                              <div className="text-2xl font-bold text-on-surface">{edaData.num_columns}</div>
                              <div className="text-[10px] uppercase tracking-widest text-on-surface-variant">Columns</div>
                            </div>
                            <div className="col-span-2 bg-error/10 p-3 rounded text-center border border-error/20">
                              <div className="text-xl font-bold text-error">{edaData.missing_values.feature1}</div>
                              <div className="text-[10px] uppercase tracking-widest text-error">Missing Values Found</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 relative z-10">
                      {/* Visual Node - Astonishing AI Core */}
                      <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center relative overflow-hidden backdrop-blur-md">
                        <div className="absolute inset-0 bg-primary/5"></div>
                        
                        {/* Core Animation */}
                        <div className="relative w-48 h-48 flex items-center justify-center my-8">
                          {/* Outer rotating rings */}
                          <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                          <div className="absolute inset-6 border border-secondary/40 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>
                          
                          {/* Inner pulsing core */}
                          <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary rounded-full animate-pulse flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.8)]">
                            <div className="w-6 h-6 bg-white rounded-full blur-[2px]"></div>
                          </div>
                          
                          {/* Data particles flying out */}
                          <div className="absolute w-2 h-2 bg-primary rounded-full animate-ping top-0 left-1/2"></div>
                          <div className="absolute w-2 h-2 bg-secondary rounded-full animate-ping bottom-8 right-4" style={{ animationDelay: '0.5s' }}></div>
                          <div className="absolute w-2 h-2 bg-primary rounded-full animate-ping bottom-8 left-4" style={{ animationDelay: '1.2s' }}></div>
                        </div>
                        
                        <div className="text-center relative z-10">
                          <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-2">Neural Orchestrator</div>
                          <div className="text-sm text-on-surface-variant font-light">Processing {activeStage?.name}...</div>
                        </div>
                      </div>
                      {/* Terminal Log */}
                      <div className="bg-surface-container-low rounded-lg border border-outline-variant/30 overflow-hidden flex flex-col relative shadow-inner">
                        <div className="px-4 py-2 bg-surface-container border-b border-outline-variant/20 flex items-center gap-2">
                          <span className="text-xs text-on-surface-variant font-mono">agent_sysout.log</span>
                          {activeStage && (
                            <span className="flex h-2 w-2 ml-auto relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                          )}
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto relative custom-scrollbar">
                          <div className="flex flex-col gap-1 font-mono text-[11px] text-primary-fixed-dim min-h-full">
                            {logs.map((log, idx) => (
                              <div key={idx} className={`${log.startsWith('>') ? 'opacity-90 font-bold text-primary-fixed' : 'opacity-70'}`}>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-48 relative z-10">
                  <div className="glass-panel border border-white/30 rounded-2xl p-6 shadow-lg flex flex-col justify-between group hover:shadow-primary/20 transition-all cursor-default">
                    <h4 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">Cluster Utilization</h4>
                    <div className="flex justify-between items-end">
                      <span className="text-6xl font-extrabold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent drop-shadow-sm">78%</span>
                      <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full font-bold shadow-sm">Optimal</span>
                    </div>
                  </div>
                  <div className="glass-panel border border-white/30 rounded-2xl p-6 shadow-lg flex flex-col justify-between group hover:shadow-secondary/20 transition-all cursor-default">
                    <h4 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">Throughput</h4>
                    <div className="flex items-center gap-5 mt-auto">
                      <div className="w-14 h-14 rounded-full border-4 border-surface-variant border-t-primary animate-spin shadow-inner"></div>
                      <div>
                        <div className="text-3xl font-bold text-on-surface drop-shadow-sm">4.2 GB/s</div>
                        <div className="text-xs text-on-surface-variant font-medium">Processing velocity</div>
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
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}} />
    </div>
  );
}
