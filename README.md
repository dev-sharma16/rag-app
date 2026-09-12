# RAG App

A practical **Retrieval-Augmented Generation (RAG) learning project** built from scratch using JavaScript, Express, PostgreSQL, pgvector, Gemini Embeddings, and Cohere Reranking.

The goal of this project is to understand how a modern RAG retrieval pipeline works internally without relying on frameworks such as LangChain or LlamaIndex.

---

## 🚀 RAG Pipeline

The project implements the following retrieval pipeline:

```text
                    Document
                       │
                       ▼
                  Chunking
                       │
                       ▼
              Gemini Embeddings
                       │
                       ▼
              PostgreSQL + pgvector
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
      Semantic Search       Keyword Search
        (pgvector)        (PostgreSQL FTS)
             │                   │
             └─────────┬─────────┘
                       ▼
                  Hybrid Search
                       │
                       ▼
                   Reranking
                  (Cohere AI)
                       │
                       ▼
                    Top-K
                    Results
```

---

## ✨ Features

* Text embeddings using Gemini
* Vector storage using PostgreSQL + pgvector
* Semantic similarity search
* Configurable Top-K retrieval
* Metadata filtering using JSONB
* Text chunking
* Chunk overlap
* PostgreSQL full-text keyword search
* Hybrid semantic + keyword search
* Score normalization
* Candidate merging
* Cohere reranking
* Document ingestion pipeline
* REST API endpoints for testing the complete pipeline

---

## 🛠️ Tech Stack

* **JavaScript**
* **Node.js**
* **Express**
* **PostgreSQL**
* **Neon PostgreSQL**
* **pgvector**
* **Gemini Embeddings**
* **Cohere Rerank**
* **dotenv**

---

## 📁 Project Structure

```text
rag-app/
│
├── src/
│   ├── chunking/
│   │   └── chunkText.js
│   │
│   ├── config/
│   │   └── env.js
│   │
│   ├── db/
│   │   └── connection.js
│   │
│   ├── embeddings/
│   │   └── embed.js
│   │
│   ├── reranking/
│   │   └── rerank.js
│   │
│   ├── utils/
│   │   └── ai.js
│   │
│   └── server.js
│
├── .env
├── package.json
└── README.md
```

---

# 🧠 Concepts Implemented

## 1. Embeddings

Text is converted into numerical vectors using the Gemini embedding model.

```text
Text
 ↓
Gemini Embedding Model
 ↓
Vector
```

The project currently generates **64-dimensional embeddings**.

Example:

```js
const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
        outputDimensionality: 64,
    },
});
```

The resulting vector is stored in PostgreSQL using pgvector.

---

## 2. Vector Database

PostgreSQL is used as the database and `pgvector` provides vector storage and similarity operations.

The main table contains:

```text
chunks
├── id
├── content
├── metadata
├── embedding
└── created_at
```

The embedding column uses:

```sql
VECTOR(64)
```

Example schema:

```sql
CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    embedding VECTOR(64)
);
```

---

## 3. Semantic Search

Semantic search converts the user's query into an embedding and compares it with stored embeddings.

The project uses cosine distance:

```sql
embedding <=> query_vector
```

Lower distance means greater semantic similarity.

The results are ordered by:

```sql
ORDER BY embedding <=> query_vector
```

and limited using Top-K:

```sql
LIMIT 3
```

---

## 4. Metadata Filtering

Chunks can contain metadata such as:

```json
{
    "topic": "postgresql"
}
```

The search endpoint can filter results based on metadata:

```sql
WHERE metadata ->> 'topic' = 'postgresql'
```

This allows semantic search to be combined with structured filtering.

Example:

```json
{
    "q": "Should I learn postgres?",
    "k": 3,
    "topic": "postgresql"
}
```

---

# ✂️ Chunking

Large documents are divided into smaller chunks before embedding.

The project supports:

* Paragraph-aware chunking
* Sentence-aware chunking
* Maximum word limits
* Chunk overlap
* Handling sentences larger than the maximum chunk size

Example:

```js
chunkText(text, 50, 10);
```

Where:

```text
50 → maximum words per chunk
10 → overlap between chunks when needed
```

The basic idea is:

```text
Document
   ↓
Paragraphs
   ↓
Sentences
   ↓
Word limits
   ↓
Chunks
```

