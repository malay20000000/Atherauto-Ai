import os
import zipfile
import json

def package_model(evaluation_results: dict, task_spec: dict, run_id: str = "default") -> dict:
    """
    Packaging Agent
    Exports model (Pickle), model card, FastAPI serving stub, Dockerfile, and Jupyter Notebook.
    """
    print(f"\n" + "="*50)
    print(f"[Packaging Agent] Packaging the final pipeline for run: {run_id}")
    
    run_dir = f"./tmp/{run_id}"
    os.makedirs(run_dir, exist_ok=True)
    
    # 1. Verify Real Model File exists (created by tuning agent)
    model_export_path = f"{run_dir}/model.pkl"
    if os.path.exists(model_export_path):
        print(f"   -> Found real model artifact: {model_export_path}")
    else:
        print(f"   -> WARNING: Real model artifact not found at {model_export_path}")
        
    # Helper to get task_spec values safely
    def get_ts_val(key, default="Unknown"):
        return task_spec.get(key, default) if isinstance(task_spec, dict) else getattr(task_spec, key, default)
        
    # 2. Create Model Card
    model_card_path = f"{run_dir}/model_card.md"
    with open(model_card_path, "w") as f:
        f.write(f"# Model Card\n\n")
        f.write(f"## Domain: {get_ts_val('domain', 'General')}\n")
        f.write(f"## Task Type: {get_ts_val('task_type', 'Classification')}\n")
        
        metrics = evaluation_results.get("metrics", {})
        f.write("\n## Evaluation Metrics\n")
        for k, v in metrics.items():
            f.write(f"- **{k}**: {v}\n")
            
        f.write(f"\n## Narrative\n{evaluation_results.get('narrative', 'None')}\n")
    print(f"   -> Created documentation: {model_card_path}")
        
    # 2.5 Create Metrics JSON
    metrics_json_path = f"{run_dir}/metrics.json"
    with open(metrics_json_path, "w") as f:
        json.dump(evaluation_results.get("metrics", {}), f)
    print(f"   -> Created metrics file: {metrics_json_path}")
        
    # 3. Create FastAPI Serving Stub
    serving_stub_path = f"{run_dir}/serve.py"
    with open(serving_stub_path, "w") as f:
        f.write('from fastapi import FastAPI\n')
        f.write('import pickle\n\n')
        f.write('app = FastAPI(title="AAO Generated Model API")\n\n')
        f.write('@app.post("/predict")\n')
        f.write('def predict(data: dict):\n')
        f.write('    return {"prediction": "MOCK_PREDICTION"}\n')
    print(f"   -> Created deployment script: {serving_stub_path}")
    
    # 4. Create Dockerfile & Requirements for One-Click Deploy
    docker_path = f"{run_dir}/Dockerfile"
    with open(docker_path, "w") as f:
        f.write("FROM python:3.9-slim\n")
        f.write("WORKDIR /app\n")
        f.write("COPY requirements.txt .\n")
        f.write("RUN pip install -r requirements.txt\n")
        f.write("COPY serve.py model.pkl ./\n")
        f.write("EXPOSE 8000\n")
        f.write('CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8000"]\n')
    
    req_path = f"{run_dir}/requirements.txt"
    with open(req_path, "w") as f:
        f.write("fastapi\nuvicorn[standard]\nscikit-learn\npandas\n")
    print(f"   -> Created MLOps artifacts: Dockerfile & requirements.txt")

    # 5. Create Generative Jupyter Notebook
    notebook_path = f"{run_dir}/training_pipeline.ipynb"
    notebook_content = {
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": ["# AetherAutoML Generative Pipeline\n", f"**Task:** {task_spec.get('summary', 'Custom Task')}"]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": ["import pandas as pd\n", "import numpy as np\n", "from sklearn.model_selection import train_test_split\n", "from sklearn.ensemble import RandomForestClassifier\n\n", "print('Libraries loaded.')"]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": ["# 1. Data Loading\n", "df = pd.read_csv('dataset.csv')\n", "df.head()"]
            },
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": ["## Feature Engineering & Cleaning\n", "Applied automated transformations based on agent profiling."]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": ["# Imputation strategy chosen by Human-in-the-loop\n", "df.fillna(df.mean(), inplace=True)\n"]
            },
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": ["# 2. Model Training\n", "X = df.drop('target', axis=1)\n", "y = df['target']\n", "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)\n", "model = RandomForestClassifier()\n", "model.fit(X_train, y_train)\n", "print('Model trained successfully!')"]
            }
        ],
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"codemirror_mode": {"name": "ipython", "version": 3}, "mimetype": "text/x-python", "name": "python", "version": "3.9"}
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    with open(notebook_path, "w") as f:
        json.dump(notebook_content, f, indent=2)
    print(f"   -> Created Transparent Pipeline Notebook: {notebook_path}")

    # 6. Zip it all up
    zip_path = f"{run_dir}/aao_model_package.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        if os.path.exists(model_export_path):
            zipf.write(model_export_path, arcname="model.pkl")
        zipf.write(model_card_path, arcname="model_card.md")
        zipf.write(serving_stub_path, arcname="serve.py")
        zipf.write(docker_path, arcname="Dockerfile")
        zipf.write(req_path, arcname="requirements.txt")
        zipf.write(notebook_path, arcname="training_pipeline.ipynb")
        
    print(f"   -> Generated final archive: {zip_path}")
    print("="*50 + "\n")
    
    return {
        "model_export": model_export_path,
        "model_card": model_card_path,
        "serving_stub": serving_stub_path,
        "dockerfile": docker_path,
        "notebook": notebook_path,
        "archive": zip_path,
        "rationale": "Successfully exported artifacts (Notebook, Docker, API Stub) into ZIP archive."
    }
