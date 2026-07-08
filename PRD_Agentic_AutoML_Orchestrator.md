# PRD: Agentic AutoML Orchestrator (AAO)

**Author:** Pranav | **Version:** 1.0 | **Date:** July 2026
**Status:** Draft for build

---

## 1. One-line pitch
Give the system a problem statement (and optionally a dataset) → a pipeline of specialized AI agents autonomously handles data acquisition, cleaning, feature engineering, multi-model competition, tuning, evaluation, and a final report/deployable artifact — with a human checkpoint at key decision points, not a black box.

## 2. Problem statement
Building an ML solution end-to-end today means manually: finding/scraping data, profiling it, cleaning it, engineering features, trying 5-10 models, tuning each, comparing them fairly, interpreting the winner, and packaging it. This is repetitive, well-understood work that an orchestrated set of agents — each an expert at one stage — can do faster and more consistently than a human doing it serially, while still surfacing every decision for review.

## 3. Goals / Non-goals

**Goals**
- Accept an informal problem statement in natural language as the only mandatory input.
- Accept an optional dataset (CSV/Parquet/JSON/images/text); if absent, autonomously source one.
- Fully automate: data collection → profiling → cleaning → feature engineering → model selection (competition across multiple model families) → hyperparameter tuning → evaluation/interpretability → packaging.
- Produce a reviewable trail of artifacts at every stage (not just a final model) — plans, EDA reports, leaderboards, model cards.
- Support tabular classification/regression as v1 scope; architecture should not block adding NLP/CV/time-series later.
- Let the user intervene (approve/edit/re-run) at defined checkpoints without restarting the whole pipeline.

**Non-goals (v1)**
- Not building a general no-code data science IDE — this is a pipeline with a thin UI, not a full workbench.
- Not supporting distributed/multi-node training — single-machine, dataset sizes that fit in memory or chunked processing (up to a few GB).
- Not doing continuous production monitoring/retraining loops in v1 — packaging + a serving stub is enough.
- Not fine-tuning foundation models — v1 covers classical ML/AutoML (tree ensembles, linear models, simple nets), not LLM fine-tuning.

## 4. Users
- Primarily Pranav himself: rapid prototyping for competitions, portfolio pieces, research baselines.
- Secondary: anyone wanting a "describe the problem, get a working model" experience — students, hackathon teams.

## 5. Core user flow

1. User submits a **problem statement** (free text) via UI or API, optionally attaches a dataset.
2. **Intake Agent** parses the statement → infers task type (classification/regression/clustering/forecasting), target variable (if dataset given), success metric, constraints (latency, interpretability need, fairness).
3. If no dataset: **Data Acquisition Agent** searches public sources (Kaggle API, HuggingFace Datasets, UCI ML Repo, data.gov, web search) for a matching dataset, or synthesizes one when nothing fits, and reports provenance.
4. **Profiling Agent** runs automated EDA (schema, missingness, distributions, target leakage checks, class imbalance) → produces an EDA report artifact.
5. **Cleaning Agent** handles missing values, duplicates, outliers, type coercion, encoding of obvious junk — proposes a cleaning plan, applies it, logs every transform for reproducibility.
6. **Feature Engineering Agent** generates candidate features (encodings, scaling, datetime decomposition, text embeddings if relevant, interaction/polynomial terms, domain-informed features when the problem statement suggests them) and runs feature selection (mutual information, permutation importance, correlation pruning).
7. **Model Competition Agent** trains a slate of model families in parallel (e.g., logistic/linear, random forest, XGBoost, LightGBM, CatBoost, a small MLP) under identical CV folds, logs to an experiment tracker, produces a leaderboard.
8. **Tuning Agent** runs Optuna-based hyperparameter search on the top 2-3 leaderboard entries (budget-aware: time/trial caps).
9. **Evaluation & Interpretability Agent** computes final metrics, confusion matrix/residuals, SHAP-based explanations, and an error-slice analysis (where does the model fail?).
10. **Packaging Agent** exports the winning model (pickle/ONNX), writes a model card (data lineage, metrics, limitations, intended use), and scaffolds a minimal FastAPI serving endpoint.
11. User reviews the final report + artifacts; can request "try harder on recall" or "swap in this feature" and only the relevant downstream agents re-run (not the whole pipeline).

## 6. Functional requirements

| # | Requirement |
|---|---|
| FR1 | System accepts a problem statement (text) and optional dataset file(s) as input |
| FR2 | System auto-detects ML task type and target column when a dataset is present |
| FR3 | System sources a dataset autonomously when none is provided, with citation of source |
| FR4 | System produces a structured EDA report before any modification |
| FR5 | All cleaning/feature transforms are logged as a reproducible, replayable pipeline (not just applied silently) |
| FR6 | At least 4 distinct model families compete under identical evaluation protocol |
| FR7 | Hyperparameter tuning is time/trial-budgeted and resumable |
| FR8 | Final output includes a leaderboard, chosen model rationale, metrics, and interpretability artifacts |
| FR9 | User can intervene at each stage boundary: approve, edit parameters, or request rerun of that stage only |
| FR10 | Every agent's output is a versioned artifact (JSON/markdown) retrievable independently of the running job |
| FR11 | Pipeline runs are resumable after failure from the last completed stage |

