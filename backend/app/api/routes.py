import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, WebSocket, WebSocketDisconnect
import asyncio
from sqlalchemy.orm import Session
from app.db.models import Run, Stage, Artifact, SessionLocal
import uuid
import time

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from typing import Optional
import datetime
import json
from fastapi.responses import FileResponse
from pydantic import BaseModel

class StageApproval(BaseModel):
    decision: Optional[dict] = None

def log_run(run_id: str, message: str):
    print(message)
    log_path = f"./tmp/{run_id}/agent_sysout.log"
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(message + "\n")

def execute_real_pipeline(run_id: str, problem_statement: str, dataset_path: Optional[str]):
    db = SessionLocal()
    try:
        from app.orchestrator.graph import (
            intake_node, data_acquisition_node, profiling_node, cleaning_node, 
            feature_engineering_node, model_competition_node, 
            tuning_node, evaluation_node, packaging_node
        )

        stage_names = [
            'Intake', 'Data Acquisition', 'Profiling', 'Cleaning', 
            'Feature Engineering', 'Model Competition', 'Tuning', 
            'Evaluation', 'Packaging'
        ]
        
        for name in stage_names:
            stage = Stage(run_id=run_id, name=name, status="pending")
            db.add(stage)
        db.commit()

        state = {"problem_statement": problem_statement, "run_id": run_id}
        
        log_run(run_id, f"\n[{datetime.datetime.now().strftime('%H:%M:%S')}] 🚀 NEW AAO RUN STARTED: {run_id}")
        log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 📋 Problem Statement: {problem_statement}")
        if dataset_path:
            log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 📁 User provided dataset: {dataset_path}")
        else:
            log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ⚠️ No dataset provided. Will autonomously generate mock data.")
            
        log_run(run_id, "="*60)

        def run_stage(name: str, node_func):
            stage = db.query(Stage).filter(Stage.run_id == run_id, Stage.name == name).first()
            stage.status = "running"
            db.commit()
            
            log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ⏳ EXECUTING: {name} Agent...")

            try:
                if name == 'Data Acquisition':
                    if dataset_path:
                        state["dataset_info"] = {"dataset_path": dataset_path, "source": "user_uploaded"}
                    else:
                        result = node_func(state)
                        state.update(result)
                    stage.status = "completed"
                    db.commit()
                    log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ✅ COMPLETED: {name} Agent\n")
                    
                elif name in ['Profiling', 'Cleaning']:
                    if name == 'Profiling':
                        result = node_func(state)
                        state.update(result)
                        
                    stage.status = "human_intervention_required"
                    db.commit()
                    
                    log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ⏸️ PAUSED: {name} Agent requires Human Intervention.")
                    log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 👉 Please approve the stage in the UI to continue...")
                    
                    while True:
                        db.refresh(stage)
                        db.commit()  # Release read locks so new runs can be created
                        if stage.status == "completed":
                            decision_path = f"./tmp/{run_id}/decision_{name}.json"
                            if os.path.exists(decision_path):
                                with open(decision_path, "r") as f:
                                    state[f"{name.lower().replace(' ', '_')}_decision"] = json.load(f)
                            log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ▶️ APPROVED: Human intervened. Resuming pipeline!\n")
                            break
                        time.sleep(1)
                        
                    if name == 'Cleaning':
                        result = node_func(state)
                        state.update(result)
                else:
                    result = node_func(state)
                    state.update(result)
                    stage.status = "completed"
                    db.commit()
                    log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ✅ COMPLETED: {name} Agent\n")
            except Exception as e:
                db.rollback()
                stage = db.query(Stage).filter(Stage.run_id == run_id, Stage.name == name).first()
                if stage:
                    stage.status = "failed"
                    db.commit()
                log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ❌ FAILED in {name}: {e}\n")
                raise e

        # Execute the sequence
        run_stage('Intake', intake_node)
        run_stage('Data Acquisition', data_acquisition_node)
        run_stage('Profiling', profiling_node)
        run_stage('Cleaning', cleaning_node)
        run_stage('Feature Engineering', feature_engineering_node)
        run_stage('Model Competition', model_competition_node)
        run_stage('Tuning', tuning_node)
        run_stage('Evaluation', evaluation_node)
        run_stage('Packaging', packaging_node)
                
        run = db.query(Run).filter(Run.id == run_id).first()
        run.status = "completed"
        db.commit()
        
        log_run(run_id, f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 🎉 SUCCESS: Pipeline {run_id} completely finished.")
        log_run(run_id, "="*60 + "\n")
        
    finally:
        db.close()

@router.post("/runs")
async def create_run(
    background_tasks: BackgroundTasks,
    problem_statement: str = Form(...),
    dataset: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Start a new AAO run based on a problem statement and optional dataset upload."""
    print("START create_run")
    run_id = f"aao-run-{uuid.uuid4().hex[:6]}"
    
    dataset_path = None
    if dataset and dataset.filename:
        print("Saving dataset")
        run_dir = f"./tmp/{run_id}"
        os.makedirs(run_dir, exist_ok=True)
        dataset_path = f"{run_dir}/{dataset.filename}"
        with open(dataset_path, "wb") as f:
            f.write(await dataset.read())
            
    print("Creating Run in DB")
    new_run = Run(
        id=run_id,
        problem_statement=problem_statement,
        status="running"
    )
    db.add(new_run)
    print("Committing Run in DB")
    db.commit()
    
    print("Adding background task")
    # Kick off the real execution loop
    background_tasks.add_task(execute_real_pipeline, run_id, problem_statement, dataset_path)
    
    print("Returning response")
    return {"run_id": run_id, "status": "started", "message": "Pipeline initialized."}

@router.get("/runs/{run_id}")
def get_run_status(run_id: str, db: Session = Depends(get_db)):
    """Get the current status of a run and its stages."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    stages = db.query(Stage).filter(Stage.run_id == run_id).all()
    
    return {
        "run_id": run.id,
        "status": run.status,
        "problem": run.problem_statement,
        "stages": [{"name": s.name, "status": s.status} for s in stages]
    }

@router.post("/runs/{run_id}/stage/{stage_name}/approve")
def approve_stage(run_id: str, stage_name: str, payload: StageApproval = None, db: Session = Depends(get_db)):
    """Human intervention endpoint to approve a stage and continue the pipeline."""
    stage = db.query(Stage).filter(Stage.run_id == run_id, Stage.name == stage_name).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
        
    if stage.status != "human_intervention_required":
        raise HTTPException(status_code=400, detail="Stage does not require intervention")
        
    if payload and payload.decision:
        decision_path = f"./tmp/{run_id}/decision_{stage_name}.json"
        with open(decision_path, "w") as f:
            json.dump(payload.decision, f)
            
    stage.status = "completed"
    db.commit()
    
    # Trigger the LangGraph to resume execution...
    return {"message": f"Stage {stage_name} approved. Pipeline resuming."}

@router.get("/runs/{run_id}/eda")
def get_eda_report(run_id: str):
    """Retrieve the generated EDA JSON report if it exists."""
    report_path = f"./tmp/{run_id}/eda_report.json"
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="EDA report not found.")
    with open(report_path, "r") as f:
        return json.load(f)

@router.get("/runs/{run_id}/metrics")
def get_metrics(run_id: str):
    """Retrieve the generated metrics JSON if it exists."""
    metrics_path = f"./tmp/{run_id}/metrics.json"
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Metrics not found.")
    with open(metrics_path, "r") as f:
        return json.load(f)

@router.websocket("/runs/{run_id}/ws")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    await websocket.accept()
    log_path = f"./tmp/{run_id}/agent_sysout.log"
    
    # Wait until the file exists
    timeout = 10
    start = time.time()
    while not os.path.exists(log_path):
        if time.time() - start > timeout:
            await websocket.close(reason="Log file not found timeout")
            return
        await asyncio.sleep(0.5)
        
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            while True:
                line = f.readline()
                if line:
                    await websocket.send_text(line.strip())
                else:
                    await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print(f"Client disconnected from log stream for run {run_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")

@router.get("/runs/{run_id}/download")
def download_model_package(run_id: str, db: Session = Depends(get_db)):
    """Download the ZIP archive of the packaged model artifacts."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    if run.status != "completed":
        raise HTTPException(status_code=400, detail="Pipeline has not completed yet.")
        
    zip_path = f"./tmp/{run_id}/aao_model_package.zip"
    if not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Model package not found.")
        
    return FileResponse(
        path=zip_path, 
        filename=f"aao_model_{run_id}.zip",
        media_type="application/zip"
    )

# ==========================================
# Dummy routes to suppress external 404 logs
# ==========================================
@router.get("/v1/pipelines")
def dummy_pipelines():
    return {"pipelines": []}

@router.get("/v1/deployments")
def dummy_deployments():
    return {"deployments": []}
