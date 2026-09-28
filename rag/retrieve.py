import faiss
import pickle
import numpy as np
from threading import Lock

THRESHOLD = 0.45  # Rule 2: Gating threshold to prevent hallucinations
_model = None
_model_lock = Lock()


def _get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def retrieve_sop(query: str, pack_name: str = "campus", top_k: int = 1):
    index = faiss.read_index(f"data/{pack_name}.index")
    with open(f"data/{pack_name}_meta.pkl", "rb") as f:
        sections = pickle.load(f)

    q_emb = _get_model().encode([query], convert_to_numpy=True)
    faiss.normalize_L2(q_emb)
    scores, idxs = index.search(q_emb, top_k)

    # Core Rule 2: Fallback to review_required, never invent citations
    if scores[0][0] < THRESHOLD:
        return {"status": "review_required", "match": None, "score": float(scores[0][0])}

    match = sections[idxs[0][0]]
    return {
        "status": "matched",
        "match": {"id": match["id"], "title": match["title"], "text": match["text"]},
        "score": float(scores[0][0])
    }

if __name__ == "__main__":
    test_query = "smoke near Block C electrical room"
    result = retrieve_sop(test_query)
    print("Fixture Query:", test_query)
    print("Result:", result)
