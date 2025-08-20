import inspect
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

DATA = Path("data/processed/youtube_clean.csv")
MODEL_PATH = Path("models/youtube_model.joblib")
TARGET = "subscribers"

NUM_COLS = [
    "video_views","uploads",
    "video_views_for_the_last_30_days","subscribers_for_last_30_days",
    "created_year","channel_age_years",
    "uploads_per_year","views_per_upload","views_last30_ratio",
    "monthly_earnings_mid","yearly_earnings_mid"
]

CAT_COLS = ["category","country","channel_type"]

def build_preprocessor(num_cols, cat_cols):
    numeric = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])
    ohe_kwargs = {"handle_unknown": "ignore"}
    if "sparse_output" in inspect.signature(OneHotEncoder).parameters:
        ohe_kwargs["sparse_output"] = False
    else:
        ohe_kwargs["sparse"] = False
    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(**ohe_kwargs))
    ])
    return ColumnTransformer([
        ("num", numeric, num_cols),
        ("cat", categorical, cat_cols),
    ])

def main():
    if not DATA.exists():
        raise FileNotFoundError(f"Processed CSV not found: {DATA.resolve()}")

    df = pd.read_csv(DATA)
    num_cols = [c for c in NUM_COLS if c in df.columns]
    cat_cols = [c for c in CAT_COLS if c in df.columns]

    X = df[num_cols + cat_cols].copy()
    y = df[TARGET].astype(float)

    pre = build_preprocessor(num_cols, cat_cols)

    base = Pipeline([
        ("pre", pre),
        ("reg", RandomForestRegressor(
            n_estimators=600,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        ))
    ])

    model = TransformedTargetRegressor(
        regressor=base, func=np.log1p, inverse_func=np.expm1
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    mae  = float(mean_absolute_error(y_test, preds))
    r2   = float(r2_score(y_test, preds))
    print(f"RMSE={rmse:,.2f}  MAE={mae:,.2f}  R²={r2: .3f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Saved model")

if __name__ == "__main__":
    main()
