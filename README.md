# HealthWeave

**AI-powered Lifelong Personal Health Intelligence Platform**

> *"Your ChatGPT for personal healthcare memory"*

HealthWeave transforms fragmented medical records into a unified, AI-powered health intelligence system — helping people manage, understand, and predict their complete lifetime medical journey.

---

## What HealthWeave Does

| Problem | HealthWeave Solution |
|---------|---------------------|
| Fragmented records across hospitals | Unified lifelong health timeline |
| Scattered prescriptions | AI medicine intelligence engine |
| Can't compare reports across years | AI report comparison with trend charts |
| No preventive health awareness | Predictive risk indicators & alerts |
| Emergency with no medical info | QR-linked emergency health passport |
| Doctor visits without context | AI pre-consultation summary |
| Can't find patterns in own data | Medical correlation engine |

---

## Core Features

- **Lifelong Health Timeline** — Complete chronological view of your medical journey
- **AI Medical Correlation Engine** — Identifies patterns across years of health data
- **Medicine Intelligence** — Full medication history with interaction detection
- **AI Report Comparison** — Compares reports across years, explains changes simply
- **Preventive Health Prediction** — Risk indicators and preventive alerts
- **Family Health Graph** — Hereditary disease tracking and family risk analysis
- **Emergency Health Passport** — QR-based offline emergency medical profile
- **AI Doctor Summary** — Pre-consultation intelligence for faster doctor visits
- **Health Digital Twin** — Multi-dimensional health scoring system
- **Health Memory Chat** — Ask questions about your own medical history in plain language

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI (async) |
| AI/LLM | Claude (Anthropic) + OpenAI fallback |
| OCR | Claude Vision (multilingual) |
| Vector Search | pgvector (PostgreSQL) |
| Database | PostgreSQL 16 |
| Cache | Redis |
| Storage | S3 / MinIO |
| Frontend | React + TypeScript + Tailwind |
| Mobile | Flutter (planned) |
| Infrastructure | Docker + K8s |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Node.js 20+
- Anthropic API key

### Development Setup

```bash
# Clone and configure
git clone https://github.com/tridibgoswami/healthweave
cd healthweave
cp .env.example .env
# Fill in ANTHROPIC_API_KEY in .env

# Start infrastructure
docker compose -f infrastructure/docker/docker-compose.yml up -d db redis minio

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

**API Docs**: http://localhost:8000/docs
**Web App**: http://localhost:3000

### Production (Docker Compose)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

---

## Project Structure

```
HealthWeave/
├── backend/
│   └── app/
│       ├── api/v1/          # FastAPI route handlers
│       ├── core/            # Config, DB, Security
│       ├── models/          # SQLAlchemy ORM models
│       └── services/
│           ├── ai/          # LLM, RAG, Correlation, Prediction
│           ├── ocr/         # Document extraction pipeline
│           └── analytics/   # Timeline, scoring
├── frontend/
│   └── src/
│       ├── components/      # React UI components
│       ├── pages/           # Route-level pages
│       ├── services/        # API client
│       └── store/           # Zustand state
├── ai/
│   └── knowledge_graph/     # Medical knowledge graph
├── database/
│   └── migrations/          # SQL schema migrations
├── infrastructure/
│   ├── docker/              # Dockerfiles + compose
│   └── nginx/               # Reverse proxy config
└── docs/
    └── architecture/        # System design docs
```

---

## Medical Disclaimer

HealthWeave is not a medical device. It does not diagnose diseases, replace
professional medical advice, or prescribe medications. All AI-generated insights
are for informational and educational purposes only. Always consult a qualified
healthcare professional for medical decisions.

---

## License

Proprietary — HealthWeave © 2025. All rights reserved.
