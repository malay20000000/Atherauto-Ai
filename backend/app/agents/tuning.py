import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.model_selection import RandomizedSearchCV
import joblib

def tune_model(competition_results: dict, task_spec: dict, run_id: str = "default") -> dict:
    """
    Tuning Agent
    Runs hyperparameter search on the top candidate.
    """
    best_family = competition_results.get("best_model_family", "Unknown")
    train_data_path = competition_results.get("train_data_path")
    
    print(f"[Tuning Agent] Tuning hyperparameters for {best_family}")
    
    try:
        df = pd.read_csv(train_data_path) if train_data_path else pd.DataFrame()
    except Exception:
        df = pd.DataFrame()
        
    tuned_params = {}
    final_score = 0.0
    rationale = f"Could not tune {best_family} because the dataset was empty or missing."
    model_export_path = None
    
    if not df.empty and best_family != "Unknown":
        target = task_spec.get("target_variable") if isinstance(task_spec, dict) else getattr(task_spec, 'target_variable', None)
        task_type = task_spec.get("task_type") if isinstance(task_spec, dict) else getattr(task_spec, 'task_type', 'classification')
        
        if not target or target not in df.columns:
            target = df.columns[-1]
            
        X = df.drop(columns=[target])
        y = df[target]
        
        is_classification = task_type in ["classification", "unknown"]
        if y.dtype == float:
            is_classification = False
            
        model = None
        param_distributions = {}
        
        if best_family == "RandomForest":
            model = RandomForestClassifier(random_state=42) if is_classification else RandomForestRegressor(random_state=42)
            param_distributions = {
                "n_estimators": [10, 50, 100],
                "max_depth": [None, 5, 10, 20]
            }
        elif best_family == "LogisticRegression":
            model = LogisticRegression(max_iter=500, random_state=42)
            param_distributions = {
                "C": [0.1, 1.0, 10.0]
            }
        elif best_family == "LinearRegression":
            model = LinearRegression()
            param_distributions = {} # no easy params to tune for vanilla LR
        elif best_family == "DecisionTree":
            model = DecisionTreeClassifier(random_state=42) if is_classification else DecisionTreeRegressor(random_state=42)
            param_distributions = {
                "max_depth": [None, 5, 10, 20],
                "min_samples_split": [2, 5, 10]
            }
            
        if model:
            if param_distributions:
                # Small n_iter so it runs quickly
                search = RandomizedSearchCV(model, param_distributions, n_iter=3, cv=3, random_state=42)
                search.fit(X, y)
                best_model = search.best_estimator_
                tuned_params = search.best_params_
                final_score = float(search.best_score_)
                rationale = f"Tuned {best_family} using RandomizedSearchCV. Best score: {final_score:.4f}"
            else:
                model.fit(X, y)
                best_model = model
                final_score = 0.0 # dummy
                rationale = f"Fitted {best_family} without tuning (no params specified)."
                
            run_dir = f"./tmp/{run_id}"
            os.makedirs(run_dir, exist_ok=True)
            model_export_path = f"{run_dir}/model.pkl"
            joblib.dump(best_model, model_export_path)
            
    return {
        "tuned_model_run_id": f"mlflow-{run_id}-tuned",
        "best_params": tuned_params,
        "final_score": final_score,
        "rationale": rationale,
        "model_export_path": model_export_path
    }
