from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

MODEL_PATH = Path("models/youtube_model.joblib")
CURRENT_YEAR = 2023

NUM_COLS = [
    "video_views","uploads",
    "video_views_for_the_last_30_days","subscribers_for_last_30_days",
    "created_year","channel_age_years",
    "uploads_per_year","views_per_upload","views_last30_ratio",
    "monthly_earnings_mid","yearly_earnings_mid"
]
CAT_COLS = ["category","country","channel_type"]
ALL_COLS = NUM_COLS + CAT_COLS

REQUIRED_KEYS = [
    "video_views","uploads","video_views_for_the_last_30_days",
    "subscribers_for_last_30_days","created_year","category","country","channel_type"
]
OPTIONAL_KEYS = ["lowest_monthly_earnings","highest_monthly_earnings",
                 "lowest_yearly_earnings","highest_yearly_earnings"]

app = Flask(__name__)
CORS(app)

model = joblib.load(MODEL_PATH)

def to_float(x):
    try:
        if x is None or (isinstance(x, str) and x.strip() == ""):
            return None
        return float(x)
    except Exception:
        return None

def build_feature_row(payload: dict) -> pd.DataFrame:
    row = {c: None for c in ALL_COLS}

    row["video_views"] = to_float(payload.get("video_views"))
    row["uploads"] = to_float(payload.get("uploads"))
    row["video_views_for_the_last_30_days"] = to_float(payload.get("video_views_for_the_last_30_days"))
    row["subscribers_for_last_30_days"] = to_float(payload.get("subscribers_for_last_30_days"))
    row["created_year"] = to_float(payload.get("created_year"))

    row["category"] = (payload.get("category") or "").strip()
    row["country"] = (payload.get("country") or "").strip()
    row["channel_type"] = (payload.get("channel_type") or "").strip()

    year = row["created_year"]
    uploads = row["uploads"]
    views = row["video_views"]
    views30 = row["video_views_for_the_last_30_days"]

    channel_age = (CURRENT_YEAR - year) if (year is not None) else None
    if channel_age is not None and channel_age <= 0:
        channel_age = None
    row["channel_age_years"] = channel_age

    row["uploads_per_year"] = (uploads / channel_age) if (uploads not in (None, 0) and channel_age not in (None, 0)) else None
    row["views_per_upload"] = (views / uploads) if (views is not None and uploads not in (None, 0)) else None
    row["views_last30_ratio"] = (views30 / views) if (views30 is not None and views not in (None, 0)) else None

    lo_m = to_float(payload.get("lowest_monthly_earnings"))
    hi_m = to_float(payload.get("highest_monthly_earnings"))
    lo_y = to_float(payload.get("lowest_yearly_earnings"))
    hi_y = to_float(payload.get("highest_yearly_earnings"))

    row["monthly_earnings_mid"] = ((lo_m + hi_m) / 2.0) if (lo_m is not None and hi_m is not None) else None
    row["yearly_earnings_mid"]  = ((lo_y + hi_y) / 2.0) if (lo_y is not None and hi_y is not None) else None

    df = pd.DataFrame([row], columns=ALL_COLS)
    return df


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_PATH.name}, 200

@app.get("/schema")
def schema():
    return jsonify({
        "required": REQUIRED_KEYS,
        "optional": OPTIONAL_KEYS,
        "notes": {
            "created_year": f"int (<= {CURRENT_YEAR})",
            "category": "string",
            "country": "(US, India, JP, etc)",
            "channel_type": "string (Creator, Brand, Entertainment, etc)"
        }
    })

@app.post("/predict")
def predict():
    try:
        payload = request.get_json(force=True, silent=False) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400


    try:
        feats = build_feature_row(payload)
        pred = model.predict(feats)
        pred_val = max(0.0, float(pred[0]))
        return jsonify({
            "predicted_subscribers": int(round(pred_val)),
            "predicted_subscribers_raw": pred_val,
            "inputs_used": payload
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
