# Production Checklist

Use this checklist before using the system for real attendance.

## Local System

- [ ] `npm run check` passes.
- [ ] `npm run camera-test` opens the camera.
- [ ] Employee registration works.
- [ ] Live watcher marks present attendance.
- [ ] Reports page shows records.
- [ ] CSV export works.

## Data

- [ ] Employees are stored in `employees`.
- [ ] Face embeddings are stored in `face_embeddings`.
- [ ] Attendance records are stored in `attendance_logs`.
- [ ] System events are stored in `app_events`.
- [ ] Database backup process is planned.

## Camera

- [ ] Built-in webcam works with `CAMERA_SOURCE=0`.
- [ ] External webcam works if using `CAMERA_SOURCE=1`.
- [ ] IP camera RTSP URL is tested if using WiFi camera.
- [ ] Camera has stable power and network.
- [ ] Camera angle and lighting are good.

## AWS

- [ ] API server is deployed.
- [ ] Dashboard is deployed.
- [ ] HTTPS is enabled.
- [ ] `EDGE_API_KEY` is configured.
- [ ] Database migration to PostgreSQL/RDS is planned for production scale.
- [ ] Camera worker is running near the camera, not inside AWS.

## Security

- [ ] Admin login is added before public deployment.
- [ ] API secrets are not committed to Git.
- [ ] `.env` is not uploaded publicly.
- [ ] Only trusted edge machines can send attendance events.

