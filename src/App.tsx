import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './lib/AuthContext';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Report from './pages/Report';
import Settings from './pages/Settings';
import History from './pages/History';
import SavedReports from './pages/SavedReports';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="researchpilot-theme">
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/research" element={<History />} />
                <Route path="/research/new" element={<Workspace />} />
                <Route path="/reports" element={<SavedReports />} />
                <Route path="/reports/:id" element={<Report />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<div className="p-8">Page not found</div>} />
              </Routes>
            </Layout>
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
