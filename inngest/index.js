import { Inngest } from "inngest";
import User from "../models/User.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "pingup-app" });

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

// Export all functions
export const functions = [syncUserCreation, syncUserUpdation, syncUserDeletion];
