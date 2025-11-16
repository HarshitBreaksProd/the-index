import express from "express";
import "dotenv/config";
import cors from "cors";
import router from "./routers";
import cookieParser from "cookie-parser";

const HTTP_PORT = process.env.HTTP_PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!HTTP_PORT || !FRONTEND_URL || !JWT_SECRET) {
  throw new Error("Some env variable is not available in server");
}

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use("/api/v1", router);

app.listen(HTTP_PORT, () => {
  console.log("Express server running on port ", HTTP_PORT);
});
