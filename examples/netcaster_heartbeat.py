"""
NetCaster heartbeat client example.

Add this to your NetCaster Python app so the admin dashboard can show
which users have the app running (Online) vs not (Offline).

Usage:
  1. Import and call start_heartbeat(license_key) when your app starts.
  2. It runs in a background thread and sends a heartbeat every 60 seconds.
  3. The admin dashboard considers a user "Online" if a heartbeat was received
     within the last 2 minutes.
"""

import json
import threading
import time
import urllib.request
import urllib.error

HEARTBEAT_URL = "https://us-central1-fiishy.cloudfunctions.net/reportHeartbeat"
HEARTBEAT_INTERVAL_SEC = 60
_stop_event = threading.Event()


def _send_heartbeat(license_key: str) -> bool:
    try:
        data = json.dumps({"licenseKey": license_key}).encode("utf-8")
        req = urllib.request.Request(
            HEARTBEAT_URL,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False


def _heartbeat_loop(license_key: str):
    while not _stop_event.is_set():
        _send_heartbeat(license_key)
        _stop_event.wait(HEARTBEAT_INTERVAL_SEC)


def start_heartbeat(license_key: str):
    """Start sending heartbeats in a background thread. Call once at app startup."""
    if not license_key or not str(license_key).strip().startswith("NC"):
        return
    thread = threading.Thread(target=_heartbeat_loop, args=(license_key.strip(),), daemon=True)
    thread.start()


def stop_heartbeat():
    """Stop the heartbeat thread. Call when your app shuts down."""
    _stop_event.set()


if __name__ == "__main__":
    # Test with a valid license key
    start_heartbeat("NC-TEST-XXXX")
    print("Heartbeat started. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        stop_heartbeat()
        print("Stopped.")
