from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os
from pathlib import Path
from datetime import datetime

MODEL_PATH = Path("models/youtube_model.joblib")
DATA_CLEAN = Path("data/processed/youtube_clean.csv")
CURRENT_YEAR = datetime.now().year

NUM_COLS = [
    "video_views","uploads",
    "video_views_for_the_last_30_days","subscribers_for_last_30_days",
    "created_year","channel_age_years",
    "uploads_per_year","views_per_upload","views_last30_ratio",
    "monthly_earnings_mid","yearly_earnings_mid"
]
CAT_COLS = ["category","country","channel_type"]
ALL_COLS = NUM_COLS + CAT_COLS

REQUIRED_KEYS_NUM = [
    "video_views","uploads","video_views_for_the_last_30_days",
    "subscribers_for_last_30_days","created_year"
]
REQUIRED_KEYS_STR = ["category","country","channel_type"]
OPTIONAL_KEYS = [
    "lowest_monthly_earnings","highest_monthly_earnings",
    "lowest_yearly_earnings","highest_yearly_earnings"
]

app = Flask(__name__)
CORS(app)

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found at {MODEL_PATH.resolve()}")
model = joblib.load(MODEL_PATH)

stats_df = None
try:
    if DATA_CLEAN.exists():
        stats_df = pd.read_csv(DATA_CLEAN)
except Exception:
    stats_df = None

if stats_df is not None and "subscribers" in stats_df.columns:
    SUB_P995 = float(np.nanpercentile(stats_df["subscribers"], 99.5))
else:
    SUB_P995 = 3e8

if stats_df is not None and {"subscribers","video_views"}.issubset(stats_df.columns):
    sv = stats_df.loc[stats_df["video_views"] > 0, ["subscribers","video_views"]].copy()
    sv["ratio"] = sv["subscribers"] / sv["video_views"]
    SV_RATIO_P95 = float(np.nanpercentile(sv["ratio"].replace([np.inf,-np.inf], np.nan).dropna(), 95)) if len(sv) else 1.0
else:
    SV_RATIO_P95 = 0.1

if stats_df is not None and {"subscribers","uploads"}.issubset(stats_df.columns):
    su = stats_df.loc[stats_df["uploads"] > 0, ["subscribers","uploads"]].copy()
    su["ratio"] = su["subscribers"] / su["uploads"]
    SU_RATIO_P95 = float(np.nanpercentile(su["ratio"].replace([np.inf,-np.inf], np.nan).dropna(), 95)) if len(su) else 1e6
else:
    SU_RATIO_P95 = 1e6

if not np.isfinite(SV_RATIO_P95) or SV_RATIO_P95 <= 0:
    SV_RATIO_P95 = 0.1
if not np.isfinite(SU_RATIO_P95) or SU_RATIO_P95 <= 0:
    SU_RATIO_P95 = 1e6

def to_float(x):
    try:
        if x is None or (isinstance(x, str) and x.strip() == ""):
            return None
        return float(x)
    except Exception:
        return None

def validate_payload(payload: dict):
    missing = []
    bad_types = []

    for k in REQUIRED_KEYS_NUM:
        v = payload.get(k, None)
        fv = to_float(v)
        if fv is None:
            missing.append(k)
        else:
            payload[k] = fv

    for k in REQUIRED_KEYS_STR:
        v = payload.get(k, None)
        if v is None or str(v).strip() == "":
            missing.append(k)
        else:
            payload[k] = str(v).strip()

    cy = payload.get("created_year")
    if isinstance(cy, (int, float)) and (cy > CURRENT_YEAR or cy < 2005):
        bad_types.append("created_year out of range")

    return missing, bad_types, payload

def build_feature_row(payload: dict) -> pd.DataFrame:
    row = {c: None for c in ALL_COLS}

    row["video_views"] = payload["video_views"]
    row["uploads"] = payload["uploads"]
    row["video_views_for_the_last_30_days"] = payload["video_views_for_the_last_30_days"]
    row["subscribers_for_last_30_days"] = payload["subscribers_for_last_30_days"]
    row["created_year"] = payload["created_year"]

    row["category"] = payload["category"]
    row["country"] = payload["country"]
    row["channel_type"] = payload["channel_type"]

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

    return pd.DataFrame([row], columns=ALL_COLS)

def clamp_prediction(raw_pred: float, feats: pd.DataFrame, payload: dict):
    caps = [SUB_P995]
    note_parts = []

    views = feats.loc[0, "video_views"]
    uploads = feats.loc[0, "uploads"]

    if views is not None and np.isfinite(views) and views > 0:
        caps.append(SV_RATIO_P95 * views)
        note_parts.append(f"cap_sv=ratio95({SV_RATIO_P95:.3g})*views")

    if uploads is not None and np.isfinite(uploads) and uploads > 0:
        caps.append(SU_RATIO_P95 * uploads)
        note_parts.append(f"cap_su=ratio95({SU_RATIO_P95:.3g})*uploads")

    upper = min(caps) if caps else SUB_P995
    lower = 0.0

    clamped = raw_pred
    reason = None
    if raw_pred < lower:
        clamped = lower
        reason = "lower_bound=0"
    elif raw_pred > upper:
        clamped = upper
        reason = "upper_bound=" + " & ".join(note_parts) if note_parts else "upper_bound=P99.5"

    subs_last30 = payload.get("subscribers_for_last_30_days", 0)
    if subs_last30 is not None and clamped < subs_last30:
        clamped = subs_last30
        reason = "floor=subscribers_for_last_30_days"

    return float(clamped), reason

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": MODEL_PATH.name,
        "clamp_params": {
            "subs_p99_5": SUB_P995,
            "subs_per_view_p95": SV_RATIO_P95,
            "subs_per_upload_p95": SU_RATIO_P95,
        },
    }, 200

@app.post("/predict")
def predict():
    try:
        payload = request.get_json(force=True, silent=False) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    missing, bad_types, payload_norm = validate_payload(payload)
    if missing or bad_types:
        return jsonify({"error": "Bad request", "missing": missing, "problems": bad_types}), 400

    try:
        feats = build_feature_row(payload_norm)
        raw = float(model.predict(feats)[0])
        clamped, reason = clamp_prediction(raw, feats, payload_norm)
        resp = {
            "predicted_subscribers": int(round(clamped)),
            "predicted_subscribers_raw": raw,
            "was_clamped": bool(reason is not None or clamped != raw),
            "clamp_reason": reason,
            "inputs_used": payload_norm
        }
        return jsonify(resp)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
