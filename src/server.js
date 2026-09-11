import express from "express";
import { PORT } from "./config/env.js";
import { db } from "./db/connection.js";
import { txtToEmbed } from "./embeddings/embed.js";
import { chunkText } from "./chunking/chunkText.js"

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running..! ");
});

app.post("/embed", async (req, res) => {
    const text = req.body.text;

    const resp = await txtToEmbed(text);
    console.log("Full embedding response:", JSON.stringify(resp, null, 2));

    try {
        const embeddingVector = resp;
        
        if (!Array.isArray(embeddingVector) || embeddingVector.length === 0) {
            return res.status(400).json({
                error: "Invalid embedding response",
                resp: resp
            })
        }
        
        console.log("Embedding to save:", embeddingVector);
        
        const db_rep = await db`
            INSERT INTO chunks (content, embedding)
            VALUES (${text}, ${'[' + embeddingVector.join(',') + ']'})
            RETURNING id, created_at, embedding
        `;

        console.log("Saved to DB:", db_rep[0]);

        return res.status(200).json({
            response : resp,
            message : "Embedding is generated and saved..!",
            saved : db_rep[0]
        })
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            error : error.message
        })
    }
})

app.get("/chunks", async (req, res) => {
    try {
        const chunks = await db`SELECT id, content, embedding, metadata, created_at FROM chunks`;
        return res.status(200).json({
            data : chunks
        })
    } catch (error) {
        return res.status(500).json({
            error : error.message
        })
    }
})

// search for related results with configurable top-k 
app.post("/search", async (req, res) => {
    try {

        const query = req.body.q;
        const k = req.body?.k;
        const meta = req.body?.topic;
        // console.log(query)
    
        const queryEmbed = await txtToEmbed(query);

        const vector = `[${queryEmbed.join(",")}]`;

        let search;
        if (meta) {
            search = await db`SELECT 
            id,
            content,
            embedding <=> ${vector} AS distance
            FROM chunks
            WHERE metadata ->> 'topic' = ${meta}
            ORDER BY embedding <=> ${vector}
            LIMIT ${k || 3}
            `;
        } else {
            search = await db`SELECT 
            id,
            content,
            embedding <=> ${vector} AS distance
            FROM chunks
            ORDER BY embedding <=> ${vector}
            LIMIT ${k || 3}
            `;
        }

        return res.status(200).json({
            data: search
        })
    } catch (error) {
        return res.status(500).json({
            error: error.message
        })
    }
})

app.post("/chunking", (req,res) => {
    const text = req.body.text;
    const maxWords = req.body?.maxWords;
    const overlap = req.body?.overlap;

    const chunks = chunkText(text, maxWords, overlap);

    return res.status(200).json({
        response : chunks,
        messsage : "Chunks are generated"
    })
})

// final endpoint doc -> chunks -> embed -> save to db then use /search to search it
app.post("/ingest", async (req, res) => {
    try {
        const text = req.body.text;
        const maxWords = req.body?.maxWords || 50;
        const overlap = req.body?.overlap || 0;
        const topic = req.body?.topic || null;

        const chunks = chunkText(text, maxWords, overlap);

        const insertedChunks = [];

        for (const chunk of chunks) {

            const embeddingVector = await txtToEmbed(chunk);

            const meta = {
                topic: topic
            };

            const db_rep = await db`
                INSERT INTO chunks (content, metadata, embedding)
                VALUES (
                    ${chunk},
                    ${meta},
                    ${'[' + embeddingVector.join(',') + ']'}
                )
                RETURNING id, content, metadata, created_at
            `;

            insertedChunks.push(db_rep[0]);
        }

        return res.status(200).json({
            message: "Document ingested successfully",
            totalChunks: chunks.length,
            chunks: insertedChunks
        });

    } catch (error) {
        console.error("Ingestion error:", error);

        return res.status(500).json({
            error: error.message
        });
    }
});

