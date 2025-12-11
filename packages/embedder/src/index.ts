import { DataArray, pipeline } from "@xenova/transformers";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const getEmbeddings = async (textChunks: string[]) => {
  try {
    const extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    const embeddings: DataArray[] = [];

    const embeddingPromises = textChunks.map(async (chunk: string) => {
      const output = await extractor(chunk, {
        pooling: "mean",
        normalize: true,
      });
      return output.data;
    });

    const results = await Promise.all(embeddingPromises);
    embeddings.push(...results);

    return embeddings;
  } catch (err) {
    throw { errorMessage: "Embedder did not work properly" };
  }
};

export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
});
