import express from "express";
import { PORT } from "./config/env.js";
import { db } from "./db/connection.js";
import { txtToEmbed } from "./embeddings/embed.js";

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