// keyword search using postgres 'plainto_tsquery' 
app.post("/keyword-search", async (req, res) => {
    try {
        const query = req.body.q;

        const results = await db`
            SELECT
                id,
                content,
                ts_rank(
                    to_tsvector('english', content),
                    plainto_tsquery('english', ${query})
                ) AS score
            FROM chunks
            WHERE to_tsvector('english', content)
                @@ plainto_tsquery('english', ${query})
            ORDER BY score DESC
            LIMIT 5;
        `;

        return res.status(200).json({
            data: results
        });

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
});

app.post("/hybrid-search", async (req, res) => {
    try {
        
        const q = req.body.q;
        const k = req.body?.k || 3;
        const candidateLimit = 10;

        // --------------------------------
        // 1. Generate query embedding
        // --------------------------------

        const embedding = await txtToEmbed(q);

        const vectors = `[${embedding.join(",")}]`;

        // --------------------------------
        // 2. Semantic search
        // --------------------------------

        const semanticSearch = await db`SELECT 
            id,
            content,
            embedding <=> ${vectors} AS distance
            FROM chunks
            ORDER BY embedding <=> ${vectors}
            LIMIT ${candidateLimit || 3}
            `;

        // --------------------------------
        // 3. Keyword search
        // --------------------------------

        const keywordSearch = await db`
            SELECT
                id,
                content,
                ts_rank(
                    to_tsvector('english', content),
                    plainto_tsquery('english', ${q})
                ) AS score
            FROM chunks
            WHERE to_tsvector('english', content)
                @@ plainto_tsquery('english', ${q})
            ORDER BY score DESC
            LIMIT ${candidateLimit || 3};
        `;

        // console.log("Semantic : ", sematicSearch)
        // console.log("Keyword : ", keywordSearch)

        // --------------------------------
        // 4. Merge both result sets
        // --------------------------------

        const results = new Map();

        semanticSearch.forEach(item => {
            results.set(item.id, {
                id: item.id,
                content: item.content,
                distance: Number(item.distance),
                keywordScore: 0
            })
        })

        keywordSearch.forEach(item => {
            if(results.has(item.id)){
                results.get(item.id).keywordScore = Number(item.score);
            } else {
                results.set(item.id, {
                    id: item.id,
                    content: item.content,
                    distance: null,
                    keywordScore: Number(item.score)
                });
            }
        })

        // --------------------------------
        // 5. Normalize semantic scores
        // --------------------------------

        const semanticDistances = semanticSearch.map(
            item => Number(item.distance)
        );

        const minDistance = Math.min(...semanticDistances);
        const maxDistance = Math.max(...semanticDistances);


        // --------------------------------
        // 6. Normalize keyword scores
        // --------------------------------

        const keywordScores = keywordSearch.map(
            item => Number(item.score)
        );

        const maxKeywordScore =
            keywordScores.length > 0
                ? Math.max(...keywordScores)
                : 0;


        // --------------------------------
        // 7. Calculate final hybrid score
        // --------------------------------

        const finalResults = [...results.values()].map(item => {

            // Semantic relevance
            let semanticScore = 0;

            if (item.distance !== null) {

                if (maxDistance === minDistance) {
                    semanticScore = 1;
                } else {
                    semanticScore =
                        1 -
                        (
                            (item.distance - minDistance) /
                            (maxDistance - minDistance)
                        );
                }
            }


            // Keyword relevance
            let keywordRelevance = 0;

            if (item.keywordScore > 0 && maxKeywordScore > 0) {
                keywordRelevance =
                    item.keywordScore / maxKeywordScore;
            }


            // Combine both
            const hybridScore =
                (0.7 * semanticScore) +
                (0.3 * keywordRelevance);


            return {
                id: item.id,
                content: item.content,
                semanticScore,
                keywordScore: item.keywordScore,
                keywordRelevance,
                hybridScore
            };
        });


        // --------------------------------
        // 8. Sort by hybrid score
        // --------------------------------

        finalResults.sort(
            (a, b) => b.hybridScore - a.hybridScore
        );


        // --------------------------------
        // 9. Return top K
        // --------------------------------

        return res.status(200).json({
            query: q,
            results: finalResults.slice(0, k)
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
})
// app.post("/search/filter", (req, res) => {
//     try {
//         const 
//     } catch (error) {
//         return res.status(500).json({
//             error: error.message
//         })
//     }
// })

app.listen(PORT, () => {
    console.log("Server is running on Port : ", PORT);
})