## 7. Non-functional requirements
- **Reproducibility:** every run is fully reconstructable from a saved run manifest (data hash, transform log, model config, seed).
- **Transparency:** no silent decisions — every automated choice (imputation strategy, model picked, features dropped) has a one-line rationale attached.
- **Cost/time awareness:** the pipeline respects a user-set time budget and degrades gracefully (fewer models, fewer trials) rather than failing.
- **Extensibility:** adding a new model family or feature-engineering technique should be a config/plugin addition, not a rewrite.
- **Lean by default:** no infrastructure the current scale doesn't need — start with SQLite + local filesystem for artifacts; only add Postgres/object storage/queueing if concurrent multi-user runs actually require it.

## 8. System architecture (proposed)

**Orchestration layer:** A directed multi-agent graph (LangGraph-style state machine) rather than a single mega-prompt — each stage is a node with a defined input/output schema, so a stage can be re-run independently and a critic/reviewer step can gate progression.

**Agents (each a scoped LLM-driven or hybrid LLM+code component):**
- Intake Agent — LLM reasoning over the problem statement → structured task spec (JSON schema: task_type, target, metric, constraints).
- Data Acquisition Agent — LLM + tool calls (Kaggle API, HF Datasets API, web search) → dataset + provenance note.
- Profiling Agent — deterministic code (pandas-profiling-style) + LLM summary of findings.
- Cleaning Agent — LLM proposes a plan (as a transform spec, not free-form code execution against raw data blindly) → deterministic executor applies it → LLM reviews the diff.
- Feature Engineering Agent — LLM proposes candidate features from the task spec + profiling report → deterministic feature-selection code narrows them.
- Model Competition Agent — deterministic training harness (scikit-learn/XGBoost/LightGBM/CatBoost) driven by a fixed CV protocol; LLM only interprets the leaderboard.
- Tuning Agent — Optuna study per top candidate; LLM sets search space priors from the task spec, code executes trials.
- Evaluation/Interpretability Agent — deterministic metrics + SHAP; LLM writes the narrative "why this model, where it fails."
- Packaging Agent — deterministic export + model card templating.

This split matters: **LLMs plan and explain, deterministic code executes and measures.** Don't let an LLM directly compute your metrics or silently mutate data with no logged transform — that's how you get irreproducible, untrustworthy pipelines.

**Experiment tracking:** MLflow (you've used this before) for run/metric/artifact logging.
**Hyperparameter search:** Optuna.
**Interpretability:** SHAP.
**Data layer:** flat Parquet/CSV files per run under a run ID; SQLite for run metadata/leaderboard; escalate to Postgres only if you need concurrent multi-user access.
**API layer:** FastAPI, one endpoint per pipeline action (`/runs`, `/runs/{id}/stage/{stage}`, `/runs/{id}/artifacts`).
**Frontend:** Next.js — a run timeline view (stage progress), an artifact viewer (EDA report, leaderboard, SHAP plots), and an intervention panel per stage.
**Sandbox execution:** agent-generated cleaning/feature code should run in a restricted subprocess/sandbox (resource + time limits, no network) since it's executing on arbitrary uploaded data.

## 9. Data sourcing strategy (when no dataset given)
Priority order: (1) Kaggle API search matching problem keywords, (2) HuggingFace Datasets Hub search, (3) UCI ML Repository, (4) domain-specific open portals (data.gov, WHO, World Bank) if the problem is domain-specific, (5) as a last resort, LLM-synthesized data with realistic distributions **clearly labeled as synthetic** and never presented as real-world data. Every sourced dataset must return: name, source URL, license, and a one-paragraph fit rationale for user approval before use.

## 10. Success metrics
- Time from problem statement → first working leaderboard: target under 15 minutes for a mid-size tabular dataset (<1M rows).
- % of pipelines that complete without manual intervention: target >70% for well-specified problem statements.
- Reproducibility: 100% of completed runs must be replayable from their manifest.
- User trust proxy: rationale is present for every automated decision (target 100% coverage, this is a hard requirement not an aspiration).

## 11. Risks & mitigations
| Risk | Mitigation |
|---|---|
| LLM hallucinates a plausible-looking but wrong data source or column mapping | Every LLM output that affects data is validated by deterministic code before execution; human approval gate before training starts |
| Silent target leakage from auto-engineered features | Dedicated leakage-detection step in Profiling Agent (train/test distribution checks, correlation-with-target-post-split checks) |
| Runaway compute from unbounded model competition/tuning | Hard time/trial budgets per stage, degrade gracefully |
| Sandbox escape from agent-generated cleaning code | Run all generated code in a resource-limited, network-isolated subprocess |
| Non-reproducible runs | Mandatory run manifest (data hash + transform log + seeds) before a run is marked complete |

## 12. V1 scope cut
Tabular data only (classification + regression). No images/text/time-series in v1 — but the agent/stage interfaces should be designed so those are new "Feature Engineering Agent" plugins later, not architecture rewrites.

## 13. Open questions
- Where does the sandbox for agent-generated cleaning code run — local subprocess, or a lightweight container? (Leaning subprocess for v1, container if this becomes multi-user.)
- Do we need per-stage LLM model choice (cheap model for profiling summaries, stronger model for the intake/task-spec reasoning)?
- What's the fallback when no public dataset is a good fit and the problem is too narrow even for synthesis — do we surface that clearly and ask the user for data instead of forcing synthetic data?
