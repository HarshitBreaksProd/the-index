// import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import { db } from "@repo/db";
import { cardChunks, chats, indexCards, indexes } from "@repo/db/schemas";
import { getEmbeddings } from "@repo/embedder";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { and, desc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";
import "dotenv/config";

// const genAi = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// export const geminiAi = {
//   generateContentStream: (contents: any) =>
//     genAi.models.generateContentStream({
//       model: "gemini-2.0-flash",
//       contents,
//     }),
// };

const openaiClient = new OpenAI();

export const openAi = {
  generateContentStream: async (content: string) => {
    return await openaiClient.responses.create({
      model: "gpt-4o-mini",
      input: content,
      stream: true,
    });
  },
};

type DbClient =
  | typeof db
  | PgTransaction<NodePgQueryResultHKT, any, ExtractTablesWithRelations<any>>;

export const fetchContextFromIndex: (
  chatId: string,
  message: string,
  tx: DbClient
) => Promise<{ context: string; cardsReferenced: string[] }> = async (
  chatId: string,
  message: string,
  tx: DbClient = db
) => {
  const [userQueryEmbedding] = await getEmbeddings([message]);
  const embeddingString = `[${userQueryEmbedding!.join(",")}]`;

  console.log(chatId);

  const similarity = sql<number>`1 - (${cardChunks.embedding} <=> ${sql.raw(
    `'${embeddingString}'::vector`
  )})`;

  console.log("Fetching relevantChunks");

  const relevantChunks = await tx
    .select({
      chunkText: cardChunks.chunkText,
      cardId: cardChunks.cardId,
      order: cardChunks.order,
      similarity,
    })
    .from(cardChunks)
    .innerJoin(indexCards, eq(cardChunks.cardId, indexCards.id))
    .innerJoin(indexes, eq(indexCards.indexId, indexes.id))
    .innerJoin(chats, eq(chats.indexId, indexes.id))
    .where(and(eq(chats.id, chatId), gt(similarity, 0.3)))
    .orderBy(desc(similarity))
    .limit(5);

  let cardsReferenced: string[] = [];

  if (relevantChunks.length === 0) {
    return {
      context: "",
      cardsReferenced,
    };
  }

  relevantChunks.map((chunks) => cardsReferenced.push(chunks.cardId));

  cardsReferenced = Array.from(new Set(cardsReferenced));

  const expandedChunks = await tx
    .select({
      chunkText: cardChunks.chunkText,
      cardId: cardChunks.cardId,
      order: cardChunks.order,
    })
    .from(cardChunks)
    .where(
      or(
        ...relevantChunks.map((chunk) =>
          and(
            eq(cardChunks.cardId, chunk.cardId),
            gte(cardChunks.order, chunk.order - 2),
            lte(cardChunks.order, chunk.order + 2)
          )
        )
      )
    )
    .orderBy(cardChunks.cardId, cardChunks.order);

  const groupedText =
    "[" + expandedChunks.map((c) => c.chunkText).join("]\n\n[") + "]";

  return {
    context: groupedText,
    cardsReferenced,
  };
};

export const populatePromptWithContextAndQuery = (
  context: string,
  query: string,
  prevChats?: string
) => {
  return `
You are an intelligent AI assistant in a RAG (Retrieval-Augmented Generation) application. Your goal is to answer the user's query accurately and clearly, helping them learn.

**Your Primary Instructions:**
1.  **Core Knowledge**: Rely heavily on the provided **CONTEXT** below. This is your primary source of truth.
2.  **Verification**: Briefly verify facts from the context against your general knowledge (or internet knowledge if available) to ensure accuracy. If the context seems outdated or factually incorrect, politely note the discrepancy, but prioritize the context if it refers to specific internal documents.
3.  **Completeness**: If the context is partial, use your general knowledge to fill in gaps seamlessly, but never contradict the provided context unless it is clearly an error.
4.  **Tone & Style**: Keep your language simple, straightforward, and easy to understand. Avoid jargon unless necessary (and explain it if used). Be helpful and educational.
5.  **Chat History**: If CHAT HISTORY is provided, treat it as ongoing conversation context to maintain continuity (e.g., resolving pronouns like "it" or "he").

**Format:**
- Answer directly.
- Use bullet points or short paragraphs for readability.
- If the context does not contain the answer at all, state that you don't have that specific information in the documents, then provide a general answer based on your knowledge.

--- 

=== RELEVANT CONTEXT START (from database) ===
${context}
=== RELEVANT CONTEXT END (from database) ===

=== CHAT HISTORY START ===
${prevChats ? prevChats : "No chat history"}
=== CHAT HISTORY END ===

=== USER QUERY START ===
${query}
=== USER QUERY END ===
`;
};
