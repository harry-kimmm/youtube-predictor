import os
import numpy as np
import pandas as pd
from pathlib import Path

RAW_CSV = Path("data/global_youtube_statistics.csv") 
OUT_CSV = Path("data/processed/youtube_clean.csv")
CURRENT_YEAR = 2023

def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = (
        df.columns
          .str.strip()
          .str.replace(r"\s+", "_", regex=True)
          .str.replace(r"[^0-9a-zA-Z_]", "", regex=True)
          .str.lower()
    )
    return df

def coerce_numeric(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    maybe_numeric = [
        "rank","subscribers","video_views","uploads",
        "video_views_rank","country_rank","channel_type_rank",
        "video_views_for_the_last_30_days","lowest_monthly_earnings","highest_monthly_earnings",
        "lowest_yearly_earnings","highest_yearly_earnings","subscribers_for_last_30_days",
        "created_year","created_month",
        "gross_tertiary_education_enrollment","population","unemployment_rate","urban_population",
        "latitude","longitude"
    ]
    for col in maybe_numeric:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["channel_age_years"] = CURRENT_YEAR - df.get("created_year")
    df.loc[df["channel_age_years"] <= 0, "channel_age_years"] = np.nan

    df["uploads_per_year"]   = df.get("uploads") / df["channel_age_years"]
    df["views_per_upload"]   = df.get("video_views") / df.get("uploads")
    df["views_last30_ratio"] = df.get("video_views_for_the_last_30_days") / df.get("video_views")
    df["subs_last30_ratio"]  = df.get("subscribers_for_last_30_days") / df.get("subscribers")

    df["monthly_earnings_mid"] = (df.get("lowest_monthly_earnings") + df.get("highest_monthly_earnings")) / 2.0
    df["yearly_earnings_mid"]  = (df.get("lowest_yearly_earnings")  + df.get("highest_yearly_earnings"))  / 2.0

    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df

def select_model_columns(df: pd.DataFrame) -> pd.DataFrame:
    target = "subscribers"
    numeric_features = [
        "video_views","uploads",
        "video_views_for_the_last_30_days","subscribers_for_last_30_days",
        "created_year","channel_age_years",
        "uploads_per_year","views_per_upload","views_last30_ratio",
        "monthly_earnings_mid","yearly_earnings_mid"
    ]
    categorical_features = ["category","country","channel_type"]

    keep = [c for c in [target] + numeric_features + categorical_features if c in df.columns]
    df = df[keep].dropna(subset=[target]).copy()
    return df

def main():
    df = pd.read_csv(RAW_CSV, encoding="latin1", low_memory=False)
    df = standardize_columns(df)
    df = df.replace({"nan": np.nan, "NaN": np.nan, "None": np.nan, "": np.nan})
    df = coerce_numeric(df)
    df = engineer_features(df)
    df = select_model_columns(df)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_CSV, index=False)
    print(f"Saved clean dataset")

if __name__ == "__main__":
    main()
