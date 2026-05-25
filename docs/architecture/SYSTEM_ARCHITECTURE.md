# HealthWeave – Complete System Architecture

## Platform Overview

HealthWeave is an AI-powered Personal Health Intelligence Platform that acts as a
lifelong health memory system — correlating, reasoning, and predicting over a
patient's complete medical journey.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                      │
│   ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│   │  React Web App  │  │  Flutter Mobile │  │  WhatsApp Bot (IN)   │   │
│   │  (Dashboard,    │  │  (iOS / Android)│  │  (Document intake)   │   │
│   │   Timeline, AI) │  │                 │  │                      │   │
│   └────────┬────────┘  └───────┬─────────┘  └──────────┬───────────┘   │
└────────────┼───────────────────┼────────────────────────┼───────────────┘
             │                   │                        │
             └───────────────────┼────────────────────────┘
                                 │  HTTPS / WSS
┌────────────────────────────────▼────────────────────────────────────────┐
│                         API GATEWAY / NGINX                              │
│              Rate limiting · Auth · TLS Termination                      │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                      BACKEND MICROSERVICES                               │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Auth Service│  │  Records API │  │  AI Chat API │  │Intelligence│  │
│  │  JWT + RBAC  │  │  Upload/OCR  │  │  RAG + LLM  │  │Scores/     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │Alerts/Corr │  │
│                                                          └────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Emergency API│  │  Family API  │  │  Doctor API  │                   │
│  │  QR Passport │  │  Health Graph│  │  Collab      │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                           AI INTELLIGENCE LAYER                          │
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │  LLM Orchestrator│  │   RAG Pipeline   │  │   OCR Pipeline       │   │
│  │  Claude primary  │  │   pgvector +     │  │   Claude Vision +    │   │
│  │  OpenAI fallback │  │   Full-text      │  │   PDF extraction     │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘   │
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ Correlation     │  │ Prediction Engine│  │ Knowledge Graph       │   │
│  │ Engine          │  │ Risk scoring     │  │ Medical ontology      │   │
│  │ Biomarker trends│  │ Preventive alerts│  │ ICD10/SNOMED/LOINC   │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                           DATA LAYER                                     │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL + pgvector│  │    Redis     │  │  S3 Object Storage   │  │
│  │  Primary store       │  │  Cache +     │  │  Encrypted documents │  │
│  │  Vector embeddings   │  │  Sessions    │  │  KMS key rotation    │  │
│  │  Full-text search    │  │              │  │                      │  │
│  └──────────────────────┘  └──────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## AI Architecture – The Reasoning Engine

```
Document Uploaded
       │
       ▼
┌─────────────────────┐
│   OCR Pipeline      │
│ • Claude Vision     │
│ • PDF parser        │
│ • Language detect   │
│ • Confidence score  │
└──────────┬──────────┘
           │ Structured extraction
           ▼
┌─────────────────────┐
│  Medical NLP Layer  │
│ • Biomarker norm    │
│ • ICD-10 tagging    │
│ • Medicine catalog  │
│ • LOINC mapping     │
└──────────┬──────────┘
           │ Normalized entities
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  Embedding Engine   │────▶│   pgvector DB    │
│  OpenAI ada-002     │     │  Semantic index  │
└──────────┬──────────┘     └──────────────────┘
           │
           ▼
┌─────────────────────┐
│  Timeline Builder   │
│ • Event creation    │
│ • Year grouping     │
│ • Milestone detect  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Correlation Engine  │
│ • Biomarker trends  │
│ • Medicine effects  │
│ • Disease progression│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Prediction Engine  │
│ • Health scores     │
│ • Risk alerts       │
│ • Doctor summary    │
└─────────────────────┘
```

---

## Database Schema Summary

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Authentication and identity |
| `user_profiles` | Demographics, chronic conditions, allergies |
| `health_records` | Core longitudinal medical events |
| `health_documents` | Raw files with OCR results |
| `biomarker_values` | Structured biomarker time series |
| `timeline_events` | Denormalized timeline projection |
| `medicine_entries` | Complete medication history |
| `family_members` | Family health graph nodes |
| `health_scores` | Multi-dimensional score history |
| `predictive_alerts` | AI-generated risk indicators |
| `correlation_findings` | Cross-domain medical patterns |
| `chat_sessions` / `chat_messages` | AI chat history |
| `emergency_passports` | QR-linked emergency profiles |
| `audit_logs` | HIPAA-inspired access log |

---

## Security Architecture

### HIPAA-Inspired Design
- **Encryption at rest**: AES-256 for database, S3 server-side encryption
- **Encryption in transit**: TLS 1.3 only
- **Key management**: AWS KMS / Vault for document encryption keys
- **Access control**: JWT + RBAC (patient/doctor/caregiver/admin)
- **Audit logging**: Every data access logged with IP and timestamp
- **Data minimization**: Emergency passport contains only critical fields
- **Token scopes**: Emergency tokens are read-only, time-limited
- **Password security**: bcrypt with 12 rounds
- **SQL injection**: SQLAlchemy parameterized queries throughout

---

## API Design

Base URL: `https://api.healthweave.in/api/v1`

### Endpoint Groups
| Prefix | Description |
|--------|-------------|
| `/auth` | Registration, login, token refresh |
| `/records` | Upload, list, get health documents |
| `/records/biomarkers/trends` | Biomarker time series |
| `/chat` | AI health memory conversations |
| `/intelligence/health-scores` | Health score history |
| `/intelligence/alerts` | Predictive health alerts |
| `/intelligence/correlations` | Medical correlation findings |
| `/intelligence/timeline` | Lifelong health timeline |
| `/intelligence/doctor-summary` | Pre-consultation AI summary |
| `/emergency/passport/{token}` | Public QR emergency access |
| `/family` | Family health graph |

