# Face Attendance System

This project is a face recognition attendance system for a local computer.

It has three parts:

- **Python face engine**: opens your MacBook camera, registers faces, and watches for attendance.
- **Node.js API**: talks to the database and starts/stops the Python camera scripts.
- **React dashboard**: the web app you use in the browser.

The database file is:

```bash
attendance.db
```

The app is designed to run locally on your computer.

For AWS and WiFi/IP camera planning, read:

```text
AWS_DEPLOYMENT.md
PRODUCTION_CHECKLIST.md
```

## What You Need

Before using this software, make sure you have:

- A MacBook or computer with a camera
- Python installed
- Node.js installed
- Terminal app
- Camera permission allowed for Terminal or your code editor

If the camera does not open, macOS may be blocking camera access. Go to:

```text
System Settings > Privacy & Security > Camera
```

Then allow camera access for Terminal, VS Code, or the app you are using to run commands.

## Project Folders

```text
face-attendance/
  python-engine/   Face registration and recognition scripts
  api/             Backend API server
  dashboard/       Browser dashboard
  attendance.db    SQLite database
  .env             Settings like port and camera index
```

## Important Settings

The `.env` file controls basic settings:

```env
CAMERA_INDEX=0
ABSENT_MARK_TIME=14:00
PORT=3001
PYTHON_PATH=python-engine/venv/bin/python
```

Meaning:

- `CAMERA_INDEX=0` uses the default MacBook camera.
- `ABSENT_MARK_TIME=14:00` marks absent employees at 2:00 PM.
- `PORT=3001` runs the API on port 3001.
- `PYTHON_PATH=python-engine/venv/bin/python` uses the Python virtual environment.

Usually you do not need to change these.

## Easiest Way To Use

### Option A: Double Click, Easiest

In Finder, open this folder:

```text
/Users/sajjadali/Desktop/frs-dev/face-attendance
```

First time only, double-click:

```text
SETUP_ONCE.command
```

After setup, double-click:

```text
START_HERE.command
```

Then open this in your browser:

```text
http://127.0.0.1:5173/
```

To check if the system is okay, double-click:

```text
CHECK_SYSTEM.command
```

If macOS says the command file cannot be opened, use Option B below.

### Option B: Terminal Commands

You can run these commands from the main project folder:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance
```

First time only, install everything:

```bash
npm run setup
```

Start the full software:

```bash
npm run dev
```

Then open this in your browser:

```text
http://127.0.0.1:5173/
```

To check if everything is okay:

```bash
npm run check
```

To test only the camera:

```bash
npm run camera-test
```

If the camera test window opens, press `Q` to close it.

If you only want to start the API:

```bash
npm run api
```

If registration says `Failed to fetch`, start only the API:

```bash
npm run api
```

Or double-click:

```text
START_API_ONLY.command
```

Then check:

```text
http://localhost:3001/health
```

If you only want to start the dashboard:

```bash
npm run dashboard
```

## First Time Setup, Manual Way

Open Terminal and go to the project folder:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance
```

Install Python packages:

```bash
python-engine/venv/bin/python -m pip install -r python-engine/requirements.txt
```

Install API packages:

```bash
cd api
npm install
```

Install dashboard packages:

```bash
cd ../dashboard
npm install
```

Go back to the main project folder:

```bash
cd ..
```

## How To Start The Software

You need two Terminal windows.

### Terminal 1: Start The API

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance/api
npx ts-node src/index.ts
```

If it works, you should see:

```text
API listening on http://localhost:3001
```

Keep this Terminal open.

### Terminal 2: Start The Dashboard

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance/dashboard
npm run dev -- --host 127.0.0.1
```

If it works, you should see a local URL like:

```text
http://127.0.0.1:5173/
```

Open that URL in your browser.

## How To Use The Dashboard

### 1. Register An Employee

Open:

```text
http://127.0.0.1:5173/register
```

Fill in:

- Name
- Role
- Department

Click:

```text
Start Registration
```

A camera window will open.

Look at the camera and press:

```text
SPACE
```

You need to capture 5 clear face photos.

Tips:

- Only one face should be visible.
- Use good lighting.
- Look straight at the camera.
- Do not move too much while capturing.

After 5 captures, the employee is saved into the database.

### 2. Make Your Attendance

Open:

```text
http://127.0.0.1:5173/mark-attendance
```

Click:

```text
Start Camera
```

