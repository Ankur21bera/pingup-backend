import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/connectionSchema.js";
import sendEmail from "../config/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "pingup-app" });

/* =========================
   1) Clerk Sync Functions
========================= */

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const email = email_addresses?.[0]?.email_address;
    if (!email) return;

    let username = email.split("@")[0];

    // username already exists -> make unique
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      username = `${username}${Math.floor(Math.random() * 10000)}`;
    }

    const userData = {
      _id: id,
      email,
      full_name: `${first_name || ""} ${last_name || ""}`.trim(),
      profile_picture: image_url,
      username,
    };

    await User.create(userData);
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;

    const email = email_addresses?.[0]?.email_address;

    const updateUserData = {
      email,
      full_name: `${first_name || ""} ${last_name || ""}`.trim(),
      profile_picture: image_url,
    };

    await User.findByIdAndUpdate(id, updateUserData);
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

/* =========================
   2) Connection Reminder
========================= */

const sendConnectionRequestReminder = inngest.createFunction(
  { id: "send-new-connection-request-reminder" },
  { event: "app/connection-request" },
  async ({ event, step }) => {
    const { connectionId } = event.data;

    // ✅ Send first mail instantly
    await step.run("send-connection-request-mail", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id"
      );

      if (!connection) return { message: "Connection not found" };

      const subject = "New Connection Request";
      const body = `
        <div style="font-family: Arial,sans-serif; padding:20px">
          <h2>Hi ${connection.to_user_id.full_name}</h2>
          <p>
            You have a new connection request from 
            <b>${connection.from_user_id.full_name}</b> - 
            @${connection.from_user_id.username}
          </p>
          <p>
            Click 
            <a href="${process.env.FRONTEND_URL}/connections" style="color:#10b981;">
              Here
            </a>
            to accept or reject the request.
          </p>
          <br/>
          <p>Thanks,<br/>Pingup - Stay Connected</p>
        </div>
      `;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });

      return { message: "Initial mail sent" };
    });

    // ✅ Wait 24 hours
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await step.sleepUntil("wait-for-24-hours", in24Hours);

    // ✅ Reminder after 24 hours (only if still pending)
    return await step.run("send-connection-request-reminder", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id"
      );

      if (!connection) return { message: "Connection not found" };

      // If already accepted or rejected, don't send reminder
      if (connection.status !== "pending") {
        return { message: `No reminder needed. Status: ${connection.status}` };
      }

      const subject = "Reminder: Connection Request Pending";
      const body = `
        <div style="font-family: Arial,sans-serif; padding:20px">
          <h2>Hi ${connection.to_user_id.full_name}</h2>
          <p>
            Reminder: You still have a pending connection request from 
            <b>${connection.from_user_id.full_name}</b> - 
            @${connection.from_user_id.username}
          </p>
          <p>
            Click 
            <a href="${process.env.FRONTEND_URL}/connections" style="color:#10b981;">
              Here
            </a>
            to accept or reject the request.
          </p>
          <br/>
          <p>Thanks,<br/>Pingup - Stay Connected</p>
        </div>
      `;

      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });

      return { message: "Reminder Sent." };
    });
  }
);

/* =========================
   Export Functions
========================= */

export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  sendConnectionRequestReminder,
];
