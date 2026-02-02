const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve everything inside frontend (CSS, JS, index.html, etc.)
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Default route -> load index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${frontendPath}`);
});
