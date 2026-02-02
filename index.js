const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Use absolute path
const frontendPath = path.resolve(__dirname, 'frontend');

// Serve static files
app.use(express.static(frontendPath));

// Explicit route for root
app.get('/', (req, res) => {
  res.sendFile(path.resolve(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}/ in your browser`);
});






