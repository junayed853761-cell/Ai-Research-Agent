import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const oldViteMiddleware = `  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {`;

const newViteMiddleware = `  // --- API 404 Handler ---
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {`;

content = content.replace(oldViteMiddleware, newViteMiddleware);
fs.writeFileSync('server.ts', content);
console.log('patched 404');
