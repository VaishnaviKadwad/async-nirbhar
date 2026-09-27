from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle
from rag.ingest import parse_sop

model = SentenceTransformer("all-MiniLM-L6-v2")

def build_index(pack_path="data/campus_sop.md", pack_name="campus"):
    sections = parse_sop(pack_path, pack_name)
    texts = [s["text"] for s in sections]
    embeddings = model.encode(texts, convert_to_numpy=True)

    index = faiss.IndexFlatIP(embeddings.shape[1])  # cosine via normalized vectors
    faiss.normalize_L2(embeddings)
    index.add(embeddings)

    faiss.write_index(index, f"data/{pack_name}.index")
    with open(f"data/{pack_name}_meta.pkl", "wb") as f:
        pickle.dump(sections, f)

    print(f"Indexed {len(sections)} sections for {pack_name}")

if __name__ == "__main__":
    build_index()