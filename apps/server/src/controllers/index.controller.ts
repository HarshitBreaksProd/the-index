import { db } from "@repo/db";
import { indexes } from "@repo/db/schemas";
import { createIndexSchema } from "@repo/zod-schema";
import { Response, Request } from "express";

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