---

## Scalability Design

### Horizontal Scaling
- **API**: Stateless FastAPI — scale with K8s HPA
- **Database**: PostgreSQL read replicas for analytics
- **Vector search**: pgvector scales to 100M+ vectors
- **Cache**: Redis Cluster for session/rate limiting
- **Storage**: S3-compatible — unlimited document scale

### Performance Optimizations
- **Async throughout**: asyncpg + FastAPI async endpoints
- **Connection pooling**: 20 base + 40 overflow per pod
- **Embedding caching**: Redis TTL for repeated queries
- **Background tasks**: OCR + AI processing never blocks API response
- **Pagination**: All list endpoints paginated

---

## India-Specific Features

1. **Multilingual OCR**: Support for 7 Indian languages
2. **Indian date formats**: DD/MM/YYYY, DD Mon YYYY normalization
3. **Indian biomarker aliases**: 40+ common lab report name variants
4. **Indian medicine catalog**: Brand/generic name mapping for Indian market
5. **Regional hospital names**: Fuzzy matching for hospital identification
6. **WhatsApp intake** (planned): Document upload via WhatsApp Business API
7. **Aadhaar integration** (planned): Patient identity verification
8. **ABDM integration** (planned): Health ID / PHR compliance

---

## AI Safety Guardrails

1. **No diagnosis**: System prompt enforces risk-indicator-only language
2. **Mandatory disclaimers**: Injected into every AI response
3. **Probabilistic language**: "may indicate", "risk factor for" — never "you have"
4. **Confidence thresholds**: Low-confidence findings are flagged, not hidden
5. **Doctor referral**: Every significant finding recommends professional consultation
6. **Data grounding**: All AI answers cite specific records — no hallucination
7. **Input validation**: Strict MIME type and file size limits
8. **Rate limiting**: AI endpoints protected at 30 req/min per user

---

## MVP Roadmap

### Phase 1 – Core Platform (Months 1-3)
- [ ] User registration and authentication
- [ ] Document upload with OCR extraction
- [ ] Basic health timeline
- [ ] Biomarker trend charts
- [ ] Emergency passport

### Phase 2 – AI Intelligence (Months 4-6)
- [ ] RAG-powered health chat
- [ ] Correlation engine
- [ ] Health score computation
- [ ] Predictive alerts
- [ ] Doctor summary generator

### Phase 3 – Social & Family (Months 7-9)
- [ ] Family health graph
- [ ] Caregiver access
- [ ] Hereditary risk analysis
- [ ] Report sharing

### Phase 4 – Scale & Integrations (Months 10-12)
- [ ] Wearable integrations (Fitbit, Apple Health, Google Fit)
- [ ] Lab API integrations (SRL, Thyrocare, Dr. Lal)
- [ ] Hospital EMR connectors
- [ ] Pharmacy integrations
- [ ] ABDM / Ayushman Bharat Digital Mission compliance

---

## Monetization Strategy

### B2C Tiers
| Plan | Price | Features |
|------|-------|---------|
| Free | ₹0 | 5 uploads/month, basic timeline |
| Personal | ₹199/month | Unlimited uploads, AI chat, scores |
| Family | ₹399/month | Up to 6 family members |
| Premium | ₹699/month | + Doctor sharing, advanced analytics |

### B2B Revenue
- **Clinic packages**: ₹2,000-5,000/month per doctor
- **Hospital enterprise**: Custom pricing for integration
- **Insurance data**: Anonymized population health analytics
- **API licensing**: White-label for healthcare networks

### India Market Opportunity
- 1.4B population, 70%+ no medical records digitized
- 300M+ smartphone users as primary compute
- Digital health market: $8.6B by 2025 (CAGR 27%)
- ABDM creating infrastructure for health data exchange

---

## Go-to-Market Strategy (India)

### Phase 1 – Viral Patient Acquisition
- WhatsApp sharing of health summaries and QR cards
- Regional language onboarding (Hindi, Tamil, Telugu)
- Partner with diagnostic chains (SRL, Thyrocare)
- Referral program: 1 month free for each referral

### Phase 2 – Doctor Network Effect
- Free doctor dashboard (builds patient stickiness)
- Integration with prescription platforms (PharmEasy, 1mg)
- Medical college partnerships for awareness

### Phase 3 – Institutional
- ABHA (Ayushman Bharat Health Account) integration
- State health department partnerships
- Corporate wellness programs

---

## Competitive Differentiation

| Feature | HealthWeave | Generic Health Apps | Hospital Portals |
|---------|------------|--------------------|--------------------|
| Lifelong timeline | ✅ | ❌ | Partial |
| Multi-hospital records | ✅ | ❌ | ❌ (one hospital) |
| AI correlation engine | ✅ | ❌ | ❌ |
| Handwritten OCR | ✅ | ❌ | ❌ |
| Predictive alerts | ✅ | Fitness only | ❌ |
| Emergency QR passport | ✅ | ❌ | ❌ |
| Family health graph | ✅ | Partial | ❌ |
| India-specific | ✅ | ❌ | ❌ |
| Multilingual | ✅ | ❌ | ❌ |

**Core moat**: Longitudinal AI reasoning over lifetime health data.
No competitor combines lifelong memory + AI correlation + India-specific intelligence.

---

*HealthWeave — Your AI-powered lifelong health intelligence companion.*

**Medical Disclaimer**: HealthWeave is not a medical device. It does not diagnose
diseases or replace professional medical advice. All AI outputs are for
informational and educational purposes only.
