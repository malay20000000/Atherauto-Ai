# Agentic AutoML Orchestrator (AAO)

An autonomous, multi-agent machine learning pipeline orchestrator built with FastAPI, Next.js, and LangGraph. 
It takes a natural language problem statement and autonomously handles data sourcing, profiling, cleaning, feature engineering, model selection, tuning, evaluation, and packaging.

## Prerequisites

Before setting up the project, make sure you have the following installed on your machine:
*   **Python 3.10+**
*   **Node.js 18+** & npm
*   (Optional but recommended) C++ Build Tools on Windows (required for building `xgboost` and `catboost` wheels from source if you plan to swap the ML stubs with the real libraries).

## 1. Backend Setup (FastAPI & LangGraph)

The backend drives the intelligent pipeline, maintaining the LangGraph agents and serving endpoints for the UI.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv
   
   # On Windows:
   .\.venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   # Ensure pip and build tools are up to date
   pip install --upgrade pip setuptools wheel
   
   # Install the requirements
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   A `.env` file is already provided in the `backend/` directory. Make sure you insert your actual `GOOGLE_API_KEY` (Gemini) inside it:
   ```ini
   GOOGLE_API_KEY=your_actual_key_here
   ```

5. **Start the Backend Server:**
   This will initialize the SQLite database (`aao.db`) and start the FastAPI server on port 8000.
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *You can view the API documentation by visiting: http://127.0.0.1:8000/docs*

## 2. Frontend Setup (Next.js 14)

The frontend provides the interactive timeline and checkpoint intervention UI for monitoring your Agentic runs.

1. **Open a new terminal window** (leave the backend running) and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **View the UI:**
   Open your browser and navigate to http://localhost:3000 to see the Agentic AutoML dashboard.

## 3. Running the Pipeline Tests

If you want to run the LangGraph pipeline synchronously via the command line to see the agents in action:

1. In your activated backend virtual environment, run the orchestrator test:
   ```bash
   python app/orchestrator/graph.py
   ```
   
2. You can also test the NLP Intake Agent individually to see how it converts English problem statements to strict JSON schemas:
   ```bash
   python tests/test_intake.py
   ```
