import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
import verifyToken from "../middleware/auth.js";
import moment from "moment";
import { Feedback, NewUser, Service, User } from "../database/kysely.js";
import { db } from "../database/db.js";

configDotenv();
const UserRouter = express.Router();

interface MyRequest extends Request {
  user?: any;
}

function calcRating(
  beforeRating: number,
  newRating: number,
  totalServices: number
): number {
  return Number(((beforeRating + newRating) / totalServices).toFixed(1));
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

UserRouter.get(
  "/user-profile",
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
      const profile = await db
        .selectFrom("user_details")
        .selectAll()
        .where("user_id", "=", user_id)
        .executeTakeFirst();
      if (!profile) {
        res
          .status(404)
          .json({ message: "No profile found for User ID:" + user_id });
        return;
      }
      profile.created_at = moment(profile.created_at).format(
        "YYYY-MM-DD HH:MM:SS"
      );
      profile.user_pass = "**********";


      res.status(200).json({ message: "My Profile", profile });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Oops, Something Bad Happened!",
          error: error.message,
        });
    }
  }
);

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
        res.status(400).json({
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

      const newServiceReq = await db
        .selectFrom("users_data")
        .select("services_requested")
        .where("user_id", "=", user_id)
        .execute();

      await db
        .updateTable("users_data")
        .set({
          services_requested: newServiceReq[0]?.services_requested
            ? newServiceReq[0].services_requested + 1
            : 1,
        })
        .where("user_id", "=", user_id)
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
      let services = await db
        .selectFrom("service_data")
        .selectAll()
        .where("user_id", "=", user_id)
        .execute();

      if (services.length === 0) {
        res
          .status(404)
          .json({ message: "No services found for User ID:" + user_id });
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

UserRouter.get(
  "/view-services/:srv_id",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const { srv_id } = req.params;
      const { user_id } = req.user;
      if (!user_id) {
        res
          .status(400)
          .json({ message: "User ID not found! Please login again" });
        return;
      }
      let service = await db
        .selectFrom("service_data")
        .selectAll()
        .where("srv_id", "=", Number(srv_id))
        .executeTakeFirst();

      if (!service) {
        res
          .status(404)
          .json({ message: `No service found with ID ${srv_id}!` });
        return;
      }

      if (service.user_id !== user_id) {
        res.status(403).json({
          message: `User with ID: ${user_id} is not authorized to access service with ID: ${srv_id}!`,
        });
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
        message: "Oops, Something Bad Happened!",
        error: error.message,
      });
    }
  }
);

UserRouter.post(
  "/view-services/:srv_id/feedback",
  //@ts-ignore
  verifyToken,
  async (req: MyRequest, res: Response) => {
    try {
      const { user_id } = req.user;
      const { srv_id } = req.params;
      const { feedback, rating }: Feedback = req.body;
      if (!user_id || !srv_id || !rating) {
        res
          .status(400)
          .json({ message: "Incomplete details! Please fill all the fields" });
        return;
      }
      const sp = await db
        .selectFrom("service_data")
        .select(["sp_id", "status"])
        .where("srv_id", "=", Number(srv_id))
        .executeTakeFirst();

      if (!sp) {
        res.status(404).json({ message: "No service found with ID:" + srv_id });
        return;
      }
      if (sp.status === "Ongoing") {
        res.status(400).json({
          message:
            "Service is still ongoing! Please wait for it to be completed",
        });
        return;
      }

      const result = await db
        .insertInto("service_feedback")
        .values({
          user_id,
          sp_id: sp.sp_id,
          srv_id: Number(srv_id),
          feedback,
          rating,
        })
        .executeTakeFirst();

      res.status(200).json({
        message: "Feedback Submitted Successfully!",
        feedback_id: Number(result.insertId),
      });

      await db
        .updateTable("service_data")
        .set({ rating })
        .where("srv_id", "=", Number(srv_id))
        .execute();

      const spData = await db
        .selectFrom("sp_data")
        .select(["rating", "services_provided"])
        .where("sp_id", "=", sp.sp_id)
        .executeTakeFirst();

      if (!spData) {
        res
          .status(404)
          .json({ message: "No service found with ID:" + sp.sp_id });
        return;
      } else {
        if (
          spData?.rating !== undefined &&
          spData?.services_provided !== undefined
        ) {
          const newRating = calcRating(
            Number(spData.rating),
            rating,
            spData.services_provided
          );
          await db
            .updateTable("sp_data")
            .set({ rating: newRating })
            .where("sp_id", "=", sp.sp_id)
            .execute();
        } else {
          res.status(400).json({ message: "Invalid service provider data" });
          return;
        }
      }
    } catch (error) {
      res.status(500).json({
        message: "Oops, Something Bad Happened!",
        error: error.message,
      });
      console.log(error);
    }
  }
);

export default UserRouter;
