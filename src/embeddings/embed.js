import ai from '../utils/ai.js';

export const txtToEmbed = async (userText) => {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: userText,
    config: {
      outputDimensionality: 64,
    },
  });

  return response.embeddings[0].values;
};
