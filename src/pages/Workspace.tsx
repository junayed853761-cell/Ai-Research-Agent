import React, { useContext } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, BarChart, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { ResearchProject, Source, Evidence, Report as ReportType } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STEPS = [
  { id: 'started', label: 'Initializing' },
  { id: 'planning', label: 'Planning' },
  { id: 'searching', label: 'Searching' },
  { id: 'analyzing', label: 'Verifying' },
  { id: 'synthesis', label: 'Synthesizing' }
];

function WorkspacePanel({ id, onComplete }: { id: string, onComplete: (status: string) => void }) {
  const { user } = useAuth();
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [report, setReport] = useState<ReportType | null>(null);

    const handleStop = async () => {
    try {
      await fetch(`/api/research/${id}/cancel`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` }
      });
      setProject(prev => prev ? { ...prev, status: 'cancelled' } : null);
      onComplete('cancelled');
    } catch (err) {
      console.error('Failed to cancel', err);
    }
  };

  const status = project?.status || 'started';
  const currentStepIndex = STEPS.findIndex(s => s.id === status);

  useEffect(() => {
    let isSubscribed = true;
    
    const fetchStatus = async () => {
      try {
        const [projRes, srcRes, evRes, repRes] = await Promise.all([
          fetch(`/api/research/${id}`, { headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` } }),
          fetch(`/api/research/${id}/sources`, { headers: { "Authorization": `Bearer ${user?.uid || "anonymous"}` } }),
          fetch(`/api/research/${id}/evidence`, { headers: { "Authorization": `Bearer ${user?.uid || "anonymous"}` } }),
          fetch(`/api/research/${id}/report`, { headers: { "Authorization": `Bearer ${user?.uid || "anonymous"}` } })
        ]);
        
        if (!isSubscribed) return;

        if (!projRes.ok || !projRes.headers.get('content-type')?.includes('application/json')) {
          if (projRes.status === 404) {
            setProject({ id, query: 'Not Found', depth: 'Quick', type: 'General', status: 'error', createdAt: new Date().toISOString() });
            onComplete('error');
          }
          return;
        }

        const proj = await projRes.json();
        setProject(proj);
        if (srcRes.ok && srcRes.headers.get('content-type')?.includes('application/json')) setSources(await srcRes.json());
        if (evRes.ok && evRes.headers.get('content-type')?.includes('application/json')) setEvidence(await evRes.json());
        if (repRes.ok && repRes.headers.get('content-type')?.includes('application/json')) setReport(await repRes.json());
        
        if (proj.status === 'completed' || proj.status === 'error') {
          onComplete(proj.status);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    };

    fetchStatus();
    const interval = setInterval(() => {
      if (status !== 'completed' && status !== 'error' && status !== 'cancelled') {
        fetchStatus();
      }
    }, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [id, status, onComplete]);

  if (status === 'completed' && report) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-card border-b lg:border-b-0 lg:border-r border-border last:border-b-0 lg:last:border-r-0">
        <div className="mb-6">
          <span className="text-xs font-bold px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30 uppercase tracking-wider mb-4 inline-block">
            {project?.preferredProvider || 'Standard'} Output
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{project?.query}</h2>
        </div>
        <div className="prose prose-invert prose-indigo max-w-none text-muted-foreground leading-relaxed markdown-body">
          <Markdown remarkPlugins={[remarkGfm]}>
            {report.executiveSummary}
          </Markdown>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border last:border-b-0 lg:last:border-r-0 shrink-0 lg:shrink">
      <div className="max-w-xl w-full mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Live Workspace</h2>
              {project?.preferredProvider && (
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                  {project.preferredProvider}
                </span>
              )}
            </div>
            {status !== 'completed' && status !== 'error' && status !== 'cancelled' && (
              <button 
                onClick={handleStop}
                className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded border border-red-500/30 text-xs font-medium transition-colors"
              >
                Stop Research
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold">{project?.query || 'Initializing...'}</h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-xl mb-6">
          <div className="flex items-center gap-3 mb-6">
            {status === 'cancelled' ? (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            ) : status !== 'completed' && status !== 'error' ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            ) : status === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <h3 className="text-lg font-semibold">
              {status === 'error' ? 'Research Failed' : status === 'cancelled' ? 'Research Stopped' : status !== 'completed' ? 'Researching...' : 'Research Complete'}
            </h3>
          </div>

          <div className="flex items-center justify-between relative mt-8 mb-4 pb-8 px-4">
            <div className="absolute left-8 right-8 top-4 -translate-y-1/2 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-700 ease-in-out" 
                style={{ 
                  width: `${status === 'error' || status === 'completed' || status === 'cancelled' ? 100 : (Math.max(0, currentStepIndex) / (STEPS.length - 1)) * 100}%`,
                  backgroundColor: status === 'error' ? '#ef4444' : status === 'cancelled' ? '#f59e0b' : ''
                }}
              />
            </div>
            
            {STEPS.map((step, index) => {
              const isCompleted = currentStepIndex > index || status === 'completed';
              const isCurrent = currentStepIndex === index && status !== 'completed' && status !== 'error';
              const isPending = currentStepIndex < index && status !== 'completed' && status !== 'error';

              return (
                <div key={step.id} className="relative flex flex-col items-center z-10 w-24">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 bg-card",
                    isCompleted ? "border-indigo-500 text-indigo-500" :
                    isCurrent ? "border-indigo-400 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] ring-4 ring-indigo-500/20" :
                    status === 'error' ? "border-rose-500 text-rose-500" :
                    "border-border text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-semibold text-center mt-3 absolute top-full w-max",
                    isCurrent ? "text-foreground" : isPending ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats inline for compare view */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-xl p-4 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Sources</div>
            <div className="text-2xl font-bold">{sources.length}</div>
          </div>
          <div className="bg-muted rounded-xl p-4 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Evidence Items</div>
            <div className="text-2xl font-bold">{evidence.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Workspace() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const idParam = searchParams.get('id');
  const idsParam = searchParams.get('ids');
  
  const ids = idsParam ? idsParam.split(',') : (idParam ? [idParam] : []);
  const isCompareMode = ids.length > 1;

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (ids.length === 0) {
      sessionStorage.removeItem('dashboard_query');
      navigate('/?new=1', { replace: true });
    }
  }, [ids.length, navigate]);

  const handleComplete = (id: string, status: string) => {
    if (status === 'completed' || status === 'error') {
      setCompletedMap(prev => ({ ...prev, [id]: true }));
    }
  };

  useEffect(() => {
    if (!isCompareMode && ids.length === 1 && completedMap[ids[0]]) {
      navigate(`/reports/${ids[0]}`);
    }
  }, [completedMap, isCompareMode, ids, navigate]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-background overflow-auto lg:overflow-hidden">
      {ids.map(id => (
        <WorkspacePanel key={id} id={id} onComplete={(s) => handleComplete(id, s)} />
      ))}
    </div>
  );
}
