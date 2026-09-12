import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/AuthContext';
import { Link } from 'react-router-dom';
import { Library, Clock, ChevronRight, CheckCircle2, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { ResearchProject } from '../types';
import { cn } from '../lib/utils';

export default function History() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['research_history', user?.uid],
    queryFn: async () => {
      try {
        const res = await fetch('/api/research', {
          headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` }
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          return await res.json();
        }
        return [];
      } catch (e) {
        console.warn('History fetch:', e);
        return [];
      }
    },
    retry: false,
  });

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await fetch('/api/research/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` }
      });
      queryClient.invalidateQueries({ queryKey: ['research_history'] });
      setConfirmDeleteAll(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDeletingId(id);
    try {
      await fetch(`/api/research/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` }
      });
      queryClient.invalidateQueries({ queryKey: ['research_history'] });
      setConfirmDeleteId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'started': return 'Initializing';
      case 'planning': return 'Planning';
      case 'searching': return 'Searching';
      case 'analyzing': return 'Verifying';
      case 'synthesis': return 'Synthesizing';
      case 'completed': return 'Complete';
      case 'error': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <div className="h-full w-full bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-3 flex items-center gap-3">
              <Library className="w-8 h-8 text-indigo-500" />
              Research History
            </h1>
            <p className="text-muted-foreground text-lg">
              Review your previous research projects and their status.
            </p>
          </div>
          {projects.length > 0 && (
            confirmDeleteAll ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Are you sure?</span>
                <button 
                  onClick={() => setConfirmDeleteAll(false)}
                  className="px-3 py-1.5 bg-muted hover:bg-muted-foreground/20 text-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg text-sm font-medium transition-colors"
                >
                  {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setConfirmDeleteAll(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete All History
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading your history...
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
            <Library className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No research history</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't conducted any research yet. Start your first deep-dive analysis from the dashboard.
            </p>
            <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="group relative bg-card border border-border hover:border-indigo-500/30 rounded-xl overflow-hidden transition-all duration-200"
              >
                <Link 
                  to={project.status === 'completed' ? `/reports/${project.id}` : `/research/new?id=${project.id}`}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col pr-12 sm:pr-0 overflow-hidden max-w-full sm:max-w-[50%] md:max-w-[60%]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-muted rounded-full">
                        {project.type} • {project.depth}
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-foreground truncate group-hover:text-indigo-400 transition-colors">
                      {project.query}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-border sm:border-0 pt-4 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {getStatusLabel(project.status)}
                      </span>
                      {project.status === 'completed' ? (
                        <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Done
                        </div>
                      ) : project.status === 'error' ? (
                        <div className="flex items-center gap-1.5 text-rose-500 text-sm font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          Error
                        </div>
                      ) : project.status === 'cancelled' ? (
                        <div className="flex items-center gap-1.5 text-amber-500 text-sm font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          Cancelled
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-indigo-400 text-sm font-medium">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          In Progress
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </Link>
                
                {/* Delete button positioned absolute to not mess up flex layout on small screens */}
                {confirmDeleteId === project.id ? (
                  <div className="absolute top-4 right-4 sm:top-1/2 sm:-translate-y-1/2 sm:right-16 flex items-center gap-2 bg-card border border-border p-1.5 rounded-lg shadow-sm z-10">
                    <span className="text-xs font-medium px-1">Delete?</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }}
                      className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted-foreground/20"
                    >
                      No
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(e, project.id)}
                      disabled={deletingId === project.id}
                      className="px-2 py-1 text-xs bg-rose-500 text-white rounded hover:bg-rose-600 flex items-center justify-center min-w-[36px]"
                    >
                      {deletingId === project.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(project.id); }}
                    className="absolute top-4 right-4 sm:top-1/2 sm:-translate-y-1/2 sm:right-16 text-muted-foreground hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete research"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
