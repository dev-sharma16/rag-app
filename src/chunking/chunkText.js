
export const chunkText = (text, chunkSize = 100, overlap = 20) => {

  const words = text.split(/\s+/);

  const chunks = [];

  for(let i=0; i < words.length; i += chunkSize - overlap){

    const chunk = words.slice(i, i + chunkSize).join(" ");

    chunks.push(chunk);
  }

  return chunks;
}