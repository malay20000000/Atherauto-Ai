import sys
import os

# Add backend to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.intake import process_problem_statement
from app.schemas.task_spec import TaskSpec

def run_tests():
    problem_statements = [
        # 1. Classification
        "I need a model to predict if a credit card transaction is fraudulent in real-time. We must minimize false positives because blocking legitimate transactions upsets customers.",
        
        # 2. Regression
        "Predict the housing price based on square footage, number of bedrooms, and zip code. I want to know the average error in dollars.",
        
        # 3. Clustering
        "Group our customer base into distinct segments based on their purchasing behavior so our marketing team can send targeted emails.",
        
        # 4. Forecasting
        "Forecast daily sales for the next 30 days for each of our 50 retail stores using historical sales data from the past 3 years.",
        
        # 5. Ambiguous
        "Make my business more profitable by looking at our data."
    ]

    print("Running Intake Agent Test Harness...\n" + "="*40)
    for i, statement in enumerate(problem_statements, 1):
        print(f"\nTest {i}: {statement}")
        try:
            result: TaskSpec = process_problem_statement(statement)
            print("Parsed Result:")
            print(result.model_dump_json(indent=2))
        except Exception as e:
            print(f"Error parsing statement: {e}")

if __name__ == "__main__":
    run_tests()
