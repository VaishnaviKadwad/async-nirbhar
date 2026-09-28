# Data Sources & Audit Disclosure

## Policy Corpus
- **Primary Pack:** `data/campus_sop.md`
- **Domain:** Campus Safety, Facility Hazards & Anti-Ragging Protocols
- **Status:** 100% Synthetic data created specifically for ASYNC'26 (Team Yallu).
- **Informed By:** Publicly accessible general safety principles (e.g., National Disaster Management Authority emergency guides, UGC Anti-Ragging regulations).
- **Privacy & Sensitivity:** No actual institutional records, personal student data, or confidential campus blueprints are copied, referenced, or included.

## Vector Index
- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (running strictly local via FAISS).
- **Storage:** Offline local vector index (`data/campus.index`), zero telemetry or third-party cloud API transmission.

## Factory Policy Pack
- **Pack File:** `data/factory_sop.md`
- **Domain:** Industrial Manufacturing, Chemical Handling, Boiler & Mechanical Safety
- **Status:** 100% Synthetic data created for ASYNC'26 (Team Yallu).
- **Informed By:** General industrial occupational safety principles (OSHA / Factory Act standards).
- **Privacy & Sensitivity:** No proprietary plant blueprints or confidential industrial data are included.