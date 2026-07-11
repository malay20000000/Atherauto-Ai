import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

class Run(Base):
    __tablename__ = 'runs'
    
    id = Column(String, primary_key=True, index=True) # UUID string
    problem_statement = Column(Text, nullable=False)
    status = Column(String, default="pending") # pending, running, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Store global run config / metadata
    manifest = Column(JSON, nullable=True) 

    stages = relationship("Stage", back_populates="run", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="run", cascade="all, delete-orphan")


class Stage(Base):
    __tablename__ = 'stages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String, ForeignKey('runs.id'), nullable=False)
    name = Column(String, nullable=False) # e.g. "intake", "data_acquisition"
    status = Column(String, default="pending") # pending, running, completed, failed, human_intervention_required
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Inputs/outputs specific to this stage
    stage_data = Column(JSON, nullable=True) 
    
    run = relationship("Run", back_populates="stages")


class Artifact(Base):
    __tablename__ = 'artifacts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String, ForeignKey('runs.id'), nullable=False)
    stage_name = Column(String, nullable=False)
    name = Column(String, nullable=False) # e.g. "eda_report", "cleaning_plan"
    type = Column(String, nullable=False) # e.g. "markdown", "json", "parquet", "pickle"
    path = Column(String, nullable=False) # Path to the file on disk (relative to /runs/{run_id}/)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    run = relationship("Run", back_populates="artifacts")

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aao.db")

connect_args = {}
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30}
else:
    engine_kwargs = {
        "pool_size": 20,
        "max_overflow": 30,
        "pool_timeout": 60
    }

engine = create_engine(
    DATABASE_URL, connect_args=connect_args, **engine_kwargs
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
