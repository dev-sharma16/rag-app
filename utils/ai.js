import { config } from "dotenv";
config();
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if(!apiKey){ 
  console.log("No valid api key");
}

const ai = new GoogleGenAI({ apiKey });

export default ai;