import sys
import os
sys.path.append(os.getcwd() + '/backend')

from app.agents.data_acquisition import acquire_data
from app.agents.cleaning import clean_data
from app.agents.feature_engineering import engineer_features
from app.agents.model_competition import compete_models
from app.agents.tuning import tune_model
from app.agents.evaluation import evaluate_model
import pandas as pd

task_spec = {
    "task_type": "regression",
    "target_variable": "price",
    "domain": "real estate"
}

run_id = "test_run"
print("1. Acquiring Data")
acq = acquire_data(task_spec, run_id)
print("Columns:", pd.read_csv(acq["dataset_path"]).columns.tolist())

print("\n2. Cleaning")
clean = clean_data(acq["dataset_path"], {}, None, run_id)
print("Columns:", pd.read_csv(clean["cleaned_dataset_path"]).columns.tolist())

print("\n3. Feature Engineering")
fe = engineer_features(clean["cleaned_dataset_path"], task_spec, run_id)
print("Columns:", pd.read_csv(fe["featured_dataset_path"]).columns.tolist())

print("\n4. Model Competition")
comp = compete_models(fe["featured_dataset_path"], task_spec, run_id)
train_df = pd.read_csv(comp["train_data_path"])
print("Train target:", train_df.columns[-1])
print("X_train shape:", train_df.drop(columns=[train_df.columns[-1]]).shape)

print("\n5. Tuning")
tune = tune_model(comp, task_spec, run_id)
print("Score:", tune["final_score"])

print("\n6. Evaluation")
eval_res = evaluate_model(tune, fe["featured_dataset_path"], run_id)
print("Evaluation Metrics:", eval_res["metrics"])
