import { db } from "@repo/db";
import { indexCards, indexes } from "@repo/db/schemas";
import {
  changeIndexVisibilitySchema,
  createIndexSchema,
  editIndexSchema,
} from "@repo/zod-schema";
import { and, eq } from "drizzle-orm";
import { Response, Request } from "express";

export const getAllIndexesController = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(indexes)
      .where(eq(indexes.userId, (req as unknown as { userId: string }).userId));

    res.json({
      message: "All user index fetched",
      indexes: result,
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

export const createIndexController = async (req: Request, res: Response) => {
  try {
    const inputs = createIndexSchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(400).json({
        message: "Invalid Inputs",
        error: inputs.error,
        success: false,
      });
      return;
    }

    const result = await db
      .insert(indexes)
      .values({
        title: inputs.data.title,
        description: inputs.data.description || "",
        coverImageUrl: inputs.data.coverImageUrl,
        userId: (req as unknown as { userId: string }).userId,
      })
      .returning();

    res.json({
      message: "Index created successfully",
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

export const editIndexController = async (req: Request, res: Response) => {
  try {
    const inputs = editIndexSchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(422).json({
        message: "The inputs are incorrect",
        success: false,
      });
      return;
    }

    const result = await db
      .update(indexes)
      .set({
        title: inputs.data.title,
        description: inputs.data.description,
        coverImageUrl: inputs.data.coverImageUrl,
      })
      .where(
        and(
          eq(indexes.id, inputs.data.id),
          eq(indexes.userId, (req as unknown as { userId: string }).userId)
        )
      )
      .returning();

    const index = result[0];

    if (!index) {
      res.status(404).json({
        message: "Index not found",
        success: true,
      });
      return;
    }

    res.json({
      message: "Index edited successfully",
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

export const changeIndexVisibilityController = async (
  req: Request,
  res: Response
) => {
  try {
    const inputs = changeIndexVisibilitySchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(422).json({
        message: "The inputs are incorrect",
        success: false,
      });
      return;
    }

    const result = await db
      .update(indexes)
      .set({
        isPublic: inputs.data.isPublic,
      })
      .where(
        and(
          eq(indexes.id, inputs.data.id),
          eq(indexes.userId, (req as unknown as { userId: string }).userId)
        )
      )
      .returning();

    const index = result[0];

    if (!index) {
      res.status(404).json({
        message: "Index not found",
        success: false,
      });
      return;
    }

    res.json({
      message: "Visibility of index updated",
      success: true,
      shareableId: index?.shareableId,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};

export const deleteIndexController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(422).json({
        message: "The inputs are incorrect",
        success: false,
      });
      return;
    }

    const result = await db
      .delete(indexes)
      .where(
        and(
          eq(indexes.id, id),
          eq(indexes.userId, (req as unknown as { userId: string }).userId)
        )
      )
      .returning();

    const index = result[0];

    if (!index) {
      res.status(404).json({
        message: "Index not found",
        success: false,
      });
    }

    res.json({
      message: "Index deleted successfully",
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

export const getAllIndexCardsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { indexId } = req.params;

    if (!indexId) {
      res.status(422).json({
        message: "Index id not found",
        success: false,
      });
      return;
    }

    const indexFound = await db
      .select()
      .from(indexes)
      .where(eq(indexes.id, indexId));

    if (!indexFound[0]) {
      res.status(404).json({
        message: "Index not found",
        success: false,
      });
      return;
    }

    if (
      indexFound[0].userId !== (req as unknown as { userId: string }).userId
    ) {
      res.status(403).json({
        message: "User not authorized for this index",
        success: false,
      });
      return;
    }

    const allIndexCards = await db
      .select()
      .from(indexCards)
      .where(eq(indexCards.indexId, indexFound[0].id));

    res.json({
      message: "Index Cards fetched successfully",
      indexCards: allIndexCards,
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

export const getAllIndexCardsForSharedIndexController = async (
  req: Request,
  res: Response
) => {
  try {
    const { shareableId } = req.params;

    if (!shareableId) {
      res.status(422).json({
        message: "Shareable index id not found",
        success: false,
      });
      return;
    }

    const indexFound = await db
      .select()
      .from(indexes)
      .where(eq(indexes.shareableId, shareableId));

    if (!indexFound[0]) {
      res.status(404).json({
        message: "Index not found",
        success: false,
      });
      return;
    }

    if (!indexFound[0].isPublic) {
      res.status(403).json({
        message: "Index is not public",
        success: false,
      });
      return;
    }

    const allIndexCards = await db
      .select()
      .from(indexCards)
      .where(eq(indexCards.indexId, indexFound[0].id));

    res.json({
      message: "Index Cards fetched successfully",
      indexCards: allIndexCards,
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
