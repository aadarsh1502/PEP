require("dotenv").config();

const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { uploadToS3 } = require("./s3");

const app = express();

// ---------- Multer Configuration ----------

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Only JPG and PNG files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// ---------- Routes ----------

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    instanceId: process.env.INSTANCE_ID || "default",
    timestamp: new Date().toISOString(),
  });
});

// Image upload
app.post("/upload", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds 2MB limit" });
        }
        if (err.message === "Only JPG and PNG files are allowed") {
          return res.status(400).json({ error: "Only JPG and PNG files are allowed" });
        }
        return res.status(500).json({ error: "Upload failed", details: err.message });
      }

      // No file provided
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Build unique filename
      const ext = req.file.mimetype === "image/jpeg" ? "jpg" : "png";
      const filename = `${uuidv4()}.${ext}`;

      const instanceId = process.env.INSTANCE_ID || "default";
      console.log(
        `[${instanceId}] Upload request - filename: ${filename} - size: ${req.file.size} bytes`
      );

      // Upload to S3
      await uploadToS3(req.file.buffer, filename, req.file.mimetype);

      const bucketName = process.env.AWS_BUCKET_NAME;
      const url = `https://${bucketName}.s3.amazonaws.com/${filename}`;

      return res.status(200).json({ url });
    } catch (uploadErr) {
      return res
        .status(500)
        .json({ error: "Upload failed", details: uploadErr.message });
    }
  });
});

module.exports = app;
