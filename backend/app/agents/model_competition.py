import os
import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
import joblib

def compete_models(featured_dataset_path: str, task_spec: dict, run_id: str = "default") -> dict:
    """
    Model Competition Agent
    Trains multiple baseline models and evaluates them to create a leaderboard.
    """
    print(f"[Model Competition Agent] Running model competition on {featured_dataset_path}")
    
    try:
        df = pd.read_csv(featured_dataset_path)
    except Exception:
        df = pd.DataFrame()
        
    leaderboard = []
    best_model_family = "Unknown"
    rationale = "Dataset was empty, could not run competition."
    
    run_dir = f"./tmp/{run_id}"
    os.makedirs(run_dir, exist_ok=True)
    
    train_path = None
    holdout_path = None
    
    if not df.empty:
        target = task_spec.get("target_variable") if isinstance(task_spec, dict) else getattr(task_spec, 'target_variable', None)
        task_type = task_spec.get("task_type") if isinstance(task_spec, dict) else getattr(task_spec, 'task_type', 'classification')
        
        # If target not found or not specified, pick the last column
        if not target or target not in df.columns:
            target = df.columns[-1]
            
        X = df.drop(columns=[target])
        y = df[target]
        
        # Check if X is empty after drop
        if not X.empty and not y.empty:
            # Determine models based on task type
            is_classification = task_type in ["classification", "unknown"]
            
            # Simple heuristic: if target is float, force regression
            if y.dtype == float:
                is_classification = False
                
            if is_classification:
                models = {
                    "RandomForest": RandomForestClassifier(n_estimators=10, random_state=42),
                    "LogisticRegression": LogisticRegression(max_iter=200, random_state=42),
                    "DecisionTree": DecisionTreeClassifier(random_state=42)
                }
            else:
                models = {
                    "RandomForest": RandomForestRegressor(n_estimators=10, random_state=42),
                    "LinearRegression": LinearRegression(),
                    "DecisionTree": DecisionTreeRegressor(random_state=42)
                }
                
            best_score = -float("inf")
            
            for name, model in models.items():
                try:
                    # Use CV to evaluate
                    scores = cross_val_score(model, X, y, cv=3)
                    mean_score = scores.mean()
                    
                    leaderboard.append({
                        "model": name,
                        "cv_score": float(mean_score),
                        "run_id": f"mlflow-{name.lower()}-{run_id}"
                    })
                    
                    if mean_score > best_score:
                        best_score = mean_score
                        best_model_family = name
                except Exception as e:
                    print(f"Error training {name}: {e}")
                    
            # Sort leaderboard descending
            leaderboard = sorted(leaderboard, key=lambda x: x["cv_score"], reverse=True)
            if leaderboard:
                best_model_family = leaderboard[0]["model"]
                rationale = f"{best_model_family} achieved the highest cross-validation score ({leaderboard[0]['cv_score']:.4f})."
                
            # We also want to save a holdout set for evaluation later
            try:
                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                
                holdout_path = f"{run_dir}/holdout_dataset.csv"
                test_df = X_test.copy()
                test_df[target] = y_test
                test_df.to_csv(holdout_path, index=False)
                
                train_path = f"{run_dir}/train_dataset.csv"
                train_df = X_train.copy()
                train_df[target] = y_train
                train_df.to_csv(train_path, index=False)
            except Exception as split_err:
                print(f"Error splitting data: {split_err}")

    return {
        "leaderboard": leaderboard,
        "best_model_family": best_model_family,
        "rationale": rationale,
        "train_data_path": train_path,
        "holdout_data_path": holdout_path
    }
