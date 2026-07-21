import os
import math
import numpy as np

# Try importing chromadb
try:
    import chromadb
except ImportError:
    chromadb = None

class SimpleVectorStore:
    """Fallback pure-python vector store using cosine similarity."""
    def __init__(self):
        self.documents = []
        self.embeddings = []
        self.metadatas = []
        self.ids = []

    def add(self, ids, embeddings, metadatas, documents):
        for i, emb, meta, doc in zip(ids, embeddings, metadatas, documents):
            self.ids.append(i)
            self.embeddings.append(emb)
            self.metadatas.append(meta)
            self.documents.append(doc)

    def query(self, query_embeddings, n_results=3):
        results = []
        q_emb = query_embeddings[0]
        
        # Calculate cosine similarities
        scores = []
        for emb in self.embeddings:
            dot_product = sum(a * b for a, b in zip(q_emb, emb))
            norm_a = math.sqrt(sum(a * a for a in q_emb))
            norm_b = math.sqrt(sum(b * b for b in emb))
            similarity = dot_product / (norm_a * norm_b) if norm_a and norm_b else 0.0
            scores.append(similarity)
            
        # Sort indices by highest score
        sorted_indices = sorted(range(len(scores)), key=lambda k: scores[k], reverse=True)[:n_results]
        
        docs = [self.documents[idx] for idx in sorted_indices]
        metas = [self.metadatas[idx] for idx in sorted_indices]
        dist = [1.0 - scores[idx] for idx in sorted_indices] # distance = 1 - similarity
        
        return {
            'documents': [docs],
            'metadatas': [metas],
            'distances': [dist]
        }

class RepositoryIndex:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.simple_store = SimpleVectorStore()
        
        if chromadb:
            try:
                self.chroma_client = chromadb.Client()
                self.collection = self.chroma_client.get_or_create_collection("repo_code")
            except Exception as e:
                print(f"Failed to load ChromaDB, falling back to simple vector store: {e}")

    def generate_mock_embedding(self, text: str):
        # Deterministic float vector for RAG demonstration fallback
        np.random.seed(sum(ord(c) for c in text) % 2**32)
        vec = np.random.randn(128)
        norm = np.linalg.norm(vec)
        vec = vec / norm if norm else vec
        return vec.tolist()

    def index_code(self, file_path: str, code: str):
        # Split code into logical chunks of 20 lines each
        lines = code.split('\n')
        chunk_size = 20
        overlap = 5
        
        chunks = []
        for i in range(0, len(lines), chunk_size - overlap):
            chunk_lines = lines[i:i + chunk_size]
            if not chunk_lines:
                break
            chunks.append("\n".join(chunk_lines))
            if i + chunk_size >= len(lines):
                break
                
        ids = [f"{file_path}_chunk_{idx}" for idx in range(len(chunks))]
        metadatas = [{'file_path': file_path, 'chunk_index': idx} for idx in range(len(chunks))]
        embeddings = [self.generate_mock_embedding(chunk) for chunk in chunks]
        
        if self.collection:
            try:
                self.collection.add(
                    documents=chunks,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    ids=ids
                )
            except Exception:
                self.simple_store.add(ids, embeddings, metadatas, chunks)
        else:
            self.simple_store.add(ids, embeddings, metadatas, chunks)

    def search(self, query: str, limit: int = 3):
        q_emb = [self.generate_mock_embedding(query)]
        if self.collection:
            try:
                results = self.collection.query(
                    query_embeddings=q_emb,
                    n_results=limit
                )
                return results
            except Exception:
                return self.simple_store.query(q_emb, limit)
        return self.simple_store.query(q_emb, limit)
