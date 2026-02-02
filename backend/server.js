const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');

// Set FFmpeg binary path correctly
ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for video uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    // Accept video files only
    const allowedMimes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
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

  console.log(`Compressing video: ${req.file.originalname}`);
  console.log(`Input size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB`);

  ffmpeg(inputPath)
    .outputOptions([
      '-vcodec libx264',    // H.264 codec
      '-crf 28',            // Quality (18-28, lower = better quality)
      '-preset medium',     // Compression speed
      '-acodec aac',        // Audio codec
      '-b:a 128k',          // Audio bitrate
      '-movflags +faststart' // Enable streaming
    ])
    .output(outputPath)
    .on('start', (cmd) => {
      console.log('FFmpeg command:', cmd);
    })
    .on('progress', (progress) => {
      if (progress.percent) {
        console.log(`Processing: ${progress.percent.toFixed(1)}% done`);
      }
    })
    .on('end', () => {
      console.log('Compression finished!');

      // Get file sizes for comparison
      const inputSize = fs.statSync(inputPath).size;
      const outputSize = fs.statSync(outputPath).size;
      const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(1);

      console.log(`Original: ${(inputSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`Compressed: ${(outputSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`Compression: ${compressionRatio}% reduction`);

      // Send compressed file
      res.download(outputPath, 'compressed.mp4', (err) => {
        // Cleanup: delete both input and output files after download
        try {
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
          }
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (cleanupErr) {
          console.error('Cleanup error:', cleanupErr);
        }

        if (err) {
          console.error('Download error:', err);
        }
      });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);

      // Cleanup on error
      try {
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }

      res.status(500).json({
        error: 'Video compression failed',
        details: err.message
      });
    })
    .run();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ffmpegPath: ffmpegStatic });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${frontendPath}`);
  console.log(`FFmpeg binary: ${ffmpegStatic}`);
});
