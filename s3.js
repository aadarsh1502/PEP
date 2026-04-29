const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

/**
 * Uploads a file buffer to AWS S3.
 * @param {Buffer} buffer - The file buffer to upload.
 * @param {string} filename - The S3 object key (filename).
 * @param {string} mimetype - The MIME type of the file.
 * @returns {Promise<string>} The filename (S3 key) on success.
 */
async function uploadToS3(buffer, filename, mimetype) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);
  return filename;
}

module.exports = { uploadToS3 };