Chunking improves retrieval because the embedding represents a smaller and more focused piece of information instead of an entire document.

---

# 📥 Document Ingestion

The `/ingest` endpoint combines the main ingestion steps.

```text
Document
   ↓
Chunk
   ↓
Generate Embedding
   ↓
Attach Metadata
   ↓
Store in PostgreSQL
```

Example request:

```http
POST /ingest
```

```json
{
    "text": "Your document content here...",
    "maxWords": 50,
    "overlap": 10,
    "topic": "javascript"
}
```

The endpoint returns the number of generated and inserted chunks.

---

# 🔎 Retrieval

## Semantic Search

Endpoint:

```http
POST /search
```

Request:

```json
{
    "q": "How does JavaScript handle asynchronous operations?",
    "k": 3
}
```

Optional metadata filtering:

```json
{
    "q": "Should I learn postgres?",
    "k": 3,
    "topic": "postgresql"
}
```

---

# 🔤 Keyword Search

The project also implements PostgreSQL Full-Text Search.

Endpoint:

```http
POST /keyword-search
```

Request:

```json
{
    "q": "PostgreSQL database"
}
```

It uses:

```sql
to_tsvector()
```

and:

```sql
plainto_tsquery()
```

The relevance of each result is calculated using:

```sql
ts_rank()
```

This allows the system to find exact or strongly related keywords that semantic search might not prioritize.

---

# 🔀 Hybrid Search

Semantic search and keyword search have different strengths.

### Semantic Search

Good for:

```text
"How does JS handle async work?"
```

when the document contains:

```text
"The event loop allows JavaScript to handle asynchronous operations..."
```

Even if the exact wording is different.

### Keyword Search

Useful when exact terminology matters.

For example:

```text
"pgvector"
"plainto_tsquery"
"PostgreSQL"
```

---

## Hybrid Pipeline

The `/hybrid-search` endpoint combines both approaches.

```text
                Query
                  │
                  ▼
          Generate Embedding
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 Semantic Search       Keyword Search
        │                   │
        └─────────┬─────────┘
                  ▼
              Merge Results
                  │
                  ▼
          Normalize Scores
                  │
                  ▼
          Calculate Hybrid Score
                  │
                  ▼
             Sort Results
                  │
                  ▼
             Top Candidates
                  │
                  ▼
              Cohere Rerank
                  │
                  ▼
              Final Top-K
```

---

## Hybrid Scoring

Semantic distance and keyword score cannot be directly combined because they use different scales and directions.

The project first converts semantic distance into a relevance score.

```text
Lower distance
      ↓
Higher semantic relevance
```

Then keyword scores are normalized relative to the highest keyword score.

The final hybrid score is:

```text
Hybrid Score =
    0.7 × Semantic Score
  + 0.3 × Keyword Relevance
```

This gives semantic search more importance while still benefiting from keyword matching.

---

# 🎯 Reranking

After hybrid retrieval, the system sends the best candidates to Cohere's reranking model.

The reranker receives:

```text
Query
+
Candidate Documents
```

and returns the candidates ordered by their relevance to the query.

Example:

```text
Hybrid Retrieval
       ↓
Top 10 Candidates
       ↓
Cohere Reranker
       ↓
Reordered Candidates
       ↓
Final Top-K
```

The reranker can correct cases where the initial hybrid ranking is not ideal.

For example, a candidate may receive a high hybrid score because of keyword or semantic similarity but not actually answer the user's question very well.

---

# 🧪 Example

Query:

```text
How does JavaScript handle asynchronous operations?
```

A relevant result might be:

```text
The event loop allows JavaScript to handle asynchronous operations
while using a single main thread for JavaScript execution...
```

The system can identify this result through semantic similarity and then the reranker can further confirm that it is highly relevant to the query.

---

# 📡 API Endpoints

| Method | Endpoint          | Purpose                         |
| ------ | ----------------- | ------------------------------- |
| GET    | `/`               | Check if server is running      |
| POST   | `/embed`          | Generate and store an embedding |
| GET    | `/chunks`         | Retrieve stored chunks          |
| POST   | `/search`         | Semantic vector search          |
| POST   | `/chunking`       | Test text chunking              |
| POST   | `/ingest`         | Chunk → Embed → Store           |
| POST   | `/keyword-search` | PostgreSQL keyword search       |
| POST   | `/hybrid-search`  | Hybrid search + reranking       |
| POST   | `/reranking`      | Test Cohere reranking           |

