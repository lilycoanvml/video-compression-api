const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');

// Set FFmpeg binary path
ffmpeg.setFfmpegPath('ffmpeg');

const app = express();
const PORT = 3001;

// Configure multer for video uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve everything inside frontend (CSS, JS, index.html, etc.)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Default route -> load index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Video compression endpoint
app.post('/compress', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = `uploads/compressed-${Date.now()}.mp4`;

  console.log(`📹 Compressing video: ${req.file.originalname}`);
  console.log(`📁 Input path: ${inputPath}`);
  console.log(`📁 Output path: ${outputPath}`);
  console.log(`📊 File size: ${req.file.size} bytes`);

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
      console.log('🔧 FFmpeg command started');
    })
    .on('progress', (progress) => {
      console.log(`⏳ Processing: ${progress.percent?.toFixed(1) || 0}% done`);
    })
    .on('end', () => {
      console.log('✅ Compression finished!');

      // Send compressed file
      res.download(outputPath, 'compressed.mp4', (err) => {
        // Cleanup: delete both input and output files after download
        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          console.log('🗑️ Cleanup completed');
        } catch (cleanupErr) {
          console.error('Cleanup error:', cleanupErr);
        }

        if (err) {
          console.error('❌ Download error:', err);
        }
      });
    })
    .on('error', (err) => {
      console.error('❌ FFmpeg ERROR:');
      console.error('Message:', err.message);
      console.error('Code:', err.code);
      console.error('Full error:', err);

      // Cleanup on error
      try {
        fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }

      res.status(500).json({ 
        error: 'Video compression failed', 
        details: err.message,
        code: err.code 
      });
    })
    .run();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📂 Serving frontend from: ${frontendPath}`);
  console.log(`🎬 FFmpeg path: ${ffmpegStatic}`);
});

