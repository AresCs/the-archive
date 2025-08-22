import json
from pathlib import Path

DATA_FILE = Path("people.json")

def load_people():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_people(people):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(people, f, indent=2)


import os

intel_path = os.path.join(os.path.dirname(__file__), "inteldata.json")

def save_intel(data):
    with open(intel_path, "w") as f:
        json.dump(data, f, indent=2)

def load_intel():
    with open(intel_path, "r") as f:
        return json.load(f)
