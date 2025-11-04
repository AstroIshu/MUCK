import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createDocument,
  getDocument,
  getUserDocuments,
  checkDocumentAccess,
  getDocumentPermissions,
  addOperation,
  getOperationsSince,
  deleteDocument,
} from "../db";
import { TRPCError } from "@trpc/server";

export const documentsRouter = router({
  // Create a new document
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        await createDocument(input.name, ctx.user.id);
        // Get the created document
        const docs = await getUserDocuments(ctx.user.id);
        const newDoc = docs[docs.length - 1];
        return {
          success: true,
          documentId: newDoc.id,
        };
      } catch (error) {
        console.error("[Documents] Failed to create document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create document",
        });
      }
    }),

  // Get document details
  get: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const doc = await getDocument(input.documentId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        // Check access - owner always has access
        if (doc.ownerId !== ctx.user.id) {
          const access = await checkDocumentAccess(
            input.documentId,
            ctx.user.id
          );
          if (!access) throw new TRPCError({ code: "FORBIDDEN" });
        }

        return {
          id: doc.id,
          name: doc.name,
          ownerId: doc.ownerId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          wordCount: doc.wordCount,
          characterCount: doc.characterCount,
          lastEditedBy: doc.lastEditedBy,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Documents] Failed to get document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get document",
        });
      }
    }),

  // List user's documents
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    try {
      const docs = await getUserDocuments(ctx.user.id);
      return docs.map(doc => ({
        id: doc.id,
        name: doc.name,
        ownerId: doc.ownerId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        wordCount: doc.wordCount,
        characterCount: doc.characterCount,
      }));
    } catch (error) {
      console.error("[Documents] Failed to list documents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list documents",
      });
    }
  }),

  // Get document permissions
  getPermissions: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const doc = await getDocument(input.documentId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        // Only owner can view permissions
        if (doc.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const permissions = await getDocumentPermissions(input.documentId);
        return permissions.map(p => ({
          userId: p.userId,
          role: p.role,
          grantedAt: p.grantedAt,
        }));
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Documents] Failed to get permissions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get permissions",
        });
      }
    }),

  // Get operation history for recovery
  getOperations: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        fromVersion: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        // Check access - owner always has access
        const doc = await getDocument(input.documentId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        if (doc.ownerId !== ctx.user.id) {
          const access = await checkDocumentAccess(
            input.documentId,
            ctx.user.id
          );
          if (!access) throw new TRPCError({ code: "FORBIDDEN" });
        }

        const operations = await getOperationsSince(
          input.documentId,
          input.fromVersion
        );
        return operations.map(op => ({
          id: op.id,
          clientId: op.clientId,
          userId: op.userId,
          updateData: op.updateData,
          lamportTime: op.lamportTime,
          vectorClock: op.vectorClock,
          version: op.version,
          createdAt: op.createdAt,
        }));
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Documents] Failed to get operations:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get operations",
        });
      }
    }),

  // Delete a document
  delete: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const doc = await getDocument(input.documentId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        // Only owner can delete
        if (doc.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await deleteDocument(input.documentId, ctx.user.id);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Documents] Failed to delete document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete document",
        });
      }
    }),
});
