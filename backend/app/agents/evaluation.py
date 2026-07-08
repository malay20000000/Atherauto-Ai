import os
import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def evaluate_model(tuning_results: dict, dataset_path: str, run_id: str = "default") -> dict:
    """
    Evaluation & Interpretability Agent
    Computes real metrics using the holdout set.
    """
    print(f"[Evaluation Agent] Evaluating model run {tuning_results.get('tuned_model_run_id')}")
    
    metrics = {}
    narrative = "Evaluation could not be completed."
    shap_summary_path = ""
    
    run_dir = f"./tmp/{run_id}"
    holdout_path = f"{run_dir}/holdout_dataset.csv"
    model_path = tuning_results.get("model_export_path")
    
    if model_path and os.path.exists(model_path) and os.path.exists(holdout_path):
        try:
            model = joblib.load(model_path)
            df = pd.read_csv(holdout_path)
            
            if not df.empty:
                # Target was saved as the last column in model_competition.py
                target = df.columns[-1]
                X = df.drop(columns=[target])
                y = df[target]
                
                preds = model.predict(X)
                
                is_classification = hasattr(model, "predict_proba") or "Classifier" in str(type(model)) or "LogisticRegression" in str(type(model))
                
                if is_classification:
                    metrics = {
                        "accuracy": float(accuracy_score(y, preds)),
                        "precision": float(precision_score(y, preds, average='weighted', zero_division=0)),
                        "recall": float(recall_score(y, preds, average='weighted', zero_division=0)),
                        "f1": float(f1_score(y, preds, average='weighted', zero_division=0))
                    }
                    narrative = f"The model achieves an accuracy of {metrics['accuracy']:.4f} and F1 score of {metrics['f1']:.4f} on the holdout test set."
                else:
                    metrics = {
                        "rmse": float(mean_squared_error(y, preds)) ** 0.5,
                        "mae": float(mean_absolute_error(y, preds)),
                        "r2": float(r2_score(y, preds))
                    }
                    narrative = f"The model achieves an RMSE of {metrics['rmse']:.4f} and R2 of {metrics['r2']:.4f} on the holdout test set."
                    
        except Exception as e:
            narrative = f"Error evaluating model: {e}"
            print(narrative)
            
    return {
        "metrics": metrics,
        "shap_summary_plot": shap_summary_path,
        "narrative": narrative
    }
