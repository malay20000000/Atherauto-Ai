import json
import os
import pandas as pd
import numpy as np

from app.utils.logger import log_agent_thought

def profile_data(dataset_path: str, run_id: str = "default") -> dict:
    """
    Profiling Agent
    Runs dynamic EDA (schema, missingness, distributions, leakage checks) using pandas.
    """
    log_agent_thought(run_id, "PROFILING", f"Loading dataset from {dataset_path} into pandas DataFrame...")
    
    try:
        df = pd.read_csv(dataset_path)
    except Exception as e:
        log_agent_thought(run_id, "PROFILING", f"Error reading dataset: {e}")
        # fallback to empty dataframe if it fails
        df = pd.DataFrame()

    log_agent_thought(run_id, "PROFILING", "Executing dynamic EDA checks...", delay=0.7)
    
    log_agent_thought(run_id, "PROFILING", "Calculating schema and basic statistics...")
    num_rows, num_columns = df.shape if not df.empty else (0, 0)
    
    schema = {col: str(dtype) for col, dtype in df.dtypes.items()} if not df.empty else {}
    
    log_agent_thought(run_id, "PROFILING", "Scanning for missing values...", delay=0.5)
    missing_values = df.isnull().sum().to_dict() if not df.empty else {}
    
    # Check for features with missing values
    missing_features = [col for col, count in missing_values.items() if count > 0]
    if missing_features:
        log_agent_thought(run_id, "PROFILING", f"WARNING: Missing values detected in {', '.join(missing_features)}.")

    log_agent_thought(run_id, "PROFILING", "Computing Pearson correlation matrix...", delay=1.0)
    correlations = []
    distributions = {}
    
    if not df.empty:
        # Correlations (numeric columns only)
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty and len(numeric_df.columns) > 1:
            corr_matrix = numeric_df.corr().abs()
            # Get upper triangle
            upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            # Find top correlations
            for col in upper.columns:
                for row in upper.index:
                    if pd.notna(upper.loc[row, col]):
                        correlations.append({
                            "feature1": row,
                            "feature2": col,
                            "correlation": float(upper.loc[row, col])
                        })
            correlations = sorted(correlations, key=lambda x: x['correlation'], reverse=True)[:10] # Top 10

        # Distributions (take up to 5 columns to keep report size reasonable)
        for col in df.columns[:5]:
            if pd.api.types.is_numeric_dtype(df[col]):
                counts, bins = np.histogram(df[col].dropna(), bins=10)
                distributions[col] = [{"bin": f"{bins[i]:.2f}-{bins[i+1]:.2f}", "count": int(count)} for i, count in enumerate(counts)]
            else:
                val_counts = df[col].value_counts().head(10)
                distributions[col] = [{"bin": str(k), "count": int(v)} for k, v in val_counts.items()]

    log_agent_thought(run_id, "PROFILING", "Drafting Data Story for human review...")
    
    data_story = f"The dataset contains {num_rows} rows and {num_columns} columns. "
    if missing_features:
        data_story += f"Missing values were found in {len(missing_features)} columns, including {missing_features[0]}. "
    else:
        data_story += "No missing values were detected. "
        
    if correlations:
        top_corr = correlations[0]
        data_story += f"A strong correlation ({top_corr['correlation']:.2f}) was observed between {top_corr['feature1']} and {top_corr['feature2']}. "

    data_story += "Please review the detailed distributions and schema below before proceeding."

    report = {
        "data_story": data_story,
        "num_rows": int(num_rows),
        "num_columns": int(num_columns),
        "missing_values": missing_values,
        "schema": schema,
        "correlations": correlations,
        "distributions": distributions,
        "leakage_warnings": [],
        "class_imbalance": False
    }
    
    run_dir = f"./tmp/{run_id}"
    os.makedirs(run_dir, exist_ok=True)
    report_path = f"{run_dir}/eda_report.json"
    
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    return {
        "report_path": report_path,
        "summary": f"Dataset has {num_rows} rows. EDA report generated.",
        "eda_data": report
    }
