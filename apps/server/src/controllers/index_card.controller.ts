import { db } from "@repo/db";
import { cardChunks, indexCards, indexes } from "@repo/db/schemas";
import {
  changeIndexCardVisibilitySchema,
  copyIndexCardSchema,
  createIndexCardSchema,
  editIndexCardSchema,
  retryCardProcessingSchema,
} from "@repo/zod-schema";
import { Request, Response } from "express";
import { expressRedisClient } from "..";
import { eq } from "drizzle-orm";

const STREAM_NAME = "card_created";

export const getSharedIndexCardController = async (
  req: Request,
  res: Response
) => {
  try {
    const { shareableId } = req.params;

    if (!shareableId) {
      res.status(422).json({
        message: "Shareable id for index card not provided",
        success: true,
      });
      return;
    }

    const foundCard = await db
      .select()
      .from(indexCards)
      .where(eq(indexCards.shareableId, shareableId));

    if (!foundCard[0]) {
      res.status(404).json({
        message: "Index card not found",
        success: false,
      });
      return;
    }

    if (!foundCard[0].isPublic) {
      res.status(403).json({
        message: "Index card is not public",
        success: false,
      });
      return;
    }

    res.json({
      message: "Index card fetched successfully",
      card: foundCard[0],
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: true,
    });
  }
};

export const createIndexCardController = async (
  req: Request,
  res: Response
) => {
  try {
    const inputs = createIndexCardSchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(400).json({
        message: "Invalid Inputs",
        error: inputs.error,
        success: false,
      });
      return;
    }

    const indexId = req.params.indexId;

    if (!indexId) {
      res.status(404).json({
        message: "Index Id not provided in the route",
        success: false,
      });
      return;
    }

    const result = await db
      .insert(indexCards)
      .values({
        title:
          inputs.data.title ||
          `inputs.data.type-${crypto.randomUUID().slice(0, 6)}`,
        description: inputs.data.description || "",
        indexId: indexId,
        type: inputs.data.type,
        source: inputs.data.source,
      })
      .returning();

    await expressRedisClient.xAdd(STREAM_NAME, "*", {
      card_id: result[0]!.id,
      card_type: result[0]!.type,
    });

    console.log(`Pushed to redis`);

    res.json({
      message: "Index Card created successfully",
      indexId: result[0]!.id,
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      err,
      success: false,
    });
  }
};

export const editIndexCardController = async (req: Request, res: Response) => {
  try {
    const inputs = editIndexCardSchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(422).json({
        message: "Invalid inputs to edit index card",
        success: false,
      });
      return;
    }

    const cardToCheck = await db
      .select()
      .from(indexCards)
      .innerJoin(indexes, eq(indexCards.indexId, indexes.id))
      .where(eq(indexCards.id, inputs.data.id));

    if (!cardToCheck[0] || !cardToCheck[0].index_cards) {
      res.status(404).json({
        message: "Index card does not exists",
        success: false,
      });
      return;
    }

    if (
      cardToCheck[0].indexes.userId !==
      (req as unknown as { userId: string }).userId
    ) {
      res.status(403).json({
        message: "Index card does not belong to the user",
        success: false,
      });
      return;
    }

    await db.transaction(async (tx) => {
      let sourceOrTypeChanged: boolean = false;

      if (
        inputs.data.source !== cardToCheck[0]!.index_cards.source ||
        inputs.data.type !== cardToCheck[0]!.index_cards.type
      ) {
        sourceOrTypeChanged = true;
        await tx
          .delete(cardChunks)
          .where(eq(cardChunks.cardId, inputs.data.id));
      }

      await tx
        .update(indexCards)
        .set({
          title: inputs.data.title,
          description: inputs.data.description,
          type: inputs.data.type,
          source: inputs.data.source,
          processedContent: sourceOrTypeChanged
            ? ""
            : cardToCheck[0]!.index_cards.processedContent,
        })
        .where(eq(indexCards.id, inputs.data.id));
    });

    res.json({
      message: "Index card updated successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      err,
      success: false,
    });
  }
};

