'use server';
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import Alert from "@/database/models/alert.model";
import Watchlist from "@/database/models/watchlist.model";

export const deleteAccount = async () => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, message: "No active session found" };
    }

    const { connectToDatabase } = await import("@/database/mongoose");
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) throw new Error("Database connection not found");

    // Keep compatibility with any historical better-auth IDs in MongoDB.
    if (ObjectId.isValid(userId)) {
      await Promise.all([
        db.collection("user").deleteOne({ _id: new ObjectId(userId) }),
        db.collection("session").deleteMany({ userId }),
        db.collection("account").deleteMany({ userId }),
      ]);
    }

    await Promise.all([
      Watchlist.deleteMany({ userId }),
      Alert.deleteMany({ userId }),
    ]);

    const client = await clerkClient();
    await client.users.deleteUser(userId);

    return {
      success: true,
      message: "Account deleted successfully",
    };
  } catch (error) {
    console.error("Delete account failed", error);
    return {
      success: false,
      message: "Failed to delete account",
      data: error,
    };
  }
};

