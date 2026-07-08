from pydantic import BaseModel, Field
from typing import Optional, List, Literal

class TaskSpec(BaseModel):
    task_type: Literal["classification", "regression", "clustering", "forecasting", "unknown"] = Field(
        description="The detected type of the machine learning task."
    )
    target_variable: Optional[str] = Field(
        None, description="The target column to predict, if one can be inferred or was provided."
    )
    success_metric: Optional[str] = Field(
        None, description="The primary evaluation metric (e.g., accuracy, f1, rmse, mae). If not explicitly stated, infer the best default based on the task."
    )
    constraints: List[str] = Field(
        default_factory=list, description="Any specific constraints mentioned in the problem statement (e.g., 'must be interpretable', 'low latency required')."
    )
    domain: Optional[str] = Field(
        None, description="The domain of the problem if inferable (e.g., healthcare, finance, e-commerce) to help with data sourcing."
    )
    reasoning: str = Field(
        description="A short explanation of how the task_type and target were derived from the problem statement."
    )
