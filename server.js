/* Simple Node.js static file server for the Log Analysis project */
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Enable CORS (useful when testing from different origins)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files from the project root
const rootDir = path.join(__dirname);
app.use(express.static(rootDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// Default route: open the dashboard
app.get('/', (_req, res) => {
  res.redirect('/visualization/index.html');
});

app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
  console.log(`Dashboard: http://127.0.0.1:${PORT}/visualization/index.html`);
});
