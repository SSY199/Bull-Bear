'use server';

import { connectToDatabase } from '@/database/mongoose';
import Watchlist from '@/database/models/watchlist.model';
import { auth, currentUser } from '@clerk/nextjs/server';

// Better-auth MongoDB adapter uses collection "user" (singular), not "users"
const USER_COLLECTION = 'user';

function getUserIdFromDbUser(user: { id?: string; _id?: unknown } | null): string | null {
  if (!user) return null;
  return user.id ?? (user._id != null ? String(user._id) : null) ?? null;
}

function mapWatchlistDocToStockWithData(doc: any): StockWithData {
  return {
    userId: typeof doc.userId === 'string' ? doc.userId : String(doc.userId ?? ''),
    symbol: typeof doc.symbol === 'string' ? doc.symbol : '',
    company: typeof doc.company === 'string' ? doc.company : '',
    addedAt:
      doc.addedAt instanceof Date
        ? doc.addedAt.toISOString()
        : typeof doc.addedAt === 'string'
          ? doc.addedAt
          : new Date().toISOString(),
  } as StockWithData;
}

export const getWatchlistSymbolsByEmail = async (
  email: string
): Promise<string[]> => {
  try {
    if(!email){
      console.error('Email not provided');
      return [];
    }
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      console.error('Database connection not found');
      return [];
    }

    const user = await db.collection(USER_COLLECTION).findOne<{ id?: string; _id?: unknown; email?: string }>({ email });

    if (!user) {
      console.log(`User not found for email: ${email}`);
      return [];
    }

    const userId = getUserIdFromDbUser(user);

    if (!userId) {
      console.error('User ID not found');
      return [];
    }

    const watchlistItems = await Watchlist.find({ userId }).select('symbol').lean();

    return watchlistItems.map((item) => item.symbol);
  } catch (error) {
    console.error('Error fetching watchlist symbols:', error);
    return [];
  }
};

export const getWatchlistByEmail = async (email: string): Promise<StockWithData[]> => {
  try {
    if (!email) return [];
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) return [];

    const user = await db
      .collection(USER_COLLECTION)
      .findOne<{ id?: string; _id?: unknown; email?: string }>({ email });
    if (!user) return [];

    const userId = getUserIdFromDbUser(user);
    if (!userId) return [];

    const items = await Watchlist.find({ userId })
      .select('userId symbol company addedAt')
      .sort({ addedAt: -1 })
      .lean();

    return items.map(mapWatchlistDocToStockWithData);
  } catch (e) {
    console.error('Error fetching watchlist:', e);
    return [];
  }
};

export const getWatchlistForCurrentUser = async (): Promise<StockWithData[]> => {
  try {
    const { userId } = await auth();
    if (!userId) return [];

    await connectToDatabase();

    const items = await Watchlist.find({ userId })
      .select('userId symbol company addedAt')
      .sort({ addedAt: -1 })
      .lean();

    return items.map(mapWatchlistDocToStockWithData);
  } catch (error) {
    console.error('Error fetching watchlist for current user:', error);
    return [];
  }
};

export const getWatchlistSymbolsForCurrentUser = async (): Promise<string[]> => {
  try {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    // Backward compatibility: if watchlist docs were tied to better-auth users by email lookup.
    if (email) {
      const byEmail = await getWatchlistSymbolsByEmail(email);
      if (byEmail.length > 0) return byEmail;
    }

    const { userId } = await auth();
    if (!userId) return [];

    await connectToDatabase();
    const items = await Watchlist.find({ userId }).select('symbol').lean();
    return items.map((item) => item.symbol);
  } catch (error) {
    console.error('Error fetching watchlist symbols for current user:', error);
    return [];
  }
};

export const addToWatchlist = async (params: { symbol: string; company: string }) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not found');
    }

    const existing = await Watchlist.findOne({ userId, symbol: params.symbol });
    if (existing) {
      return { success: true, message: 'Already in watchlist' };
    }

    await Watchlist.create({
      userId,
      symbol: params.symbol,
      company: params.company,
      addedAt: new Date(),
    });

    return { success: true, message: 'Added to watchlist' };
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }
};

export const removeFromWatchlist = async (symbol: string) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not found');
    }

    await Watchlist.deleteOne({ userId, symbol });

    return { success: true, message: 'Removed from watchlist' };
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }
};