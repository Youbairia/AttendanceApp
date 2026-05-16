import face_recognition
import cv2
import numpy as np
import sys
import json
import os
import time
from db import init_db, save_employee, save_embedding

CAMERA_SOURCE = os.getenv("CAMERA_SOURCE") or os.getenv("CAMERA_INDEX", "0")

def get_camera_source():
    if str(CAMERA_SOURCE).isdigit():
        return int(CAMERA_SOURCE)
    return CAMERA_SOURCE

def register_face(name, role='', department=''):
    init_db()
    print(json.dumps({"event": "REGISTER_STARTED", "name": name}), flush=True)
    print(json.dumps({"event": "REGISTER_INSTRUCTIONS", "message": "Look at the camera. Press SPACE to capture, Q to quit."}), flush=True)
    print(json.dumps({"event": "CAMERA_OPENING", "source": str(CAMERA_SOURCE)}), flush=True)

    cap = cv2.VideoCapture("http://10.38.0.42:8080/video")
    if not cap.isOpened():
        print(json.dumps({"success": False, "error": "Cannot open camera"}), flush=True)
        sys.exit(1)

    print(json.dumps({"event": "CAMERA_OPENED", "message": "Camera opened. If no window is visible, check behind other windows or macOS camera permissions."}), flush=True)

    captures = []
    required = 5
    last_frame_at = time.time()
    last_status_at = 0.0

    while len(captures) < required:
        ret, frame = cap.read()
        if not ret:
            if time.time() - last_frame_at > 10:
                print(json.dumps({"success": False, "error": "Camera opened, but no frames were received for 10 seconds."}), flush=True)
                cap.release()
                cv2.destroyAllWindows()
                sys.exit(1)
            continue

        last_frame_at = time.time()
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        locations = face_recognition.face_locations(rgb)

        if time.time() - last_status_at > 3:
            print(json.dumps({"event": "REGISTER_STATUS", "faces_detected": len(locations), "captures": len(captures), "required": required}), flush=True)
            last_status_at = time.time()

        display = frame.copy()
        for (top, right, bottom, left) in locations:
            cv2.rectangle(display, (left, top), (right, bottom), (0, 255, 0), 2)

        cv2.putText(display, f"Captures: {len(captures)}/{required} - SPACE to capture",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow('Register Face', display)
        cv2.setWindowProperty('Register Face', cv2.WND_PROP_TOPMOST, 1)

        key = cv2.waitKey(1) & 0xFF
        if key == ord(' ') and len(locations) == 1:
            encodings = face_recognition.face_encodings(rgb, locations)
            if encodings:
                captures.append(encodings[0])
                print(json.dumps({"event": "REGISTER_CAPTURED", "count": len(captures), "required": required}), flush=True)
        elif key == ord(' ') and len(locations) != 1:
            print(json.dumps({"event": "REGISTER_WAITING", "message": "Exactly one face must be visible."}), flush=True)
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    if len(captures) < required:
        print(json.dumps({"success": False, "error": "Not enough captures"}), flush=True)
        sys.exit(1)

    avg_embedding = np.mean(captures, axis=0)
    employee_id = save_employee(name, role, department)
    save_embedding(employee_id, avg_embedding)

    result = {"success": True, "employee_id": employee_id, "name": name}
    print(json.dumps(result), flush=True)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python register.py <name> [role] [department]"}), flush=True)
        sys.exit(1)
    name = sys.argv[1]
    role = sys.argv[2] if len(sys.argv) > 2 else ''
    department = sys.argv[3] if len(sys.argv) > 3 else ''
    register_face(name, role, department)