---

# ⚙️ Setup

## 1. Clone the repository

```bash
git clone git@github.com:dev-sharma16/rag-app.git

cd rag-app
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a `.env` file:

```env
PORT=3000

DB_URL=your_neon_database_url

GEMINI_API_KEY=your_gemini_api_key

COHERE_API_KEY=your_cohere_api_key
```

---

## 4. Configure PostgreSQL

Make sure `pgvector` is enabled.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Create the chunks table:

```sql
CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    embedding VECTOR(64)
);
```

---

## 5. Start the server

```bash
npm run dev
```

or:

```bash
npm start
```

depending on the scripts configured in `package.json`.

The server should be available at:

```text
http://localhost:3000
```

---

# 🔬 Testing the Pipeline

### Step 1 — Ingest a document

```http
POST /ingest
```

```json
{
    "text": "JavaScript uses promises and async await for asynchronous programming...",
    "maxWords": 50,
    "overlap": 10,
    "topic": "javascript"
}
```

### Step 2 — Perform semantic search

```http
POST /search
```

```json
{
    "q": "How does JavaScript handle asynchronous operations?",
    "k": 3
}
```

### Step 3 — Test keyword search

```http
POST /keyword-search
```

```json
{
    "q": "JavaScript asynchronous"
}
```

### Step 4 — Test hybrid search

```http
POST /hybrid-search
```

```json
{
    "q": "How does JavaScript handle asynchronous operations?",
    "k": 3
}
```

The final endpoint performs:

```text
Semantic Search
      +
Keyword Search
      ↓
Hybrid Ranking
      ↓
Cohere Reranking
      ↓
Final Results
```

---

# 📚 What I Learned

This project was built to understand the internals of RAG rather than simply using a RAG framework.

### Embeddings

* What embeddings represent
* Semantic similarity
* Cosine similarity/distance
* Query embeddings vs document embeddings

### Vector Databases

* Why normal SQL search is not enough for semantic retrieval
* pgvector
* Vector columns
* Vector similarity queries
* Top-K retrieval

### Chunking

* Why documents need to be chunked
* Paragraph and sentence boundaries
* Maximum chunk size
* Chunk overlap

### Retrieval

* Semantic retrieval
* Metadata filtering
* Top-K candidates

### Hybrid Search

* PostgreSQL Full-Text Search
* Semantic + keyword retrieval
* Score normalization
* Combining multiple retrieval signals

### Reranking

* Why retrieval and reranking are separate stages
* Candidate generation
* Reranking candidate documents
* Using a cross-encoder-style reranker through Cohere

### Complete RAG Retrieval Pipeline

The main concept learned from this project:

```text
Raw Documents
      ↓
Chunking
      ↓
Embeddings
      ↓
Vector Database
      ↓
Retrieval
      ↓
Metadata Filtering
      ↓
Keyword Search
      ↓
Hybrid Ranking
      ↓
Reranking
      ↓
Top-K Context
```

This represents the **retrieval side of a RAG system**.

---

# 🚧 Future Improvements

Possible improvements for a production-oriented version:

* Better chunking strategies
* Document/source IDs
* More detailed metadata
* Vector indexes for larger datasets
* PostgreSQL GIN index for full-text search
* Better hybrid ranking algorithms
* Reciprocal Rank Fusion (RRF)
* Improved error handling
* Batch embedding generation
* Parallel ingestion
* Duplicate document detection
* Retrieval evaluation datasets
* RAG answer generation using retrieved context
* Streaming final answers from an LLM
* Authentication and API validation

---

## 📌 Project Status

**Phase 2 — RAG: Completed ✅**

Implemented:

```text
Embeddings              ✅
Vector Database         ✅
Chunking                ✅
Retrieval               ✅
Metadata Filtering      ✅
Hybrid Search           ✅
Reranking               ✅
RAG Evaluation          ✅
```

The next stage is to build on top of this retrieval foundation with **LLM-powered agents, tool calling, and agentic workflows**.
