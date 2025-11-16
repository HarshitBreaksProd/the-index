import { Request, Response } from "express";
import { signinSchema, signupSchema } from "@repo/zod-schema";
import { db } from "@repo/db";
import { users } from "@repo/db/schemas";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

export const signupController = async (req: Request, res: Response) => {
  const body = req.body;

  const inputs = signupSchema.safeParse(body);

  if (!inputs.success) {
    console.log("Invalid Inputs");
    res.status(400).json({ message: inputs.error, success: false });
    return;
  }

  if (inputs.data.password !== inputs.data.confirmPassword) {
    console.log("Passwords do not match");
    res.status(400).json({ message: "Passwords do not match", success: false });
    return;
  }

  const password = inputs.data.password;

  const hashedPassword = await bcrypt.hash(
    password,
    process.env.SALTROUNDS || "10"
  );

  try {
    const result = await db
      .insert(users)
      .values({
        firstName: inputs.data.firstName,
        lastName: inputs.data.lastName,
        email: inputs.data.email,
        password: hashedPassword,
      })
      .returning();

    console.log(result[0]);

    const token = jwt.sign(result[0]!.id, process.env.JWT_SECRET!);

    res.cookie("jwt", token);

    res.json({ message: "User signed up successfully", success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Some error faced in server",
      success: false,
    });
  }
};

export const signinController = async (req: Request, res: Response) => {
  const body = req.body;

  const inputs = signinSchema.safeParse(body);

  if (!inputs.success) {
    console.log("Invalid Inputs");
    res.status(400).json({ message: inputs.error, success: false });
    return;
  }

  const password = inputs.data.password;

  try {
    const userFound = await db
      .select()
      .from(users)
      .where(eq(users.email, inputs.data.email));

    if (!userFound[0]) {
      res.status(404).json({
        message: "User does not exist",
        success: false,
      });
      return;
    }

    const hashedPassword = userFound[0].password;

    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (!passwordMatch) {
      res.status(404).json({
        message: "Password do not match",
        success: false,
      });
      return;
    }

    const token = jwt.sign(userFound[0].id, process.env.JWT_SECRET!);

    res.cookie("jwt", token);

    res.json({ message: "User signed in successfully", success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Some error faced in server",
      success: false,
    });
  }
};