export const deleteIndexCardController = async (
  req: Request,
  res: Response
) => {
  try {
    const { cardId } = req.params;

    if (!cardId) {
      res.status(422).json({
        message: "Card id not found",
        success: false,
      });
      return;
    }

    const cardToCheck = await db
      .select()
      .from(indexCards)
      .innerJoin(indexes, eq(indexes.id, indexCards.indexId))
      .where(eq(indexCards.id, cardId));

    if (!cardToCheck[0] || !cardToCheck[0].index_cards) {
      res.status(404).json({
        message: "Index card does not exists",
        success: false,
      });
      return;
    }

    if (
      cardToCheck[0].indexes.userId !==
      (req as unknown as { userId: string }).userId
    ) {
      res.status(403).json({
        message: "Index card does not belong to the user",
        success: false,
      });
      return;
    }

    await db.delete(indexCards).where(eq(indexCards.id, cardId));

    res.json({
      message: "Index Card deleted successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};

export const changeIndexCardVisibilityController = async (
  req: Request,
  res: Response
) => {
  try {
    const input = changeIndexCardVisibilitySchema.safeParse(req.body);

    if (!input.success) {
      res.status(422).json({
        message: "Invalid inputs",
        success: false,
      });
      return;
    }

    const cardToCheck = await db
      .select()
      .from(indexCards)
      .innerJoin(indexes, eq(indexCards.indexId, indexes.id))
      .where(eq(indexCards.id, input.data.id));

    if (!cardToCheck[0] || !cardToCheck[0].index_cards) {
      res.status(404).json({
        message: "Index card does not exists",
        success: false,
      });
      return;
    }

    if (
      cardToCheck[0].indexes.userId !==
      (req as unknown as { userId: string }).userId
    ) {
      res.status(403).json({
        message: "Index card does not belong to the user",
        success: false,
      });
      return;
    }

    await db
      .update(indexCards)
      .set({
        isPublic: input.data.isPublic,
      })
      .where(eq(indexCards.id, input.data.id));

    res.json({
      message: "Index Card visibility changes successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};

export const copyIndexCardController = async (req: Request, res: Response) => {
  try {
    const inputs = copyIndexCardSchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(422).json({
        message: "Inputs are invalid",
        success: false,
      });
      return;
    }

    const sourceData = await db
      .select()
      .from(indexCards)
      .innerJoin(cardChunks, eq(cardChunks.cardId, indexCards.id))
      .where(eq(indexCards.id, inputs.data.id));

    if (!sourceData[0] || !sourceData[0].index_cards) {
      res.status(404).json({
        message: "Index card does not exists",
        success: false,
      });
      return;
    }

    if (!sourceData[0].index_cards.isPublic) {
      res.status(403).json({
        message: "Index card is not public",
        success: false,
      });
      return;
    }

    await db.transaction(async (tx) => {
      let sourceCard = sourceData[0]!.index_cards;

      const newCard = await tx
        .insert(indexCards)
        .values({
          title: sourceCard.title,
          description: sourceCard.description,
          indexId: inputs.data.indexId,
          type: sourceCard.type,
          isPublic: false,
          source: sourceCard.source,
          processedContent: sourceCard.processedContent,
          status: sourceCard.status,
        })
        .returning();

      const chunksToInsert = sourceData
        .map((row) => row.card_chunks)
        .filter((chunk) => chunk !== null);

      if (chunksToInsert.length > 0 && newCard) {
        await tx.insert(cardChunks).values(
          chunksToInsert.map((chunk) => ({
            cardId: newCard[0]!.id,
            chunkText: chunk.chunkText,
            embedding: chunk.embedding,
            order: chunk.order,
          }))
        );
      }
    });

    res.json({
      message: "Index card copied successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};

export const retryCardProcessingController = async (
  req: Request,
  res: Response
) => {
  try {
    const input = retryCardProcessingSchema.safeParse(req.body);

    if (!input.success) {
      res.status(422).json({
        message: "Invalid inputs",
        success: false,
      });
      return;
    }

    const cardToCheck = await db
      .select()
      .from(indexCards)
      .innerJoin(indexes, eq(indexCards.indexId, indexes.id))
      .where(eq(indexCards.id, input.data.id));

    if (!cardToCheck[0] || !cardToCheck[0].index_cards) {
      res.status(404).json({
        message: "Index card does not exists",
        success: false,
      });
      return;
    }

    if (
      cardToCheck[0].indexes.userId !==
      (req as unknown as { userId: string }).userId
    ) {
      res.status(403).json({
        message: "Index card does not belong to the user",
        success: false,
      });
      return;
    }

    if (cardToCheck[0].index_cards.status !== "failed") {
      res.status(401).json({
        message: "Index card status is not failed",
        success: false,
      });
      return;
    }

    const isRateLimited = await expressRedisClient.get(
      cardToCheck[0].index_cards.id
    );

    if (isRateLimited) {
      res.status(429).json({
        message: "Too many requests, try after 5 minutes",
        success: false,
      });
      return;
    }

    await expressRedisClient.xAdd(STREAM_NAME, "*", {
      card_id: cardToCheck[0].index_cards.id,
      card_type: cardToCheck[0].index_cards.type,
    });

    await expressRedisClient.set(cardToCheck[0].index_cards.id, Date.now(), {
      expiration: { type: "EX", value: 300 },
    });

    res.json({
      message: "Index card processing started",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faces some internal server error",
      success: false,
    });
  }
};
