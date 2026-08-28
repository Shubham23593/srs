# srs

# IntelliSDLC AI — Software Requirements Engineering Platform

An enterprise AI-powered Software Requirements Engineering platform adhering strictly to **ISO/IEC/IEEE 29148:2018** and **IEEE 830-1998** standards.

## 🚀 Key Capabilities

1. **9-Stage Controlled AI Requirements Elicitation**:
   - Structured sequential lifecycle with strict stage-gating and Context Guard.
   - Multilingual support (English, Hindi, Hinglish).
   - Real-time atomic requirement extraction (`FR-XXX`, `NFR-XXX`, `CON-XXX`, `ASM-XXX`, `INT-XXX`, `STK-XXX`).
2. **Quality & Ambiguity Audit**:
   - Heuristic non-verifiable words detection and semantic conflict analysis.
   - Vector-based Cosine Similarity deduplication (`BAAI/bge-small-en-v1.5`).
3. **ISO/IEC/IEEE 29148 Verification**:
   - Completeness, consistency, singularity, and testability scoring.
4. **Exact-Template SRS Generation & Export**:
   - IEEE Sections 1–6 and Appendices A, B, and C with PDF/DOCX generation.
5. **Traceability & Continuous Change Control**:
   - 5-Tier bidirectional traceability matrix.
   - Semantic diff viewer for continuous versioning (v1.0 → v1.1).

## 🛠️ Tech Stack
- **Frontend**: Next.js (App Router), Vanilla CSS, Lucide Icons
- **Backend**: Express.js, MongoDB (Mongoose), Ollama AI Provider (CodeLlama / Gemma)
- **Embeddings**: 384-dimensional vector embeddings with cosine similarity

## 🏁 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
