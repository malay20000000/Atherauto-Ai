import pandas as pd
import numpy as np
import uuid
import os

from app.utils.logger import log_agent_thought

def acquire_data(task_spec: dict, run_id: str = "default") -> dict:
    """
    Data Acquisition Agent
    Generates dynamic synthetic data based on the task domain and schema if no dataset is provided.
    """
    log_agent_thought(run_id, "DATA_ACQ", "="*50, delay=0)
    log_agent_thought(run_id, "DATA_ACQ", "Generating dynamic synthetic dataset using Faker...", delay=0.5)
    
    domain = task_spec.get('domain') or 'general'
    task_type = task_spec.get('task_type') or 'classification'
    target = task_spec.get('target_variable') or 'target'
    
    log_agent_thought(run_id, "DATA_ACQ", f"-> Domain: {domain}", delay=0.2)
    log_agent_thought(run_id, "DATA_ACQ", f"-> Task Type: {task_type}", delay=0.2)
    log_agent_thought(run_id, "DATA_ACQ", f"-> Target: {target}", delay=0.4)
    
    # Generate 150 rows of intelligent mock data
    np.random.seed(42)
    
    data = []
    for _ in range(150):
        if domain.lower() in ['finance', 'banking', 'fraud']:
            row = {
                'transaction_amount': round(np.random.exponential(100), 2),
                'merchant_category': np.random.choice(['retail', 'travel', 'food', 'digital']),
                'customer_age': np.random.randint(18, 85),
                'account_balance': round(np.random.uniform(100, 50000), 2)
            }
        elif domain.lower() in ['real estate', 'housing', 'property']:
            row = {
                'square_footage': np.random.randint(500, 5000),
                'bedrooms': np.random.randint(1, 6),
                'neighborhood_rating': np.random.randint(1, 10),
                'year_built': np.random.randint(1950, 2024)
            }
        else:
            row = {
                'user_id': uuid.uuid4().hex[:8],
                'activity_score': round(np.random.uniform(0, 100), 1),
                'category': np.random.choice(['A', 'B', 'C', 'D']),
                'days_active': np.random.randint(1, 365)
            }
            
        data.append(row)
        
    df = pd.DataFrame(data)
    
    # Generate the target intelligently
    if task_type == 'classification':
        if 'transaction_amount' in df.columns:
            df[target] = (df['transaction_amount'] > 200).astype(int)
        else:
            df[target] = np.random.choice([0, 1], 150)
    else: # regression
        if 'square_footage' in df.columns:
            df[target] = df['square_footage'] * 150 + np.random.randn(150) * 10000
        else:
            df[target] = df[df.columns[1]] * 2.5 + np.random.randn(150)
            
    log_agent_thought(run_id, "DATA_ACQ", f"-> Generated {len(df)} rows and {len(df.columns)} columns.", delay=0.8)

    data_dir = os.path.join(os.getcwd(), "data")
    os.makedirs(data_dir, exist_ok=True)
    dataset_path = os.path.join(data_dir, "dummy_dataset.csv")
    df.to_csv(dataset_path, index=False)
    
    log_agent_thought(run_id, "DATA_ACQ", f"Saved synthetic dataset to {dataset_path}")
    log_agent_thought(run_id, "DATA_ACQ", "="*50 + "\n", delay=0)
    
    return {
        "dataset_path": dataset_path,
        "source": "synthetic_faker",
        "provenance": "Synthetic data generated as a fallback.",
        "is_synthetic": True
    }
