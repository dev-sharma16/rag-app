import express from "express";
import { PORT } from "./config/env.js";
import { db } from "./db/connection.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running..! ");
});

app.listen(PORT, () => {
    console.log("Server is running on Port : ", PORT);
})


