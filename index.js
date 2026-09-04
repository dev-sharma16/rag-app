import { config } from 'dotenv';
config();
import ai from './src/utils/ai.js';
import express  from "express";

// import cosineSimilarity from 'compute-cosine-similarity';
// import readline from 'readline';
// import { stdin, stdout } from 'process';

// // const rl = readline.createInterface({
// //   input: stdin,
// //   output: stdout,
// // });

// async function main() {

//   //! generating embedding from user response
//   rl.question('You : ', async (userInput) => {
//     const reponse = await ai.models.embedContent({
//       model: 'gemini-embedding-001',
//       contents: userInput,
//       config: { taskType: 'SEMANTIC_SIMILARITY' },
//     });

//     console.log("embedding generated : ", reponse.embeddings);

//   });

//   //! cosine similarty is the way to find similarity between tow diff texts 
//   // const texts = [
//   //   "What is the meaning of life?",
//   //   "What is the purpose of existence?",
//   //   "How do I bake a cake?"
//   // ];

//   // const reponse = await ai.models.embedContent({
//   //   model: "gemini-embedding-001",
//   //   contents: texts,
//   //   config: { taskType: 'SEMANTIC_SIMILARITY' }
//   // });

//   // const embeddings = reponse.embeddings.map(e => e.values);

//   // for (let i = 0; i < texts.length; i++) {
//   //       for (let j = i + 1; j < texts.length; j++) {
//   //           const text1 = texts[i];
//   //           const text2 = texts[j];
//   //           const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
//   //           console.log(`Similarity between '${text1}' and '${text2}': ${similarity.toFixed(4)}`);
//   //       }
//   //   }

//   // console.log(reponse.embeddings);
// }

// main();


const app = express();
const PORT = process.env.PORT;

app.listen(PORT, ()=>{
  console.log("Server is running on Port : ", PORT)
})


app.get("/", (req, res)=>{
  res.send("Server is running..! ")
} )