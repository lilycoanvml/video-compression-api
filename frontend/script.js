console.log("🚀 Video compression app ready!");

const uploader = document.getElementById("uploader");
const compressBtn = document.getElementById("compressBtn");
const downloadLink = document.getElementById("downloadLink");
const statusDiv = document.getElementById("status");

compressBtn.addEventListener("click", async () => {
  if (!uploader.files.length) {
    alert("Please select a video first.");
    return;
  }

  const file = uploader.files[0];

  // Show status
  statusDiv.textContent = "⏳ Uploading and compressing video...";
  statusDiv.style.display = "block";
  compressBtn.disabled = true;
  downloadLink.style.display = "none";

  // Create form data
  const formData = new FormData();
  formData.append("video", file);

  try {
    console.log("📤 Uploading video to server...");

    const response = await fetch("/compress", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      // Try to parse JSON error, fallback to text
      let errorMessage = "Compression failed";
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        const text = await response.text();
        errorMessage = text || `Server error: ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    console.log("✅ Compression complete! Downloading...");

    // Get the compressed video as a blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Setup download link
    downloadLink.href = url;
    downloadLink.download = "compressed.mp4";
    downloadLink.textContent = "⬇️ Download Compressed Video";
    downloadLink.style.display = "block";

    statusDiv.textContent = "✅ Compression complete!";

  } catch (error) {
    console.error("❌ Error:", error);
    statusDiv.textContent = `❌ Error: ${error.message}`;
    alert(`Compression failed: ${error.message}`);
  } finally {
    compressBtn.disabled = false;
  }
});


