import { config } from "dotenv";
config();

const AI_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT;
const DB_URL = process.env.DATABASE_URL;

export { AI_KEY, PORT, DB_URL };