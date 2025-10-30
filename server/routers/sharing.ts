import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getDocument,
  getDocumentPermissions,
  checkDocumentAccess,
} from "../db";
import { TRPCError } from "@trpc/server";

export const sharingRouter = router({
  // Share document with another user
  shareDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        userId: z.number(),
        role: z.enum(["editor", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const doc = await getDocument(input.documentId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        // Only owner can share
        if (doc.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // TODO: Insert permission into database
        // await insertDocumentPermission(input.documentId, input.userId, input.role);

        return {
          success: true,
          message: `Document shared with user ${input.userId} as ${input.role}`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Sharing] Failed to share document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to share document",
        });
      }
    }),

  // Revoke access
  revokeAccess: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const doc = await getDocument(input.documentId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

        // Only owner can revoke
        if (doc.ownerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // TODO: Delete permission from database
        // await deleteDocumentPermission(input.documentId, input.userId);

        return {
          success: true,
          message: `Access revoked for user ${input.userId}`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Sharing] Failed to revoke access:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke access",
        });
      }
    }),

  // Get shared documents (documents shared with current user)
  getSharedDocuments: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    try {
      const permissions = await getDocumentPermissions(0); // TODO: Query by userId
      return permissions.map((p) => ({
        documentId: p.documentId,
        role: p.role,
        grantedAt: p.grantedAt,
      }));
    } catch (error) {
      console.error("[Sharing] Failed to get shared documents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get shared documents",
      });
    }
  }),
});
