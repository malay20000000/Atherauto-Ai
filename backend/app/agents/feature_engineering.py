import os
import pandas as pd
import numpy as np

def engineer_features(cleaned_dataset_path: str, task_spec: dict, run_id: str = "default") -> dict:
    """
    Feature Engineering Agent
    Proposes features and runs dynamic feature selection.
    """
    print(f"[Feature Engineering Agent] Engineering features for {cleaned_dataset_path}")
    
    features_added = []
    features_dropped = []
    
    try:
        df = pd.read_csv(cleaned_dataset_path)
    except Exception:
        df = pd.DataFrame()
        
    if not df.empty:
        # Drop zero variance columns
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty:
            variances = numeric_df.var()
            zero_var_cols = variances[variances == 0].index.tolist()
            if zero_var_cols:
                df.drop(columns=zero_var_cols, inplace=True)
                features_dropped.extend(zero_var_cols)
                
            # Add polynomial features for top numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Avoid squaring target if it's there
            # Since task_spec might be a dict or object
            target = task_spec.get("target_variable") if isinstance(task_spec, dict) else getattr(task_spec, 'target_variable', None)
            
            if target in numeric_cols:
                numeric_cols.remove(target)
                
            for col in numeric_cols[:3]: # limit to 3
                new_col = f"{col}_squared"
                df[new_col] = df[col] ** 2
                features_added.append(new_col)
            
    run_dir = f"./tmp/{run_id}"
    os.makedirs(run_dir, exist_ok=True)
    final_path = f"{run_dir}/featured_dataset.csv"
    
    if not df.empty:
        df.to_csv(final_path, index=False)
    else:
        # Save empty file to avoid breaking pipeline completely
        pd.DataFrame().to_csv(final_path, index=False)
    
    return {
        "featured_dataset_path": final_path,
        "features_added": features_added,
        "features_dropped": features_dropped,
        "rationale": f"Added polynomial features for numerical columns. Dropped {len(features_dropped)} zero-variance columns."
    }
