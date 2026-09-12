import React, { useContext } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Share2, Bookmark, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { Report as ReportType, Source, ResearchProject } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Report() {
  const { user } = useAuth();
  const { id } = useParams();
  
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [report, setReport] = useState<ReportType | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  
  const [followUpQuery, setFollowUpQuery] = useState('');
  const navigate = useNavigate();

  const handleFollowUp = async () => {
    if (!followUpQuery.trim() || !id) return;
    try {
      const res = await fetch(`/api/research/${id}/follow-up`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.uid || 'anonymous'}` },
        method: 'POST',
        
        body: JSON.stringify({ query: followUpQuery })
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.id) {
          navigate(`/research/new?id=${data.id}`);
        }
      }
    } catch (err) {
      console.error('Follow-up failed', err);
    }
  };

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    
    Promise.all([
      fetch(`/api/research/${id}`, { headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` } }),
      fetch(`/api/research/${id}/report`, { headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` } }),
      fetch(`/api/research/${id}/sources`, { headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` } })
    ]).then(async ([pRes, rRes, sRes]) => {
      if (pRes.status === 404 || rRes.status === 404) {
        setError("Report not found. The server may have restarted, or the ID is invalid.");
        return;
      }
      if (pRes.ok && pRes.headers.get('content-type')?.includes('application/json')) setProject(await pRes.json());
      if (rRes.ok && rRes.headers.get('content-type')?.includes('application/json')) setReport(await rRes.json());
      if (sRes.ok && sRes.headers.get('content-type')?.includes('application/json')) setSources(await sRes.json());
    }).catch(err => {
      console.error(err);
      setError("An error occurred loading the report.");
    });
  }, [id]);

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!project || !report) return <div className="p-8 text-muted-foreground">Loading report...</div>;

  const date = new Date(report.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const handleSave = async () => {
    if (!report || !project) return;
    const newSaveState = !report.isSaved;
    setReport({ ...report, isSaved: newSaveState });
    try {
      await fetch(`/api/research/${id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid || 'anonymous'}`
        },
        body: JSON.stringify({ saved: newSaveState })
      });
    } catch (err) {
      console.error('Failed to save report', err);
      setReport({ ...report, isSaved: !newSaveState });
    }
  };

  const handleDownload = () => {
    if (!report || !project) return;
    
    // Create Markdown content
    const mdContent = `# ${report.title}\n\n*Research Report • ${date} • ${project.depth} Depth*\n\n${report.executiveSummary}`;
    
    // Create Blob and trigger download
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.query.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.md`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-background overflow-hidden">
      {/* Report Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-12">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-2xl relative">
          {/* Header */}
          <div className="border-b border-border pb-6 sm:pb-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 mb-6">
              <div className="w-full sm:w-auto">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground mb-3 sm:mb-4">{report.title}</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Research Report • {date}</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button 
                  onClick={handleDownload}
                  className="p-2 bg-muted hover:bg-accent border border-border rounded-lg transition-colors text-foreground" 
                  title="Export Markdown"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSave} 
                  className={cn(
                    "p-2 bg-muted hover:bg-accent border border-border rounded-lg transition-colors", 
                    report.isSaved ? "text-indigo-400" : "text-foreground"
                  )} 
                  title={report.isSaved ? "Unsave" : "Save"}
                >
                  <Bookmark className={cn("w-5 h-5", report.isSaved && "fill-current")} />
                </button>
                <button className="p-2 bg-muted hover:bg-accent border border-border rounded-lg transition-colors text-foreground" title="Share">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-medium uppercase tracking-wider">
                {project.depth} Depth
              </span>
              <span className="px-3 py-1 bg-muted border border-border text-muted-foreground rounded-full text-xs font-medium uppercase tracking-wider">
                {sources.length} Sources Analyzed
              </span>
            </div>
          </div>

          {/* Content Body */}
          <div className="prose prose-invert prose-indigo max-w-none text-muted-foreground leading-relaxed markdown-body">
            <Markdown remarkPlugins={[remarkGfm]}>
              {report.executiveSummary}
            </Markdown>
          </div>
        </div>
      </div>

      {/* Sources Sidebar */}
      <div className="w-full lg:w-80 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">References</h3>
        </div>
        <div className="p-4 flex-1 lg:overflow-y-auto space-y-4">
          {sources.map((s, idx) => (
            <SourceItem key={s.id} num={idx + 1} title={s.title} domain={s.domain} quality={s.qualityScore} url={s.url} />
          ))}
          {sources.length === 0 && <div className="text-sm text-muted-foreground">No sources cited.</div>}
        </div>
        
        {/* Follow Up */}
        <div className="p-4 border-t border-border bg-muted">
          <h4 className="text-sm font-medium mb-3">Ask Follow-up</h4>
          <textarea 
            className="w-full bg-card border border-border rounded-lg p-3 text-sm text-foreground focus:border-indigo-500 outline-none resize-none"
            placeholder="Ask a question about this report..."
            rows={3}
            value={followUpQuery}
            onChange={(e) => setFollowUpQuery(e.target.value)}
          ></textarea>
          <button 
            onClick={handleFollowUp}
            className="w-full mt-3 bg-accent hover:bg-accent/80 text-foreground rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceItem({ num, title, domain, quality, url }: { num: number, title: string, domain: string, quality: string, url: string }) {
  return (
    <div className="bg-muted p-4 rounded-xl border border-border group hover:border-muted-foreground/30 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 rounded">[{num}]</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-2">{title}</h4>
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-muted-foreground truncate mr-2">{domain}</span>
        <span className={cn(
          "flex-shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
          quality === 'High' ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" : "text-amber-400 border-amber-400/20 bg-amber-400/10"
        )}>
          {quality}
        </span>
      </div>
    </div>
  );
}
