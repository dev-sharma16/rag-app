import { CohereClientV2 } from "cohere-ai";
import { RERANK_KEY } from "../config/env.js";

const cohere = new CohereClientV2({
    token: RERANK_KEY
});

export const rerank = async (query, documents) => {

    const response = await cohere.rerank({
        model: "rerank-v4.0-fast",
        query,
        documents,
        topN: documents.length
    });

    return response.results;
};