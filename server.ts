import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';
import { runResearchTask, activeControllers } from './src/server/agent.js';
import { db, collection, getDocs, getDoc, doc, query, where, setDoc, deleteDoc, updateDoc } from './src/server/firestore.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  function getUserId(req) {
    return req.headers.authorization?.split('Bearer ')[1] || 'anonymous';
  }

  // --- API Routes ---
  app.get('/api/research', async (req, res) => {
    try {
      const userId = getUserId(req);
      const q = query(collection(db, 'research_projects'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const projects = snap.docs.map(d => d.data()).sort(
        (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      res.json(projects);
    } catch (e: any) {
      console.warn('Notice: returning empty research projects:', e?.message || e);
      res.json([]);
    }
  });

  app.post('/api/research', async (req, res) => {
    try {
      const { query: searchQuery, depth, type, models, preferredProvider } = req.body;
      const userId = getUserId(req);

      if (models && Array.isArray(models) && models.length > 0) {
        const ids: string[] = [];
        for (const model of models) {
          const id = randomUUID();
          const project = { 
            id, 
            query: searchQuery, 
            depth, 
            type: type || 'General', 
            status: 'started', 
            createdAt: new Date().toISOString(),
            preferredProvider: model,
            userId
          };
          await setDoc(doc(db, 'research_projects', id), project);
          ids.push(id);
          runResearchTask(id, searchQuery, depth).catch(err => console.error('Agent error:', err));
        }
        res.json({ ids });
        return;
      }

      const id = randomUUID();
      const project = { 
        id, 
        query: searchQuery, 
        depth, 
        type: type || 'General', 
        status: 'started', 
        createdAt: new Date().toISOString(),
        preferredProvider: preferredProvider && preferredProvider !== 'Auto' ? preferredProvider : undefined,
        userId
      };
      await setDoc(doc(db, 'research_projects', id), project);
      runResearchTask(id, searchQuery, depth).catch(err => console.error('Agent error:', err));
      res.json({ id, status: project.status });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/research/:id/status', async (req, res) => {
    try {
      const d = await getDoc(doc(db, 'research_projects', req.params.id));
      if (!d.exists()) return res.status(404).json({ error: 'Not found' });
      res.json({ status: d.data().status });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/research/:id', async (req, res) => {
    try {
      const d = await getDoc(doc(db, 'research_projects', req.params.id));
      if (!d.exists()) return res.status(404).json({ error: 'Not found' });
      res.json(d.data());
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/research/:id/sources', async (req, res) => {
    try {
      const q = query(collection(db, 'research_sources'), where('projectId', '==', req.params.id));
      const snap = await getDocs(q);
      res.json(snap.docs.map(d => d.data()));
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/research/:id/evidence', async (req, res) => {
    try {
      const q = query(collection(db, 'research_evidence'), where('projectId', '==', req.params.id));
      const snap = await getDocs(q);
      res.json(snap.docs.map(d => d.data()));
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/research/:id/report', async (req, res) => {
    try {
      const q = query(collection(db, 'research_reports'), where('projectId', '==', req.params.id));
      const snap = await getDocs(q);
      if (snap.empty) return res.status(404).json({ error: 'Not found' });
      res.json(snap.docs[0].data());
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/research/:id/follow-up', async (req, res) => {
    try {
      const original = await getDoc(doc(db, 'research_projects', req.params.id));
      if (!original.exists()) return res.status(404).json({ error: 'Not found' });
      const { query: followUpQuery } = req.body;
      const newId = randomUUID();
      const project = { 
        id: newId, 
        query: `Follow up: ${followUpQuery}`, 
        depth: original.data().depth, 
        type: 'Follow-up', 
        status: 'started', 
        createdAt: new Date().toISOString(),
        userId: getUserId(req)
      };
      await setDoc(doc(db, 'research_projects', newId), project);
      runResearchTask(newId, project.query, project.depth).catch(err => console.error('Agent error:', err));
      res.json({ id: newId, status: project.status });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

    app.post('/api/research/:id/save', async (req, res) => {
    try {
      const { saved } = req.body;
      const q = query(collection(db, 'research_reports'), where('projectId', '==', req.params.id));
      const snap = await getDocs(q);
      if (snap.empty) return res.status(404).json({ error: 'Not found' });
      
      const reportDoc = snap.docs[0];
      await updateDoc(doc(db, 'research_reports', reportDoc.id), { isSaved: saved, userId: getUserId(req) });
      res.json({ success: true, isSaved: saved });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  
  app.get('/api/reports/saved', async (req, res) => {
    try {
      const userId = getUserId(req);
      const q = query(collection(db, 'research_reports'), where('isSaved', '==', true), where('userId', '==', userId));
      let snap = await getDocs(q);
      
      // Fallback for reports saved before we added userId to the report document
      if (snap.empty) {
        const fallbackQ = query(collection(db, 'research_reports'), where('isSaved', '==', true));
        const allSaved = await getDocs(fallbackQ);
        
        // Fetch projects to check ownership
        const projQ = query(collection(db, 'research_projects'), where('userId', '==', userId));
        const projSnap = await getDocs(projQ);
        const myProjectIds = new Set(projSnap.docs.map(d => d.id));
        
        const mySavedReports = allSaved.docs
          .map(d => d.data())
          .filter(r => myProjectIds.has(r.projectId));
          
        return res.json(mySavedReports);
      }
      
      res.json(snap.docs.map(d => d.data()));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  

  app.delete('/api/research/history', async (req, res) => {
    try {
      const userId = getUserId(req);
      // Let anonymous users clear their own anonymous history too
      // if (userId === 'anonymous') return res.status(401).json({ error: 'Unauthorized' });
      
      const q = query(collection(db, 'research_projects'), where('userId', '==', userId));
      const snap = await getDocs(q);
      
      const collections = ['research_projects', 'research_sources', 'research_evidence', 'research_reports'];
      
      for (const d of snap.docs) {
        const pId = d.id;
        for (const c of collections) {
          if (c === 'research_projects') {
            await deleteDoc(doc(db, c, pId));
          } else {
            const subQ = query(collection(db, c), where('projectId', '==', pId));
            const subSnap = await getDocs(subQ);
            for (const subDoc of subSnap.docs) {
              await deleteDoc(doc(db, c, subDoc.id));
            }
          }
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

app.delete('/api/research/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      const pId = req.params.id;
      const d = await getDoc(doc(db, 'research_projects', pId));
      if (!d.exists() || (d.data().userId && d.data().userId !== userId)) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      const collections = ['research_projects', 'research_sources', 'research_evidence', 'research_reports'];
      for (const c of collections) {
        if (c === 'research_projects') {
          await deleteDoc(doc(db, c, pId));
        } else {
          const subQ = query(collection(db, c), where('projectId', '==', pId));
          const subSnap = await getDocs(subQ);
          for (const subDoc of subSnap.docs) {
            await deleteDoc(doc(db, c, subDoc.id));
          }
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  
  app.post('/api/research/:id/cancel', async (req, res) => {
    const controller = activeControllers.get(req.params.id);
    if (controller) controller.abort();
    try {
      const d = await getDoc(doc(db, 'research_projects', req.params.id));
      if (!d.exists()) return res.status(404).json({ error: 'Not found' });
      await updateDoc(doc(db, 'research_projects', req.params.id), { status: 'cancelled' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // --- API 404 Handler ---
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // --- Error Handler ---
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      res.status(500).json({ error: err.message || 'Server error' });
    } else {
      next(err);
    }
  });

  // --- API 404 Handler ---
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
