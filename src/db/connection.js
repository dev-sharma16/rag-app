import { DB_URL } from "../config/env.js";
import { neon } from "@neondatabase/serverless";

export const db = 
    neon(DB_URL);



