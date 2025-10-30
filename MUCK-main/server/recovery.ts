import * as Y from "yjs";
import {
  addOfflineOperation,
  getOfflineQueue,
  clearOfflineQueue,
} from "./db";

/**
 * Offline Recovery Manager
 * Handles queuing and recovering from offline edits
 */
export class OfflineRecoveryManager {
  static async queueOfflineOperation(
    clientId: string,
    documentId: number,
    update: Uint8Array,
    sequenceNumber: number
  ): Promise<void> {
    const updateBase64 = Buffer.from(update).toString("base64");
    await addOfflineOperation(clientId, documentId, updateBase64, sequenceNumber);
  }

  static async recoverOfflineOperations(
    clientId: string,
    documentId: number,
    ydoc: Y.Doc
  ): Promise<{ recovered: number; conflicts: number }> {
    try {
      const queuedOps = await getOfflineQueue(clientId, documentId);
      if (queuedOps.length === 0) {
        return { recovered: 0, conflicts: 0 };
      }

      let recovered = 0;
      let conflicts = 0;

      for (const queuedOp of queuedOps) {
        try {
          const update = Buffer.from(queuedOp.updateData, "base64");
          Y.applyUpdate(ydoc, new Uint8Array(update));
          recovered++;
        } catch (error) {
          console.error("[Recovery] Failed to apply operation:", error);
          conflicts++;
        }
      }

      await clearOfflineQueue(clientId, documentId);
      console.log(`[Recovery] Recovered ${recovered} ops, ${conflicts} conflicts`);
      return { recovered, conflicts };
    } catch (error) {
      console.error("[Recovery] Failed:", error);
      throw error;
    }
  }
}
