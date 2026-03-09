import { describe, expect, it } from "vitest";
import { storage } from "./storage";
import { hasActivePartnershipBetween } from "./routes/direct-messages";
import { canCreateConflictWithPartner } from "./routes/conflicts";
import { canAccessSharedMessages, canRespondToSharedMessage } from "./routes/messages";

let userCounter = 0;

async function createUser(prefix: string) {
  userCounter += 1;
  return storage.createUser({
    username: `${prefix}_${userCounter}`,
    password: "test-password",
    firstName: prefix,
    lastName: "User",
    email: `${prefix}_${userCounter}@example.com`,
    displayName: `${prefix} User`,
  });
}

async function createActivePartnership(user1Id: number, user2Id: number) {
  const partnership = await storage.createPartnership({
    user1Id,
    user2Id,
  });

  return storage.updatePartnershipStatus(partnership.id, "active");
}

describe("Route access helpers", () => {
  it("requires an active partnership for direct messages", async () => {
    const user1 = await createUser("direct_a");
    const user2 = await createUser("direct_b");

    expect(await hasActivePartnershipBetween(user1.id, user2.id)).toBe(false);

    const pending = await storage.createPartnership({
      user1Id: user1.id,
      user2Id: user2.id,
    });

    expect(pending.status).toBe("pending");
    expect(await hasActivePartnershipBetween(user1.id, user2.id)).toBe(false);

    await storage.updatePartnershipStatus(pending.id, "active");
    expect(await hasActivePartnershipBetween(user1.id, user2.id)).toBe(true);
  });

  it("requires an active partnership to create conflict threads", async () => {
    const user1 = await createUser("conflict_a");
    const user2 = await createUser("conflict_b");

    expect(await canCreateConflictWithPartner(user1.id, user2.id)).toBe(false);

    await createActivePartnership(user1.id, user2.id);
    expect(await canCreateConflictWithPartner(user1.id, user2.id)).toBe(true);
  });

  it("only allows shared message access within an active partnership", async () => {
    const sender = await createUser("shared_sender");
    const partner = await createUser("shared_partner");
    const stranger = await createUser("shared_stranger");

    await createActivePartnership(sender.id, partner.id);

    expect(await canAccessSharedMessages(partner.id, sender.id)).toBe(true);
    expect(await canAccessSharedMessages(stranger.id, sender.id)).toBe(false);
  });

  it("only allows the designated partner in an active partnership to respond to a shared message", async () => {
    const sender = await createUser("response_sender");
    const partner = await createUser("response_partner");
    const stranger = await createUser("response_stranger");

    await createActivePartnership(sender.id, partner.id);

    const message = await storage.createMessage({
      userId: sender.id,
      emotion: "frustrated",
      rawMessage: "raw",
      context: "",
      transformedMessage: "transformed",
      communicationElements: JSON.stringify(["I statements"]),
      deliveryTips: JSON.stringify(["Stay calm"]),
      isShared: true,
      partnerId: partner.id,
    });

    expect(await canRespondToSharedMessage(message.id, partner.id)).toBe(true);
    expect(await canRespondToSharedMessage(message.id, stranger.id)).toBe(false);
  });
});
