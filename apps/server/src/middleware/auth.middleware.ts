import { db } from "@repo/db";
import { users } from "@repo/db/schemas";
import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const jwtCookie = req.cookies.jwt;

  if (!jwtCookie) {
    res.status(401).json({ message: "User is not logged in", success: false });
    return;
  }

  try {
    const decoded = jwt.verify(jwtCookie, process.env.JWT_SECRET!).toString();

    const userFound = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded));

    if (!userFound[0] || userFound[0].id !== decoded) {
      throw new Error("User does not exist in the database");
    }
    (req as unknown as { userId: string }).userId = decoded;

    next();
  } catch (err) {
    console.log(err);
    res.status(404).json({
      message: "Jwt Token is invalid; User does not exist or isn't logged in",
      success: false,
    });
  }
};
