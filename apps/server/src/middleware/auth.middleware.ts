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

    (req as unknown as { userId: string }).userId = decoded;

    next();
  } catch (err) {
    console.log(err);
    res.status(404).json({
      message: "Jwt Token is invalid",
      success: false,
    });
  }
};
