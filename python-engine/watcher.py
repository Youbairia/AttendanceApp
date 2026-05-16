import face_recognition
import cv2
import numpy as np
import json
import sys
import time
import os
from datetime import datetime
from db import init_db, get_all_embeddings, already_marked_today, mark_attendance

TOLERANCE = 0.5
FRAME_SKIP = 3
COOLDOWN_SECONDS = 5
LIVENESS_TIMEOUT_SECONDS = 6
EAR_CLOSED_THRESHOLD = 0.21
EAR_OPEN_THRESHOLD = 0.25
BLINK_CLOSED_FRAMES = 2
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE") or os.getenv("CAMERA_INDEX", "0")

def get_camera_source():
    if str(CAMERA_SOURCE).isdigit():
        return int(CAMERA_SOURCE)
    return CAMERA_SOURCE

def euclidean_distance(point_a, point_b):
    return np.linalg.norm(np.array(point_a) - np.array(point_b))

def eye_aspect_ratio(eye_points):
    # EAR = (vertical eye distances) / (horizontal eye distance).
    # We use the 6-point eye landmarks from dlib's 68-point facial landmark model.
    if len(eye_points) != 6:
        return None

    vertical_1 = euclidean_distance(eye_points[1], eye_points[5])
    vertical_2 = euclidean_distance(eye_points[2], eye_points[4])
    horizontal = euclidean_distance(eye_points[0], eye_points[3])

    if horizontal == 0:
        return None

    return (vertical_1 + vertical_2) / (2.0 * horizontal)

def get_average_ear(face_landmarks):
    left_eye = face_landmarks.get("left_eye")
    right_eye = face_landmarks.get("right_eye")

    if not left_eye or not right_eye:
        return None

    left_ear = eye_aspect_ratio(left_eye)
    right_ear = eye_aspect_ratio(right_eye)

    if left_ear is None or right_ear is None:
        return None

    return (left_ear + right_ear) / 2.0

def update_liveness_session(session, ear):
    if ear is None:
        return False

    if ear >= EAR_OPEN_THRESHOLD:
        session["eyes_were_open"] = True
        session["closed_frames"] = 0
        return False

    if ear < EAR_CLOSED_THRESHOLD and session["eyes_were_open"]:
        session["closed_frames"] += 1
    else:
        session["closed_frames"] = 0

    if session["closed_frames"] >= BLINK_CLOSED_FRAMES:
        session["blink_detected"] = True
        return True

    return False

def new_liveness_session(now):
    return {
        "started_at": now,
        "last_prompt_at": 0.0,
        "eyes_were_open": False,
        "closed_frames": 0,
        "blink_detected": False,
    }

def run_watcher():
    init_db()
    print("[Watcher] Starting...", flush=True)

    print(json.dumps({"event": "CAMERA_OPENING", "source": str(CAMERA_SOURCE)}), flush=True)
    cap = cv2.VideoCapture("http://10.38.0.42:8080/video")
    if not cap.isOpened():
        print(json.dumps({"error": "Cannot open camera"}), flush=True)
        sys.exit(1)

    last_seen = {}
    liveness_sessions = {}
    frame_count = 0

    print("[Watcher] Ready. Watching for faces...", flush=True)

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue

        frame_count += 1
        if frame_count % FRAME_SKIP != 0:
            continue

        small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

        locations = face_recognition.face_locations(rgb)
        if not locations:
            continue

        encodings = face_recognition.face_encodings(rgb, locations)
        landmarks = face_recognition.face_landmarks(rgb, locations, model="large")
        known = get_all_embeddings()

        if not known:
            continue

        known_encodings = [e['embedding'] for e in known]
        known_ids = [e['id'] for e in known]
        known_names = [e['name'] for e in known]

        for encoding, face_landmarks in zip(encodings, landmarks):
            distances = face_recognition.face_distance(known_encodings, encoding)
            best_idx = int(np.argmin(distances))
            best_distance = float(distances[best_idx])

            if best_distance > TOLERANCE:
                continue

            employee_id = known_ids[best_idx]
            name = known_names[best_idx]
            confidence = round((1 - best_distance) * 100, 2)
            now = time.time()

            if already_marked_today(employee_id):
                if employee_id in last_seen and now - last_seen[employee_id] < COOLDOWN_SECONDS:
                    continue
                last_seen[employee_id] = now
                event = {
                    "event": "ALREADY_MARKED",
                    "employee_id": employee_id,
                    "name": name,
                    "status": "PRESENT",
                    "confidence": confidence,
                    "timestamp": datetime.now().isoformat(timespec='seconds')
                }
                print(json.dumps(event), flush=True)
                continue

            session = liveness_sessions.get(employee_id)
            if session is None:
                session = new_liveness_session(now)
                liveness_sessions[employee_id] = session
                print(json.dumps({
                    "event": "LIVENESS_STARTED",
                    "employee_id": employee_id,
                    "name": name,
                    "message": "Blink once within 6 seconds to mark attendance.",
                    "timeout_seconds": LIVENESS_TIMEOUT_SECONDS,
                    "timestamp": datetime.now().isoformat(timespec='seconds')
                }), flush=True)

            if now - session["started_at"] > LIVENESS_TIMEOUT_SECONDS:
                print(json.dumps({
                    "event": "LIVENESS_TIMEOUT",
                    "employee_id": employee_id,
                    "name": name,
                    "message": "No blink detected within 6 seconds. Attendance not marked.",
                    "timestamp": datetime.now().isoformat(timespec='seconds')
                }), flush=True)
                liveness_sessions[employee_id] = new_liveness_session(now)
                continue

            ear = get_average_ear(face_landmarks)
            blink_detected = update_liveness_session(session, ear)

            if not blink_detected:
                if now - session["last_prompt_at"] >= 2:
                    session["last_prompt_at"] = now
                    print(json.dumps({
                        "event": "LIVENESS_WAITING",
                        "employee_id": employee_id,
                        "name": name,
                        "message": "Blink once to confirm this is a live person.",
                        "ear": round(ear, 3) if ear is not None else None,
                        "seconds_left": max(0, round(LIVENESS_TIMEOUT_SECONDS - (now - session["started_at"]), 1)),
                        "timestamp": datetime.now().isoformat(timespec='seconds')
                    }), flush=True)
                continue

            print(json.dumps({
                "event": "BLINK_DETECTED",
                "employee_id": employee_id,
                "name": name,
                "ear": round(ear, 3) if ear is not None else None,
                "timestamp": datetime.now().isoformat(timespec='seconds')
            }), flush=True)

            if employee_id in last_seen and now - last_seen[employee_id] < COOLDOWN_SECONDS:
                continue

            last_seen[employee_id] = now
            liveness_sessions.pop(employee_id, None)

            if not already_marked_today(employee_id):
                detected_at = mark_attendance(employee_id, confidence)
                event = {
                    "event": "ATTENDANCE_MARKED",
                    "employee_id": employee_id,
                    "name": name,
                    "status": "PRESENT",
                    "confidence": confidence,
                    "detected_at": detected_at,
                    "liveness": "BLINK_CONFIRMED",
                    "timestamp": datetime.now().isoformat(timespec='seconds')
                }
            else:
                event = {
                    "event": "ALREADY_MARKED",
                    "employee_id": employee_id,
                    "name": name,
                    "status": "PRESENT",
                    "confidence": confidence,
                    "timestamp": datetime.now().isoformat(timespec='seconds')
                }

            print(json.dumps(event), flush=True)

    cap.release()

if __name__ == '__main__':
    run_watcher()
