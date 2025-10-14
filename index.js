const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');

console.log('Starting server...');
console.log('FFmpeg binary path:', ffmpegStatic);

// Set FFmpeg binary path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Catch any unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

const app = express();
const PORT = process.env.PORT || 3001;
```

**2. Create Procfile:**
Create a file named `Procfile` (no extension) with this content:
```
web: node index.js

// Configure multer for video uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Use absolute path
const frontendPath = path.resolve(__dirname, 'frontend');

// Serve static files
app.use(express.static(frontendPath));

// Explicit route for root
app.get('/', (req, res) => {
  res.sendFile(path.resolve(frontendPath, 'index.html'));
});

// Video compression endpoint
app.post('/compress', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = `uploads/compressed-${Date.now()}.mp4`;

  console.log(`Compressing video: ${req.file.originalname}`);

  ffmpeg(inputPath)
    .outputOptions([
      '-vcodec libx264',    // H.264 codec
      '-crf 28',            // Quality (18-28, lower = better quality)
      '-preset medium',     // Compression speed
      '-acodec aac',        // Audio codec
      '-b:a 128k'           // Audio bitrate
    ])
    .output(outputPath)
    .on('start', (cmd) => {
      console.log('FFmpeg command:', cmd);
    })
    .on('progress', (progress) => {
      console.log(`Processing: ${progress.percent?.toFixed(1) || 0}% done`);
    })
    .on('end', () => {
      console.log('Compression finished!');

      // Send compressed file
      res.download(outputPath, 'compressed.mp4', (err) => {
        // Cleanup: delete both input and output files after download
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        if (err) {
          console.error('Download error:', err);
        }
      });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);

      // Cleanup on error
      fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      res.status(500).json({ error: 'Video compression failed', details: err.message });
    })
    .run();
});

const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}/ in your browser`);
  console.log('Server is now listening and should stay running...');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep the process alive
console.log('Server process started with PID:', process.pid);






