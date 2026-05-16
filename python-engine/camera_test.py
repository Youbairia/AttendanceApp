import json
import os
import sys
import time

import cv2

CAMERA_SOURCE = os.getenv("CAMERA_SOURCE") or os.getenv("CAMERA_INDEX", "0")

def get_camera_source():
    if str(CAMERA_SOURCE).isdigit():
        return int(CAMERA_SOURCE)
    return CAMERA_SOURCE

def main():
    print(json.dumps({"event": "CAMERA_TEST_START", "source": str(CAMERA_SOURCE)}), flush=True)
    cap = cv2.VideoCapture(get_camera_source())

    if not cap.isOpened():
        print(json.dumps({"success": False, "error": "Cannot open camera"}), flush=True)
        sys.exit(1)

    print(json.dumps({"event": "CAMERA_OPENED", "message": "A test camera window should be visible now. Press Q to close it."}), flush=True)

    started = time.time()
    frames = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            if time.time() - started > 10:
                print(json.dumps({"success": False, "error": "Camera opened, but no frames were received for 10 seconds."}), flush=True)
                cap.release()
                cv2.destroyAllWindows()
                sys.exit(1)
            continue

        frames += 1
        cv2.putText(frame, "Camera test - press Q to close", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.imshow("Camera Test", frame)
        cv2.setWindowProperty("Camera Test", cv2.WND_PROP_TOPMOST, 1)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(json.dumps({"success": True, "frames_read": frames}), flush=True)

if __name__ == "__main__":
    main()
