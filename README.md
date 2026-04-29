# Image Upload Server

A scalable, stateless image upload server built with **Node.js**, **Express**, and **AWS S3** — load-balanced via **NGINX** round-robin. No database required: S3 URLs are deterministic and returned directly to the client.

---

## Architecture

```
                         ┌──────────────────┐
                         │     Client       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  NGINX (port 80) │
                         │  Load Balancer   │
                         └────────┬─────────┘
                                  │
                      ┌───────────┴───────────┐
                      ▼                       ▼
             ┌────────────────┐      ┌────────────────┐
             │  server-1      │      │  server-2      │
             │  :3001         │      │  :3002         │
             └────────┬───────┘      └────────┬───────┘
                      │                       │
                      └───────────┬───────────┘
                                  ▼
                         ┌──────────────────┐
                         │    AWS S3        │
                         │    Bucket        │
                         └──────────────────┘
```

NGINX distributes incoming requests across the two Node.js instances using **round-robin** load balancing. Each instance is stateless — it receives the image, uploads it to S3, and returns the URL. No shared state or session storage is needed.

---

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **NGINX** installed locally
- **AWS account** with:
  - An S3 bucket created
  - An IAM user with `s3:PutObject` permission on that bucket

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/image-upload-server.git
cd image-upload-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your real AWS credentials and bucket name.

### 4. Create and configure your S3 bucket

1. Create an S3 bucket in the AWS Console.
2. **Disable** "Block all public access" on the bucket.
3. Add a **bucket policy** to allow public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

Replace `your-bucket-name` with your actual bucket name.

---

## Running Two Instances

### Linux / macOS

Open two separate terminals:

```bash
# Terminal 1
PORT=3001 INSTANCE_ID=server-1 node server.js
```

```bash
# Terminal 2
PORT=3002 INSTANCE_ID=server-2 node server.js
```

### Windows PowerShell

Open two separate PowerShell windows:

```powershell
# Window 1
$env:PORT="3001"; $env:INSTANCE_ID="server-1"; node server.js
```

```powershell
# Window 2
$env:PORT="3002"; $env:INSTANCE_ID="server-2"; node server.js
```

---

## NGINX Setup

1. Copy `nginx.conf` to the appropriate location:
   - **Linux**: `/etc/nginx/nginx.conf`
   - **Windows**: The `conf` folder inside your NGINX installation directory

2. Restart NGINX:

```bash
# Linux
sudo nginx -s reload

# Windows
nginx -s reload
```

---

## Testing with curl

### Upload through NGINX (port 80)

```bash
curl -X POST http://localhost/upload -F "image=@/path/to/photo.jpg"
```

### Upload directly to an instance

```bash
curl -X POST http://localhost:3001/upload -F "image=@/path/to/photo.jpg"
```

### Health check

```bash
curl http://localhost/health
```

### PowerShell equivalent

```powershell
Invoke-RestMethod -Uri http://localhost/upload -Method Post -InFile "C:\path\to\photo.jpg" -ContentType "image/jpeg" -Headers @{ "Content-Type" = "multipart/form-data" }
```

Or using `curl.exe` in PowerShell:

```powershell
curl.exe -X POST http://localhost/upload -F "image=@C:\path\to\photo.jpg"
```

---

## Verifying Round-Robin

Run the health check or upload multiple times in succession:

```bash
curl http://localhost/health
curl http://localhost/health
curl http://localhost/health
curl http://localhost/health
```

Watch the server terminals — you'll see requests alternating between instances:

```
Server [server-1] running on port 3001
[server-1] Upload request - filename: a1b2c3d4.jpg - size: 102400 bytes

Server [server-2] running on port 3002
[server-2] Upload request - filename: e5f6a7b8.jpg - size: 204800 bytes
```

The `instanceId` field in the `/health` response will also alternate between `server-1` and `server-2`.

---

## Running Tests

```bash
npm test
```

The test suite covers:

| Test | What it verifies |
|------|-----------------|
| `GET /health` | Returns 200 with `status: "ok"` and an `instanceId` |
| `POST /upload` (no file) | Returns 400 with `"No image file provided"` |
| `POST /upload` (wrong type) | Returns 400 with `"Only JPG and PNG files are allowed"` |

> **Note:** Tests do NOT mock S3. A valid image upload test would fail at the S3 connection in CI — only validation logic is tested.

---

## GitHub Actions

The CI pipeline (`.github/workflows/ci.yml`) runs on every **push** and **pull request**:

1. **Checkout** — clones the repo
2. **Setup Node.js 20** — with npm cache
3. **Install dependencies** — `npm ci`
4. **Run tests** — `npm test` with dummy AWS env vars
5. **Verify import** — `node -e "require('./app.js')"` ensures the app loads without errors

All steps must pass for the pipeline to succeed.

---

## Sample Response

A successful upload returns:

```json
{
  "url": "https://your-bucket.s3.amazonaws.com/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

---

## Why No Database?

The S3 URL is deterministic and returned immediately to the client upon upload — there is no need to store metadata in a separate database. This keeps the architecture **stateless** and **horizontally scalable**: you can add or remove server instances behind NGINX without worrying about shared state or data synchronization.
