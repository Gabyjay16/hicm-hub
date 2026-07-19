import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredLostItems } from "../functions/lib/lost-found-cleanup.js";

describe("lost and found expiry cleanup", () => {
  it("deletes expired records and their private images", async () => {
    const statements = [];
    const env = {
      DB: {
        prepare: (sql) => sql.includes("SELECT id, image_key")
          ? { all: async () => ({ results: [{ id: "item-1", image_key: "lost-found-images/item-1.webp" }] }) }
          : { bind: (...values) => ({ sql, values }) },
        batch: vi.fn(async (batch) => { statements.push(...batch); }),
      },
      UPLOADS: { delete: vi.fn(async () => {}) },
    };

    await expect(cleanupExpiredLostItems(env)).resolves.toBe(1);
    expect(env.UPLOADS.delete).toHaveBeenCalledWith("lost-found-images/item-1.webp");
    expect(statements[0].values).toEqual(["item-1"]);
  });

  it("does nothing when no resolved item has expired", async () => {
    const env = {
      DB: {
        prepare: () => ({ all: async () => ({ results: [] }) }),
        batch: vi.fn(),
      },
      UPLOADS: { delete: vi.fn() },
    };

    await expect(cleanupExpiredLostItems(env)).resolves.toBe(0);
    expect(env.DB.batch).not.toHaveBeenCalled();
    expect(env.UPLOADS.delete).not.toHaveBeenCalled();
  });
});
