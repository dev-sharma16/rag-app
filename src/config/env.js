import { config } from "dotenv";
config();

const AI_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT;
const DB_URL = process.env.DATABASE_URL;
const RERANK_KEY = process.env.COHERE_API_KEY;

export { AI_KEY, PORT, DB_URL, RERANK_KEY };