import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  longtext,
  binary,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Documents table for collaborative editor.
 * Stores document metadata and latest snapshot state.
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: int("ownerId").notNull(),
  content: longtext("content"),
  snapshotState: longtext("snapshotState"), // Base64-encoded Yjs state
  snapshotVersion: int("snapshotVersion").default(0).notNull(),
  wordCount: int("wordCount").default(0).notNull(),
  characterCount: int("characterCount").default(0).notNull(),
  lastEditedBy: int("lastEditedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Document permissions table for access control.
 * Tracks who has access to each document and their role.
 */
export const documentPermissions = mysqlTable("documentPermissions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).notNull(),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  grantedBy: int("grantedBy"),
});

export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type InsertDocumentPermission = typeof documentPermissions.$inferInsert;

/**
 * Operations log for CRDT state.
 * Stores all incremental updates for convergence and recovery.
 */
export const operations = mysqlTable("operations", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  clientId: varchar("clientId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  updateData: longtext("updateData"), // Base64-encoded Yjs update
  lamportTime: int("lamportTime").notNull(),
  vectorClock: json("vectorClock").$type<Record<string, number>>().notNull(), // { clientId: number }
  version: int("version").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Operation = typeof operations.$inferSelect;
export type InsertOperation = typeof operations.$inferInsert;

/**
 * Active sessions for collaborative editing.
 * Tracks user presence and cursor positions in real-time.
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(),
  clientId: varchar("clientId", { length: 64 }).notNull().unique(),
  cursorPosition: int("cursorPosition").default(0).notNull(),
  selectionStart: int("selectionStart"),
  selectionEnd: int("selectionEnd"),
  userColor: varchar("userColor", { length: 7 }), // Hex color code
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Offline operation queue for clients.
 * Stores operations that were made while offline.
 */
export const offlineQueue = mysqlTable("offlineQueue", {
  id: int("id").autoincrement().primaryKey(),
  clientId: varchar("clientId", { length: 64 }).notNull(),
  documentId: int("documentId").notNull(),
  updateData: longtext("updateData").notNull(), // Base64-encoded Yjs update
  sequenceNumber: int("sequenceNumber").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OfflineQueue = typeof offlineQueue.$inferSelect;
export type InsertOfflineQueue = typeof offlineQueue.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  permissions: many(documentPermissions),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, { fields: [documents.ownerId], references: [users.id] }),
  permissions: many(documentPermissions),
  operations: many(operations),
  sessions: many(sessions),
}));

export const documentPermissionsRelations = relations(
  documentPermissions,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentPermissions.documentId],
      references: [documents.id],
    }),
    user: one(users, {
      fields: [documentPermissions.userId],
      references: [users.id],
    }),
  })
);

export const operationsRelations = relations(operations, ({ one }) => ({
  document: one(documents, {
    fields: [operations.documentId],
    references: [documents.id],
  }),
  user: one(users, { fields: [operations.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  document: one(documents, {
    fields: [sessions.documentId],
    references: [documents.id],
  }),
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