The camera watcher will start.

When a registered employee appears in front of the camera, they must blink once within 6 seconds.

This blink check helps stop fake attendance using a printed photo or phone photo.

After the blink is detected, the system marks them as:

```text
PRESENT
```

After a face is detected, open Today's Attendance to see the record.

To stop the camera watcher, click:

```text
Stop Camera
```

### 3. View Today's Attendance

Open:

```text
http://127.0.0.1:5173/today
```

This page shows who is marked `PRESENT` or `ABSENT` today.

### 4. View Past Reports

Open:

```text
http://127.0.0.1:5173/reports
```

Choose:

- From date
- To date

Click:

```text
Search
```

You can see attendance records and present/absent counts.

To download a CSV file, click:

```text
CSV
```

## How To Check Everything Is Working

### Check API Health

Open this in your browser:

```text
http://localhost:3001/health
```

You should see:

```json
{"ok":true}
```

### Check Today's Attendance

Open:

```text
http://localhost:3001/api/attendance/today
```

At first, it may show:

```json
[]
```

That is normal if no attendance has been marked yet.

### Check Employees

Open:

```text
http://localhost:3001/api/employees
```

After registration, you should see employee records here.

### Check Database Exists

The database file should be here:

```text
/Users/sajjadali/Desktop/frs-dev/face-attendance/attendance.db
```

## Useful Test Commands

From the project folder:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance
```

Check Python database setup:

```bash
python-engine/venv/bin/python python-engine/db.py
```

Check API TypeScript:

```bash
cd api
npm run build
```

Check dashboard build:

```bash
cd ../dashboard
npm run build
```

If both builds pass, the code is okay.

## Common Problems

### Registration Failed: Failed To Fetch

This means the dashboard is open, but the API server is not running.

Fix it from the main folder:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/
```

Check the API in your browser:

```text
http://localhost:3001/health
```

You should see:

```json
{"ok":true}
```

### Camera Does Not Open

First run this from the main folder:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance
npm run camera-test
```

If you see this error:

```text
OpenCV: camera access has been denied
```

Then macOS is blocking camera access.

Try these:

1. Open `System Settings`.
2. Go to `Privacy & Security`.
3. Open `Camera`.
4. Turn on camera permission for the app you use to run this project.
5. If you run commands in normal Terminal, allow `Terminal`.
6. If you run commands inside VS Code, allow `Visual Studio Code` or `Code`.
7. Close the old Terminal/VS Code window.
8. Open it again and run:

```bash
npm run camera-test
```

If macOS still does not ask for camera permission, reset the camera permission prompt:

```bash
tccutil reset Camera
```

Then run again:

```bash
npm run camera-test
```

Other things to try:

2. Close Zoom, FaceTime, Google Meet, or any app using the camera.
3. Restart the API.
4. Change `CAMERA_INDEX=0` to `CAMERA_INDEX=1` in `.env` if you use an external camera.

### API Does Not Start

Make sure you are in the correct folder:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance/api
```

Then run:

```bash
npx ts-node src/index.ts
```

If port 3001 is already used, stop the old server or change this in `.env`:

```env
PORT=3002
```

### Dashboard Does Not Open

Make sure the dashboard server is running:

```bash
cd /Users/sajjadali/Desktop/frs-dev/face-attendance/dashboard
npm run dev -- --host 127.0.0.1
```

Then open the URL shown in Terminal.

### Registration Is Not Saving

Check:

- The API is running.
- The camera window opened.
- You captured 5 photos.
- Only one face was visible.
- The Terminal did not show an error.

### Attendance Is Not Marking

Check:

- Employee was registered first.
- Camera is started from `/mark-attendance`.
- The person blinked once within 6 seconds after their face was detected.
- The camera can clearly see the face.
- Lighting is good.
- The person is close enough to the camera.

## Daily Usage

Normal daily steps:

1. Start the API.
2. Start the dashboard.
3. Register new employees if needed.
4. Open the Make Your Attendance page.
5. Click Start Camera.
6. Let employees look at the camera.
7. Check Today's Attendance.
8. Check Past Reports later.

At 2:00 PM, the system automatically marks employees as `ABSENT` if they have no attendance log for today.

## Stop The Software

In each Terminal window, press:

```text
Control + C
```

This stops the API or dashboard server.

On the Make Your Attendance page, click `Stop Camera` before closing if the watcher is running.
