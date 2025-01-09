import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import UserRouter from "./routes/user_api_routes.js";
import SpRouter from "./routes/sp_api_routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", UserRouter);
app.use("/", SpRouter);

app.use(
  "/",
  (err: ErrorEvent, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json("Oops, Something Bad Happened!");
    console.log(err);
  }
);

app.listen(3001, () => {
  console.log("Hello from Port 3001! 🙋🏻‍♂️");
});
