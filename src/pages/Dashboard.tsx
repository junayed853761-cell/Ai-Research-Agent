import React, { useContext } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, Zap, Target, BookOpen, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { ResearchProject } from '../types';

function getStatusLabel(status: string) {
  switch(status) {
    case 'started': return 'Initializing';
    case 'planning': return 'Planning';
    case 'searching': return 'Searching';
    case 'analyzing': return 'Verifying';
    case 'synthesis': return 'Synthesizing';
    case 'completed': return 'Completed';
    case 'error': return 'Failed';
    default: return status;
  }
}

function ProjectProgressBar({ status }: { status: string }) {
  const steps = ['started', 'planning', 'searching', 'analyzing', 'synthesis', 'completed'];
  const currentIndex = steps.indexOf(status);
  const isError = status === 'error';

  let progressValue = 5;
  if (isError) progressValue = 100;
  else if (currentIndex >= 0) {
    progressValue = Math.max(5, (currentIndex / (steps.length - 1)) * 100);
  }

  const chartData = [
    { name: 'progress', done: progressValue, left: 100 - progressValue }
  ];

  return (
    <div className="h-3 w-full rounded-full overflow-hidden bg-muted border border-border relative flex items-center">
      <ResponsiveContainer width="100%" height={30}>
        <BarChart 
          layout="vertical" 
          data={chartData} 
          margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
          barSize={12}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="name" hide />
          <Bar dataKey="done" stackId="a" fill={isError ? '#EF4444' : '#6366F1'} isAnimationActive={true} animationDuration={500} />
          <Bar dataKey="left" stackId="a" fill="transparent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [query, setQuery] = useState(() => sessionStorage.getItem('dashboard_query') || '');
  const [depth, setDepth] = useState(() => sessionStorage.getItem('dashboard_depth') || 'Standard');
  const [provider, setProvider] = useState(() => sessionStorage.getItem('dashboard_provider') || 'Auto');
  const [compareMode, setCompareMode] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setQuery('');
      sessionStorage.removeItem('dashboard_query');
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e as unknown as React.FormEvent);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
    sessionStorage.setItem('dashboard_query', query);
  }, [query]);

  useEffect(() => {
    sessionStorage.setItem('dashboard_depth', depth);
  }, [depth]);

  useEffect(() => {
    sessionStorage.setItem('dashboard_provider', provider);
  }, [provider]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    try {
      const payload: any = { 
        query, 
        depth, 
        type: 'General',
        preferredProvider: provider
      };
      if (compareMode) {
        payload.models = ['Cerebras', 'Groq'];
      }
      
      const res = await fetch('/api/research', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.uid || 'anonymous'}` },
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.ids) {
          navigate(`/research/new?ids=${data.ids.join(',')}`);
        } else if (data.id) {
          navigate(`/research/new?id=${data.id}`);
        }
      } else {
        console.error('API failed or returned non-JSON:', res.status, contentType);
      }
    } catch (err) {
      console.error('Failed to start research', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-center mb-12 lg:mb-16 mt-4 lg:mt-8">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 lg:mb-6 bg-gradient-to-r from-white to-muted-foreground bg-clip-text text-transparent">
            Research Smarter.<br />Understand Faster.
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            ResearchPilot AI searches, analyzes, cross-checks and transforms complex questions into evidence-backed intelligence powered by Cerebras & Groq.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-xl mb-12 lg:mb-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50" />
          <form onSubmit={handleSearch} className="relative">
            <div className="flex flex-col sm:flex-row items-end bg-muted rounded-xl border border-border p-2 sm:px-4 sm:py-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all gap-3 sm:gap-0">
              <div className="flex items-start flex-1 px-2 sm:px-0 w-full">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mr-3 shrink-0 mt-1" />
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="What would you like to research? (Press Enter to submit, Shift+Enter for newline)"
                  className="flex-1 bg-transparent border-none outline-none text-base sm:text-lg placeholder:text-muted-foreground/70 text-foreground w-full resize-none overflow-y-auto min-h-[28px] sm:min-h-[32px] py-0.5"
                  value={query}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button 
                type="submit"
                className="w-full sm:w-auto sm:ml-4 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                Research <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-6 sm:mt-4 px-2 gap-4 md:gap-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Provider:</span>
                  <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
                    {(['Auto', 'Cerebras', 'Groq'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProvider(p)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-all",
                          provider === p
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title={p === 'Cerebras' ? 'Cerebras (Llama 3.3 70B Long Context)' : p === 'Auto' ? 'Smart Cerebras & Groq Routing' : 'Groq Fast Llama 3.3'}
                      >
                        {p === 'Cerebras' ? '⚡ Cerebras' : p === 'Auto' ? '🔄 Auto (Cerebras + Groq)' : p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Depth:</span>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    {(['Quick', 'Standard', 'Deep', 'Comprehensive'] as const).map((d) => (
                      <label key={d} className="flex items-center gap-1.5 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="depth" 
                          value={d} 
                          checked={depth === d} 
                          onChange={() => setDepth(d)}
                          className="hidden" 
                        />
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors shrink-0",
                          depth === d ? "border-indigo-500 bg-indigo-500/20" : "border-border group-hover:border-muted-foreground"
                        )}>
                          {depth === d && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </div>
                        <span className={cn(
                          "text-xs transition-colors",
                          depth === d ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
                        )}>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer group pt-2 md:pt-0 border-t border-border md:border-0 w-full md:w-auto mt-2 md:mt-0">
                <div className={cn(
                  "w-10 h-5 rounded-full relative transition-colors border shrink-0",
                  compareMode ? "bg-indigo-500/20 border-indigo-500" : "bg-muted border-border"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-background transition-all",
                    compareMode ? "left-5 bg-indigo-500" : "left-0.5 bg-muted-foreground"
                  )} />
                </div>
                <input type="checkbox" className="hidden" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} />
                <span className={cn("text-sm transition-colors", compareMode ? "text-indigo-400 font-medium" : "text-muted-foreground")}>
                  Compare Cerebras vs Groq
                </span>
              </label>
            </div>
          </form>
        </div>



        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-indigo-400" />}
            title="Multi-Step Research"
            description="Our agents recursively search the web, reading and extracting data from dozens of pages automatically."
          />
          <FeatureCard 
            icon={<Target className="w-6 h-6 text-purple-400" />}
            title="Evidence-Based Analysis"
            description="Every claim is cross-checked against multiple sources for accuracy and confidence scoring."
          />
          <FeatureCard 
            icon={<BookOpen className="w-6 h-6 text-blue-400" />}
            title="Automated Reports"
            description="Receive a comprehensive, beautifully formatted report with inline citations and references."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border hover:border-muted-foreground/30 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 border border-border">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
