# AWS Deployment Plan

This project now supports a clean path from local laptop testing to an online attendance system.

## Recommended Production Architecture

Do not run the camera directly inside AWS.

Use this setup:

```text
WiFi/IP Camera
   |
Local Edge Machine
   - Python face watcher
   - Reads RTSP/HTTP camera stream
   - Recognizes faces
   - Sends attendance event to AWS API
   |
AWS
   - API server
   - Dashboard
   - Production database
```

Why this is best:

- Cameras usually live inside a school/office local network.
- AWS usually cannot directly access private camera IPs.
- Video streaming to AWS is expensive and slower.
- Face recognition near the camera is faster and more reliable.
- AWS only stores final attendance events, employees, reports, and dashboard data.

## Current Local Mode

Right now your local laptop runs everything:

```text
Dashboard: http://127.0.0.1:5173/
API:       http://localhost:3001
Database:  attendance.db
Camera:    MacBook webcam
```

Start it:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance
npm run dev
```

## Camera Source Upgrade

The camera source is controlled in `.env`:

```env
CAMERA_SOURCE=0
```

For built-in webcam:

```env
CAMERA_SOURCE=0
```

For USB webcam:

```env
CAMERA_SOURCE=1
```

For WiFi/IP camera:

```env
CAMERA_SOURCE=rtsp://username:password@192.168.1.50:554/stream1
```

The exact RTSP URL depends on the camera brand.

Common examples:

```text
rtsp://username:password@CAMERA_IP:554/stream1
rtsp://username:password@CAMERA_IP:554/h264Preview_01_main
rtsp://username:password@CAMERA_IP:554/cam/realmonitor?channel=1&subtype=0
```

Test the camera:

```bash
npm run camera-test
```

## AWS Services To Use

Good first production setup:

- **EC2** for the Node.js API
- **S3 + CloudFront** for the dashboard
- **RDS PostgreSQL** for production database
- **AWS Secrets Manager** or EC2 environment variables for secrets
- **HTTPS** using an Application Load Balancer or CloudFront certificate

Current code uses SQLite because that was your requested stack. For real production with many users/cameras, migrate from SQLite to PostgreSQL.

## Edge Attendance API

For AWS mode, the local camera worker can send attendance to the cloud API:

```http
POST /api/attendance/mark
```

JSON body:

```json
{
  "employee_id": 1,
  "confidence": 92.5,
  "detected_at": "2026-05-16T09:30:00.000Z"
}
```

If `EDGE_API_KEY` is set in the API environment, send it as a header:

```text
x-edge-api-key: your-secret-key
```

Example:

```bash
curl -X POST https://your-api-domain.com/api/attendance/mark \
  -H "Content-Type: application/json" \
  -H "x-edge-api-key: your-secret-key" \
  -d '{"employee_id":1,"confidence":92.5}'
```

## Production Environment Variables

Use `.env.example` as the template:

```env
CAMERA_SOURCE=0
ABSENT_MARK_TIME=14:00
APP_TIMEZONE=Asia/Kolkata
PORT=3001
PYTHON_PATH=python-engine/venv/bin/python
DB_PATH=attendance.db
EDGE_API_KEY=change-me-before-production
```

For AWS API server:

```env
PORT=3001
APP_TIMEZONE=Asia/Kolkata
EDGE_API_KEY=use-a-long-random-secret
```

## Before Going Live

Do these before real production:

1. Add user login for admin dashboard.
2. Move database from SQLite to PostgreSQL/RDS.
3. Put API behind HTTPS.
4. Protect edge event endpoint with `EDGE_API_KEY`.
5. Keep the camera watcher on a local machine near the camera.
6. Back up the database daily.
7. Add employee edit/delete controls if needed.
8. Add camera location support if using multiple cameras.

## Scaling Roadmap

Small office or classroom:

```text
1 camera + 1 local edge machine + AWS API/dashboard
```

Multiple rooms:

```text
Many cameras + one edge machine per location + same AWS API
```

Large deployment:

```text
PostgreSQL/RDS
Redis queue
Multiple API servers
Camera/event workers
Admin login and roles
Central monitoring
```

