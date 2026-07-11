import sys
import os
from dotenv import load_dotenv
sys.path.append(os.getcwd() + '/backend')

load_dotenv(os.getcwd() + '/backend/.env')

from app.agents.intake import process_problem_statement

problem = "predict customer churn after 30 days"
spec = process_problem_statement(problem, "test")
print("TaskSpec:", spec)
