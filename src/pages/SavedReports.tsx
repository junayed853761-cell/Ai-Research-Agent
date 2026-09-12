import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, BookmarkMinus, Clock, ChevronRight } from 'lucide-react';
import { Report } from '../types';

export default function SavedReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading: loading } = useQuery({
    queryKey: ['saved_reports', user?.uid],
    queryFn: async () => {
      try {
        const res = await fetch('/api/reports/saved', {
          headers: { 'Authorization': `Bearer ${user?.uid || 'anonymous'}` }
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return data;
        }
        return [];
      } catch (e) {
        console.warn('Saved reports fetch:', e);
        return [];
      }
    },
    retry: false,
  });

  const unsaveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await fetch(`/api/research/${projectId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid || 'anonymous'}`
        },
        body: JSON.stringify({ saved: false })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_reports'] });
    },
  });

  const handleUnsave = (e: React.MouseEvent, reportId: string, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    unsaveMutation.mutate(projectId);
  };

  return (
    <div className="h-full w-full bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3 flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-500" />
            Saved Reports
          </h1>
          <p className="text-muted-foreground text-lg">
            Your collection of saved research and analysis reports.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading your saved reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No saved reports yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              When you find a research report useful, click the bookmark icon to save it here for quick access later.
            </p>
            <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
              Start New Research
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report: Report) => (
              <Link 
                key={report.id} 
                to={`/reports/${report.projectId}`}
                className="group bg-card border border-border hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <button 
                    onClick={(e) => handleUnsave(e, report.id, report.projectId)}
                    className="text-muted-foreground hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove from saved"
                  >
                    <BookmarkMinus className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                  {report.title}
                </h3>
                <div className="prose prose-sm prose-invert text-muted-foreground line-clamp-3 mb-6">
                  {report.executiveSummary.replace(/[#*`_]/g, '')}
                </div>
                <div className="mt-auto pt-4 border-t border-border flex items-center text-sm font-medium text-indigo-400 group-hover:text-indigo-300">
                  Read full report
                  <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
