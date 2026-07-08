import json
import pandas as pd
import numpy as np
import os
from app.utils.logger import log_agent_thought

def clean_data(dataset_path: str, profiling_report: dict, decision: dict = None, run_id: str = "default") -> dict:
    """
    Cleaning Agent
    Applies data cleaning plan, optionally guided by Human-in-the-Loop decisions.
    """
    log_agent_thought(run_id, "CLEANING", f"Cleaning dataset {dataset_path}...")
    
    try:
        df = pd.read_csv(dataset_path)
    except Exception as e:
        log_agent_thought(run_id, "CLEANING", f"Error reading dataset: {e}")
        df = pd.DataFrame()

    strategy = "mean"
    rationale = "Applied standard duplicate removal and mean imputation as per best practices."
    
    if decision and "strategy" in decision:
        strategy = decision["strategy"]
        rationale = f"Applied duplicate removal and {strategy} imputation as per Human-in-the-Loop override."
        log_agent_thought(run_id, "CLEANING", f"[HITL Override] Using missing value strategy: {strategy}", delay=0.5)
    else:
        log_agent_thought(run_id, "CLEANING", "No override provided. Proceeding with default imputation.", delay=0.5)
        
    log_agent_thought(run_id, "CLEANING", "Dropping duplicate rows...", delay=0.5)
    if not df.empty:
        df.drop_duplicates(inplace=True)
    
    log_agent_thought(run_id, "CLEANING", f"Filling missing values using {strategy}...", delay=0.8)
    cleaning_plan = [{"action": "drop_duplicates"}]
    
    if not df.empty:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        categorical_cols = df.select_dtypes(exclude=[np.number]).columns
        
        # Numeric imputation
        if strategy == "mean":
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
        elif strategy == "median":
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
        elif strategy == "mode":
            df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mode().iloc[0] if not df[numeric_cols].mode().empty else 0)
        
        # Categorical imputation (always mode for simplicity)
        if len(categorical_cols) > 0:
            modes = df[categorical_cols].mode()
            if not modes.empty:
                df[categorical_cols] = df[categorical_cols].fillna(modes.iloc[0])
            else:
                df[categorical_cols] = df[categorical_cols].fillna("Unknown")
            
        cleaning_plan.append({"action": "fill_missing", "strategy": strategy, "columns": list(numeric_cols)})
        
        log_agent_thought(run_id, "CLEANING", "Encoding categorical variables...", delay=0.6)
        
        from sklearn.preprocessing import LabelEncoder
        for col in categorical_cols:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            
        if len(categorical_cols) > 0:
            cleaning_plan.append({"action": "label_encoding", "columns": list(categorical_cols)})

    run_dir = f"./tmp/{run_id}"
    os.makedirs(run_dir, exist_ok=True)
    
    cleaned_path = f"{run_dir}/cleaned_dataset.csv"
    df.to_csv(cleaned_path, index=False)
    
    log_agent_thought(run_id, "CLEANING", f"Dataset cleaned and saved to {cleaned_path}")
    
    return {
        "cleaned_dataset_path": cleaned_path,
        "transform_log": cleaning_plan,
        "rationale": rationale
    }
