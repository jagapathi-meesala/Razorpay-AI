import uvicorn
import os
import sys

# Automatically set PYTHONPATH to parent directory so 'backend' imports resolve correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Set PYTHONPATH environment variable for uvicorn reloader subprocesses
os.environ["PYTHONPATH"] = parent_dir + os.pathsep + os.environ.get("PYTHONPATH", "")

if __name__ == '__main__':
    port = int(os.getenv("PORT", 8081))
    print(f"Starting RiskShield AI Backend on port {port}...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
