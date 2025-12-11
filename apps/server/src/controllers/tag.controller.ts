import { db } from "@repo/db";
import { tags } from "@repo/db/schemas";
import { createTagSchema } from "@repo/zod-schema";
import { ilike } from "drizzle-orm";
import { Request, Response } from "express";

export const createTagController = async (req: Request, res: Response) => {
  try {
    const input = createTagSchema.safeParse(req.body);

    if (!input.success) {
      res.status(422).json({
        message: "Invalid inputs",
        success: false,
      });
      return;
    }

    await db.insert(tags).values({ title: input.data.title });

    res.json({
      message: "tag created successfully",
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

export const getsTagByTitleController = async (req: Request, res: Response) => {
  try {
    const keyword = req.params.keyword || "";

    const tagsFound = await db
      .select()
      .from(tags)
      .where(ilike(tags.title, `%${keyword}%`))
      .limit(10);

    res.json({
      message: "tags successfully fetched",
      success: true,
      tagsFound,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};
