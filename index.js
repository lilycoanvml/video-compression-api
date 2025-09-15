const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure folders exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('compressed')) fs.mkdirSync('compressed');

// Multer setup for uploads
const upload = multer({ dest: 'uploads/' });

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Compress video at a specific bitrate
function compressVideo(inputPath, outputPath, bitrate) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-b:v ${bitrate}k`,
        `-maxrate ${bitrate}k`,
        `-bufsize ${bitrate * 2}k`,
        '-c:a aac',
        '-vf scale=640:-1', // optional resize
        '-movflags +faststart'
      ])
      .save(outputPath)
      .on('end', resolve)
      .on('error', reject);
  });
}

// Compress to target size
async function compressToTargetSize(inputPath, outputPath, targetMB = 1.5) {
  let bitrate = 1500; // starting kbps
  const minBitrate = 200;

  while (true) {
    await compressVideo(inputPath, outputPath, bitrate);
    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB <= targetMB || bitrate <= minBitrate) break;

    bitrate -= 100; // lower bitrate and try again
  }

  return bitrate;
}

// API endpoint
app.post('/compress', upload.single('video'), async (req, res) => {
  const inputPath = req.file.path;
  const outputPath = path.join('compressed', `${Date.now()}.mp4`);

  try {
    const finalBitrate = await compressToTargetSize(inputPath, outputPath, 1.5);
    console.log(`Compressed to ${finalBitrate} kbps`);

    fs.unlinkSync(inputPath); // delete original

    res.download(outputPath, 'compressed.mp4', () => {
      fs.unlinkSync(outputPath); // cleanup after download
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Compression failed.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

