import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
import verifyToken from "../middleware/auth.js";
import moment from "moment";
import { sql } from "kysely";

configDotenv();
const SpRouter = express.Router();
SpRouter.get("/", async (req: Request, res: Response) => {
  res.status(200).json({
    messgae: "Welcome to D's Home Service Management System",
    description:
      "A platform that connects service providers to clients in need of their services 🚀",
  });
});


export default SpRouter;