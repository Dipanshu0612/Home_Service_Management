import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
import verifyToken from "../middleware/auth.js";
import moment from "moment";
import { NewUser, Service, User } from "../database/kysely.js";
import { db } from "../database/db.js";

configDotenv();
const UserRouter = express.Router();

interface MyRequest extends Request {
  user?: any;
}

UserRouter.get("/", async (req: Request, res: Response) => {
  res.status(200).json({
    messgae: "Welcome to D's Home Service Management System",
    description:
      "A platform that connects service providers to clients in need of their services 🚀",
  });
});

UserRouter.post("/user-register", async (req: Request, res: Response) => {
  try {
    const { user_name, user_email, user_pass, contact, address }: NewUser =
      req.body;
    if (!user_name || !user_email || !user_pass || !contact || !address) {
      res.status(400).json("Incomplete details! Please fill all the fields");
      return;
    }
    const hashedPassword = await bcrypt.hash(user_pass, 10);
    const user = await db
      .insertInto("users_data")
      .values({
        user_name,
        user_email,
        user_pass: hashedPassword,
        contact,
        address,
      })
      .executeTakeFirst();
    res.status(200).json({
      message: "User Registered Successfully!",
      user_id: Number(user.insertId),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Oops, Something Bad Happened!", error: error.message });
  }
});

UserRouter.post("/user-login", async (req: Request, res: Response) => {
  try {
    const { user_id, user_pass }: NewUser = req.body;
    if (!user_id || !user_pass) {
      res.status(400).json("Incomplete details! Please fill all the fields");
      return;
    }
    const user = await db
      .selectFrom("users_data")
      .select("user_pass")
      .where("user_id", "=", user_id)
      .execute();
    if (user.length === 0) {
      res.status(404).json({ message: `No user found with ID ${user_id}!` });
      return;
    }
    const validPassword = await bcrypt.compare(user_pass, user[0].user_pass);
    if (!validPassword) {
      res.status(401).json({ message: "Invalid Password! Please try again" });
      return;
    }
    //@ts-ignore
    const token = jwt.sign({ user_id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "User Logged In Successfully!", token });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Oops, Something Bad Happened!", error: error.message });
  }
});

UserRouter.post(
  "/request-service",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const { sp_id, srv_type, start_time, service_charge }: Service = req.body;
      const { user_id } = req.user;
      if (!sp_id || !srv_type || !start_time || !service_charge) {
        res.status(400).json("Incomplete details! Please fill all the fields");
        return;
      }
      if (!user_id) {
        res
          .status(400)
          .json({ message: "User ID not found! Please login again" });
        return;
      }

      const sp_free = await db
        .selectFrom("sp_data")
        .select("availability")
        .where("sp_id", "=", sp_id)
        .execute();
      
      if (sp_free[0].availability === 0) {
        res
          .status(400)
          .json({
            message:
              "Service Provider is not available at the moment! Please choose a different service provide or try again later.",
          });
        return;
      }
      const request = await db
        .insertInto("service_data")
        .values({ user_id, sp_id, srv_type, start_time, service_charge })
        .executeTakeFirst();
      
      await db
        .updateTable("sp_data")
        .set({ availability: 0 })
        .where("sp_id", "=", sp_id)
        .execute();
      
      await db
        .updateTable("users_data")
        .set({
          services_requested: db.selectFrom("users_data").select("services_requested").where("user_id", "=", user_id).execute()[0].services_requested + 1
        })
        .where("user_id", "=", user_id)
        .execute();
      await db
        .updateTable("sp_data")
        .set({
          services_provided: db.selectFrom("sp_data").select("services_provided").where("sp_id", "=", sp_id).execute()[0].services_provided + 1
        })
        .where("sp_id", "=", sp_id)
        .execute();
      
      res.status(200).json({
        message: "Service Requested Successfully!",
        request_id: Number(request.insertId),
      });
    } catch (error) {
      res.status(500).json({
        message: "Oops, Something Bad Happened!",
        error: error.message,
      });
    }
  }
);

UserRouter.get(
  "/view-services",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const { user_id } = req.user;
      if (!user_id) {
        res
          .status(400)
          .json({ message: "User ID not found! Please login again" });
        return;
      }
      const services = await db
        .selectFrom("service_data")
        .where("user_id", "=", user_id)
        .execute();
      res.status(200).json({services});
    } catch (error) {
      res.status(500).json({
        message: "Oops, Something Bad Happened!",
        error: error.message,
      });
    }
  }
);

export default UserRouter;
