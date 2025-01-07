import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
import verifyToken from "../middleware/auth.js";
import moment from "moment";
import { NewSp } from "../database/kysely.js";
import { db } from "../database/db.js";

configDotenv();
const SpRouter = express.Router();
interface MyRequest extends Request {
  user?: any;
}

SpRouter.get("/", async (req: Request, res: Response) => {
  res.status(200).json({
    messgae: "Welcome to D's Home Service Management System",
    description:
      "A platform that connects service providers to clients in need of their services 🚀",
  });
});

SpRouter.post("/sp-register", async (req: Request, res: Response) => {
  try {
    const { sp_name, sp_email, sp_pass, skill, contact }: NewSp = req.body;
    if (!sp_name || !sp_email || !sp_pass || !skill || !contact) {
      res.status(400).json("Incomplete details! Please fill all the fields");
      return;
    }
    const hashedPassword = await bcrypt.hash(sp_pass, 10);
    const sp = await db
      .insertInto("sp_data")
      .values({
        sp_name,
        sp_email,
        sp_pass: hashedPassword,
        skill,
        contact,
      })
      .executeTakeFirst();
    res.status(200).json({
      message: "Service Provider Registered Successfully!",
      sp_id: Number(sp.insertId),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Oops, Something Bad Happened!", error: error.message });
  }
});

SpRouter.post("/sp-login", async (req: Request, res: Response) => {
  try {
    const { sp_id, sp_pass }: NewSp = req.body;
    if (!sp_id || !sp_pass) {
      res.status(400).json("Incomplete details! Please fill all the fields");
      return;
    }
    const sp = await db
      .selectFrom("sp_data")
      .select("sp_pass")
      .where("sp_id", "=", sp_id)
      .executeTakeFirst();
    if (!sp) {
      res.status(404).json("Service Provider not found!");
      return;
    }
    const validPassword = await bcrypt.compare(sp_pass, sp.sp_pass);
    if (!validPassword) {
      res.status(400).json("Invalid Credentials!");
      return;
    }
    //@ts-ignore
    const token = jwt.sign({ id: sp_id }, process.env.JWT_KEY, {
      expiresIn: "1h",
    });
    res.status(200).json({ message: "Login Successful!", token });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Oops, Something Bad Happened!", error: error.message });
  }
});

SpRouter.get(
  "/sp-services",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const sp_id = req.user.id;
      let services = await db
        .selectFrom("service_data")
        .selectAll()
        .where("sp_id", "=", sp_id)
        .execute();
      if (services.length === 0) {
        res.status(404).json({
          message: "No Services Found for service provider with ID: " + sp_id,
        });
        return;
      }
      services = services.map((service) => {
        const formattedService = {
          ...service,
          start_time: moment(service.start_time).format("YYYY-MM-DD HH:mm:ss"),
          created_at: moment(service.created_at).format("YYYY-MM-DD HH:mm:ss"),
        };

        if (service.end_time) {
          formattedService.end_time = moment(service.end_time).format(
            "YYYY-MM-DD HH:mm:ss"
          );
        } else {
          formattedService.end_time = "Not yet completed";
        }

        return formattedService;
      });
      res.status(200).json({ services });
    } catch (error) {
      res.status(500).json({
        message: "Oops, Something Bad Happened!",
        error: error.message,
      });
    }
  }
);

SpRouter.get(
  "/sp-services/:srv_id",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const sp_id = req.user.id;
      const { srv_id } = req.params;
      let service = await db
        .selectFrom("service_data")
        .selectAll()
        .where("sp_id", "=", sp_id)
        .executeTakeFirst();
      
      if (!service) {
        res.status(404).json({ message: "No service found with ID:" + srv_id });
        return;
      }
      service.start_time = moment(service.start_time).format(
        "YYYY-MM-DD HH:mm:ss"
      );
      service.end_time = service.end_time
        ? moment(service.end_time).format("YYYY-MM-DD HH:mm:ss")
        : "Not yet completed";
      service.created_at = moment(service.created_at).format(
        "YYYY-MM-DD HH:mm:ss"
      );

      res.status(200).json({ service });
    } catch (error) {
      res.status(500).json({
        message: "Oops, Something Bad Happend!",
        error: error.message,
      });
    }
  }
);

SpRouter.put(
  "/sp-services/:srv_id/status",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const sp_id = req.user.id;
      const { srv_id } = req.params;
      const { status } = req.body;
      console.log();
      if (!status) {
        res.status(400).json({ message: "Please provide the status" });
        return;
      }
      const service = await db
        .selectFrom("service_data")
        .select("status")
        .where("sp_id", "=", sp_id)
        .where("srv_id", "=", Number(srv_id))
        .executeTakeFirst();
      if (!service) {
        res.status(404).json({ message: "No service found with ID:" + srv_id });
        return;
      }

      await db
        .updateTable("service_data")
        .set({ status })
        .where("sp_id", "=", sp_id)
        .where("srv_id", "=", Number(srv_id))
        .execute();

      const newServiceProv = await db
        .selectFrom("sp_data")
        .select("services_provided")
        .where("sp_id", "=", sp_id)
        .execute();

      await db
        .updateTable("sp_data")
        .set({
          services_provided: newServiceProv[0]?.services_provided
            ? newServiceProv[0].services_provided + 1
            : 1,
        })
        .where("sp_id", "=", sp_id)
        .execute();

      await db
        .updateTable("sp_data")
        .set({ availability: 1 })
        .where("sp_id", "=", sp_id)
        .execute();

      res
        .status(200)
        .json({ message: "Service status has been updated successfully!" });
    } catch (error) {
      res
        .status(500)
        .json({ mesage: "Oops, Something bad happend!", error: error.message });
    }
  }
);

export default SpRouter;
