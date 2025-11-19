import { db } from "@repo/db";
import { indexCards } from "@repo/db/schemas";
import { createIndexCardSchema } from "@repo/zod-schema";
import { Request, Response } from "express";
import { expressRedisClient } from "..";

const STREAM_NAME = "card_created";

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

    // add the added index card to the redis stream
    await expressRedisClient.xAdd(STREAM_NAME, "*", {
      card_id: result[0]!.id,
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
