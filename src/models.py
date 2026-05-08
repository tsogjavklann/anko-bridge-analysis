"""
ANKO Bridge — ML загваруудын helper-ууд.

Notebook 04-аас дуудагдана. Энд feature engineering, train/test split,
гурван supervised загвар (LogReg, Random Forest, XGBoost) ба хоёр
unsupervised pipeline (KMeans, hierarchical) байрлана.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False


# ============================================================
# Feature engineering
# ============================================================
APPLICATION_FEATURES = [
    "hsk_level", "hsk_score", "gpa_percent", "family_income_mnt",
    "apply_age", "is_high_school_senior",
]
CATEGORICAL_FEATURES = ["aimag", "school_type", "anko_program_type", "tier", "field"]


def build_feature_matrix(apps: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Build numeric feature matrix with one-hot encoded categoricals."""
    df = apps[APPLICATION_FEATURES + CATEGORICAL_FEATURES].copy()
    df["is_high_school_senior"] = df["is_high_school_senior"].astype(int)
    # Compress aimag — keep top 5, rest → "Бусад"
    top_aimags = df["aimag"].value_counts().head(5).index.tolist()
    df["aimag"] = df["aimag"].where(df["aimag"].isin(top_aimags), "Бусад")
    encoded = pd.get_dummies(df, columns=CATEGORICAL_FEATURES, drop_first=True)
    return encoded, list(encoded.columns)


# ============================================================
# Supervised models
# ============================================================
def fit_logreg(X: pd.DataFrame, y: pd.Series) -> dict:
    """Logistic regression — visa approval predictor.
    Returns coefficients + ROC + accuracy."""
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    scaler = StandardScaler()
    Xtr_s = scaler.fit_transform(Xtr)
    Xte_s = scaler.transform(Xte)
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(Xtr_s, ytr)
    yp = model.predict(Xte_s)
    yp_prob = model.predict_proba(Xte_s)[:, 1]
    fpr, tpr, _ = roc_curve(yte, yp_prob)
    return {
        "model": model,
        "scaler": scaler,
        "coefs": dict(zip(X.columns, model.coef_[0])),
        "intercept": float(model.intercept_[0]),
        "feature_means": dict(zip(X.columns, scaler.mean_)),
        "feature_stds": dict(zip(X.columns, scaler.scale_)),
        "accuracy": float(accuracy_score(yte, yp)),
        "f1": float(f1_score(yte, yp, zero_division=0)),
        "auc": float(roc_auc_score(yte, yp_prob)),
        "roc": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
        "confusion_matrix": confusion_matrix(yte, yp).tolist(),
    }


def fit_random_forest(X: pd.DataFrame, y: pd.Series) -> dict:
    """Random Forest — acceptance predictor with feature importances."""
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(Xtr, ytr)
    yp = model.predict(Xte)
    yp_prob = model.predict_proba(Xte)[:, 1]
    importances = sorted(
        zip(X.columns, model.feature_importances_),
        key=lambda x: x[1], reverse=True,
    )
    return {
        "model": model,
        "accuracy": float(accuracy_score(yte, yp)),
        "f1": float(f1_score(yte, yp, zero_division=0)),
        "auc": float(roc_auc_score(yte, yp_prob)),
        "feature_importances": [{"feature": f, "importance": float(i)} for f, i in importances[:15]],
        "confusion_matrix": confusion_matrix(yte, yp).tolist(),
    }


def fit_xgboost(X: pd.DataFrame, y: pd.Series) -> dict:
    """XGBoost — scholarship awarded predictor."""
    if not HAS_XGB:
        return {"error": "xgboost not installed"}
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        random_state=42, eval_metric="logloss", verbosity=0,
    )
    model.fit(Xtr, ytr)
    yp = model.predict(Xte)
    yp_prob = model.predict_proba(Xte)[:, 1]
    importances = sorted(
        zip(X.columns, model.feature_importances_),
        key=lambda x: x[1], reverse=True,
    )
    return {
        "model": model,
        "accuracy": float(accuracy_score(yte, yp)),
        "f1": float(f1_score(yte, yp, zero_division=0)),
        "auc": float(roc_auc_score(yte, yp_prob)),
        "feature_importances": [{"feature": f, "importance": float(i)} for f, i in importances[:15]],
    }


# ============================================================
# Unsupervised — student personas
# ============================================================
PERSONA_FEATURES = ["hsk_level", "hsk_score", "gpa_percent", "family_income_mnt", "age_at_register"]


def cluster_students(students: pd.DataFrame, k: int = 5) -> dict:
    """KMeans clustering of students into personas."""
    X = students[PERSONA_FEATURES].dropna().copy()
    X["family_income_mnt"] = np.log10(X["family_income_mnt"] + 1)  # log-scale income
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(Xs)
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(Xs)
    # Per-cluster summary stats — restore original (un-logged) income for readability
    Xfull = X.copy()
    Xfull["family_income_mnt"] = students.loc[X.index, "family_income_mnt"]
    Xfull["cluster"] = labels
    summary = Xfull.groupby("cluster")[PERSONA_FEATURES].mean().round(1)
    sizes = pd.Series(labels).value_counts().sort_index()
    return {
        "labels": labels.tolist(),
        "indices": X.index.tolist(),
        "pca_coords": coords.tolist(),
        "summary": summary.to_dict(orient="index"),
        "sizes": sizes.to_dict(),
        "k": k,
        "inertia": float(km.inertia_),
    }


def label_personas(cluster_summary: dict[int, dict]) -> dict[int, str]:
    """Heuristic naming based on cluster centroids — ensures unique names."""
    # First, sort clusters by GPA so we can disambiguate duplicates by quality tier
    items = sorted(cluster_summary.items(), key=lambda kv: -kv[1]["gpa_percent"])
    names = {}
    used = set()

    def assign(cid, name):
        if name in used:
            # Disambiguate by adding a qualifier
            if name == "Орон нутгийн боломжит сурагчид":
                name = "Орон нутгийн дэмжлэг хэрэгтэй сурагчид"
            elif name == "Хэлний бэлтгэлээс эхлэгчид":
                name = "Орон нутгийн дэмжлэг хэрэгтэй сурагчид"
        used.add(name)
        names[cid] = name

    for cid, stats in items:
        hsk = stats["hsk_level"]
        gpa = stats["gpa_percent"]
        age = stats["age_at_register"]
        if age >= 22:
            assign(cid, "Ахисан түвшний суралцагчид")
        elif gpa >= 88 and hsk >= 5:
            assign(cid, "Шууд элсэгчид")
        elif hsk >= 4 and gpa >= 82:
            assign(cid, "Тэтгэлэгт төвлөрсөн сурагчид")
        elif hsk <= 3 and gpa >= 78:
            assign(cid, "Хэлний бэлтгэлээс эхлэгчид")
        else:
            assign(cid, "Орон нутгийн боломжит сурагчид")
    return names
