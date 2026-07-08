from typing import TypedDict, Optional, Dict, Any
import sys
import os

# Add backend to path so we can import app modules when running directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Mock state definition
class PipelineState(TypedDict):
    problem_statement: str
    task_spec: Optional[dict]
    dataset_info: Optional[dict]
    profiling_report: Optional[dict]
    cleaning_results: Optional[dict]
    engineering_results: Optional[dict]
    competition_results: Optional[dict]
    tuning_results: Optional[dict]
    evaluation_results: Optional[dict]
    packaging_results: Optional[dict]
    error: Optional[str]

# LangGraph relies on nodes, which are just python functions taking State -> State

def intake_node(state: PipelineState):
    from app.agents.intake import process_problem_statement
    task_spec = process_problem_statement(state["problem_statement"], state.get("run_id", "default"))
    return {"task_spec": task_spec.model_dump() if hasattr(task_spec, 'model_dump') else task_spec}

def data_acquisition_node(state: PipelineState):
    from app.agents.data_acquisition import acquire_data
    return {"dataset_info": acquire_data(state["task_spec"], state.get("run_id", "default"))}

def profiling_node(state: PipelineState):
    from app.agents.profiling import profile_data
    return {"profiling_report": profile_data(state["dataset_info"]["dataset_path"], state.get("run_id", "default"))}

def cleaning_node(state: PipelineState):
    from app.agents.cleaning import clean_data
    decision = state.get("cleaning_decision", None)
    return {"cleaning_results": clean_data(state["dataset_info"]["dataset_path"], state["profiling_report"], decision, state.get("run_id", "default"))}

def feature_engineering_node(state: PipelineState):
    from app.agents.feature_engineering import engineer_features
    return {"engineering_results": engineer_features(state["cleaning_results"]["cleaned_dataset_path"], state["task_spec"], state.get("run_id", "default"))}

def model_competition_node(state: PipelineState):
    from app.agents.model_competition import compete_models
    return {"competition_results": compete_models(state["engineering_results"]["featured_dataset_path"], state["task_spec"], state.get("run_id", "default"))}

def tuning_node(state: PipelineState):
    from app.agents.tuning import tune_model
    return {"tuning_results": tune_model(state["competition_results"], state["task_spec"], state.get("run_id", "default"))}

def evaluation_node(state: PipelineState):
    from app.agents.evaluation import evaluate_model
    return {"evaluation_results": evaluate_model(state["tuning_results"], state["engineering_results"]["featured_dataset_path"], state.get("run_id", "default"))}

def packaging_node(state: PipelineState):
    from app.agents.packaging import package_model
    run_id = state.get("run_id", "default_run")
    return {"packaging_results": package_model(state["evaluation_results"], state["task_spec"], run_id)}

def build_graph():
    """
    Builds the LangGraph state machine.
    We return a mock representation since we don't have the fully functioning library installed, 
    but the structure is strictly defined.
    """
    try:
        from langgraph.graph import StateGraph, END
        
        workflow = StateGraph(PipelineState)
        
        workflow.add_node("intake", intake_node)
        workflow.add_node("data_acquisition", data_acquisition_node)
        workflow.add_node("profiling", profiling_node)
        workflow.add_node("cleaning", cleaning_node)
        workflow.add_node("feature_engineering", feature_engineering_node)
        workflow.add_node("model_competition", model_competition_node)
        workflow.add_node("tuning", tuning_node)
        workflow.add_node("evaluation", evaluation_node)
        workflow.add_node("packaging", packaging_node)
        
        # Define edges
        workflow.add_edge("intake", "data_acquisition")
        workflow.add_edge("data_acquisition", "profiling")
        workflow.add_edge("profiling", "cleaning")
        workflow.add_edge("cleaning", "feature_engineering")
        workflow.add_edge("feature_engineering", "model_competition")
        workflow.add_edge("model_competition", "tuning")
        workflow.add_edge("tuning", "evaluation")
        workflow.add_edge("evaluation", "packaging")
        workflow.add_edge("packaging", END)
        
        workflow.set_entry_point("intake")
        
        return workflow.compile()
    except ImportError:
        print("LangGraph not installed. Returning standard synchronous pipeline function instead.")
        def run_pipeline_sync(problem_statement: str):
            state = {"problem_statement": problem_statement}
            state.update(intake_node(state))
            state.update(data_acquisition_node(state))
            state.update(profiling_node(state))
            state.update(cleaning_node(state))
            state.update(feature_engineering_node(state))
            state.update(model_competition_node(state))
            state.update(tuning_node(state))
            state.update(evaluation_node(state))
            state.update(packaging_node(state))
            return state
        return run_pipeline_sync

if __name__ == "__main__":
    # Test the pipeline
    graph = build_graph()
    problem = "Predict housing price from square footage"
    print(f"Running pipeline for: {problem}")
    
    if hasattr(graph, 'invoke'):
        result = graph.invoke({"problem_statement": problem})
    else:
        result = graph(problem)
        
    print("\nFinal State Keys:", result.keys())
    print("\nPackaging Results:", result["packaging_results"])
