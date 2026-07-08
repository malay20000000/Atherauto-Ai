import os
import time

def log_agent_thought(run_id: str, agent_name: str, message: str, delay: float = 0.3):
    """Writes a thought to the agent log file and optionally sleeps to simulate processing time."""
    if run_id == "default":
        print(f"[{agent_name}] {message}")
        return
        
    log_path = f"./tmp/{run_id}/agent_sysout.log"
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"> {agent_name.upper()}: {message}\n")
        
    if delay > 0:
        time.sleep(delay)
