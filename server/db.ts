import { eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents, documentPermissions, operations, sessions, offlineQueue } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Document queries
export async function createDocument(name: string, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(documents).values({
    name,
    ownerId,
  });
  return result;
}

export async function getDocument(documentId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.ownerId, userId));

  return result;
}

// Permission queries
export async function checkDocumentAccess(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(documentPermissions)
    .where(
      eq(documentPermissions.documentId, documentId) &&
      eq(documentPermissions.userId, userId)
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getDocumentPermissions(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(documentPermissions)
    .where(eq(documentPermissions.documentId, documentId));

  return result;
}

// Operation queries
export async function addOperation(
  documentId: number,
  clientId: string,
  userId: number,
  updateData: string,
  lamportTime: number,
  vectorClock: Record<string, number>,
  version: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(operations).values({
    documentId,
    clientId,
    userId,
    updateData,
    lamportTime,
    vectorClock,
    version,
  });
  return result;
}

export async function getOperationsSince(documentId: number, version: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(operations)
    .where(
      eq(operations.documentId, documentId) &&
      gt(operations.version, version)
    )
    .orderBy(operations.version);

  return result;
}

// Session queries
export async function createSession(
  documentId: number,
  userId: number,
  clientId: string,
  userColor: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sessions).values({
    documentId,
    userId,
    clientId,
    userColor,
  });
  return result;
}

export async function getActiveSessions(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.documentId, documentId));

  return result;
}

export async function updateSessionCursor(
  clientId: string,
  cursorPosition: number,
  selectionStart?: number,
  selectionEnd?: number
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(sessions)
    .set({
      cursorPosition,
      selectionStart,
      selectionEnd,
      lastHeartbeat: new Date(),
    })
    .where(eq(sessions.clientId, clientId));
}

export async function deleteSession(clientId: string) {
  const db = await getDb();
  if (!db) return;

  await db.delete(sessions).where(eq(sessions.clientId, clientId));
}

// Offline queue queries
export async function addOfflineOperation(
  clientId: string,
  documentId: number,
  updateData: string,
  sequenceNumber: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(offlineQueue).values({
    clientId,
    documentId,
    updateData,
    sequenceNumber,
  });
}

export async function getOfflineQueue(clientId: string, documentId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(offlineQueue)
    .where(
      eq(offlineQueue.clientId, clientId) &&
      eq(offlineQueue.documentId, documentId)
    )
    .orderBy(offlineQueue.sequenceNumber);

  return result;
}

export async function clearOfflineQueue(clientId: string, documentId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(offlineQueue)
    .where(
      eq(offlineQueue.clientId, clientId) &&
      eq(offlineQueue.documentId, documentId)
    );
}

// TODO: Add additional queries as features grow
