from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.models import init_db
from app.api.routes import router as api_router

# Initialize DB tables
init_db()

app = FastAPI(
    title="Agentic AutoML Orchestrator",
    description="Backend API for AAO",
    version="1.0.0"
)

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AAO Backend is running"}

@app.get("/")
def root():
    return {"message": "Welcome to Agentic AutoML Orchestrator"}
