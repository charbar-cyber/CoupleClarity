/**
 * Idempotent seed script — safe to run multiple times.
 * Usage: DATABASE_URL=<connection-string> npx tsx server/seed.ts
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { checkInPrompts, therapists } from "@shared/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  // ── Check-in prompts (insert only if table is empty) ──────────────
  const existingPrompts = await db.select({ count: sql<number>`count(*)::int` }).from(checkInPrompts);
  if (existingPrompts[0].count === 0) {
    await db.insert(checkInPrompts).values([
      { prompt: "What's one thing your partner did this week that made you feel appreciated?", category: "appreciation", active: true },
      { prompt: "Is there a conversation or topic you'd like to discuss with your partner this week?", category: "communication", active: true },
      { prompt: "What's one challenge you faced together this week, and how do you feel about how you handled it?", category: "challenges", active: true },
      { prompt: "What's one goal you have for your relationship in the coming week?", category: "goals", active: true },
    ]);
    console.log("Seeded 4 check-in prompts");
  } else {
    console.log(`Skipping check-in prompts (${existingPrompts[0].count} already exist)`);
  }

  // ── Therapists (insert only if table is empty) ─────────────────────
  const existingTherapists = await db.select({ count: sql<number>`count(*)::int` }).from(therapists);
  if (existingTherapists[0].count === 0) {
    await db.insert(therapists).values([
      {
        name: "Dr. Sarah Johnson",
        title: "Licensed Marriage and Family Therapist (LMFT)",
        bio: "Dr. Johnson has over 15 years of experience working with couples to improve communication and resolve conflicts. She specializes in emotion-focused therapy and has helped hundreds of couples rebuild trust and connection.",
        specialties: ["couples_counseling", "communication", "emotional_disconnect"],
        modalities: ["in_person", "online"],
        websiteUrl: "https://www.drjohnsontherapy.com",
        email: "dr.johnson@example.com",
        phoneNumber: "555-123-4567",
        imageUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e",
        location: "Los Angeles, CA",
        isVerified: true,
      },
      {
        name: "Mark Robinson, PhD",
        title: "Clinical Psychologist",
        bio: "Dr. Robinson focuses on helping couples navigate difficult transitions and heal from relationship trauma. His approach combines cognitive-behavioral techniques with mindfulness practices for lasting change.",
        specialties: ["trauma", "conflict_resolution", "couples_counseling"],
        modalities: ["online", "phone"],
        websiteUrl: "https://www.drrobinsontherapy.com",
        email: "m.robinson@example.com",
        phoneNumber: "555-987-6543",
        imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a",
        location: "New York, NY",
        isVerified: true,
      },
      {
        name: "Jennifer Lee, LCSW",
        title: "Licensed Clinical Social Worker",
        bio: "Jennifer specializes in helping couples build healthier communication patterns and develop effective conflict resolution skills. She has additional training in Gottman Method Couples Therapy.",
        specialties: ["communication", "conflict_resolution", "behavioral_therapy"],
        modalities: ["in_person", "online", "text_based"],
        websiteUrl: "https://www.jenniferleetherapy.com",
        email: "jennifer.lee@example.com",
        phoneNumber: "555-456-7890",
        imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        location: "Chicago, IL",
        isVerified: true,
      },
      {
        name: "David Chen, LMFT",
        title: "Licensed Marriage and Family Therapist",
        bio: "David helps couples and families heal from past conflicts and build stronger relationships. He specializes in multicultural couples therapy and intergenerational family dynamics.",
        specialties: ["family_therapy", "couples_counseling", "conflict_resolution"],
        modalities: ["in_person", "online"],
        websiteUrl: "https://www.davidchentherapy.com",
        email: "david.chen@example.com",
        phoneNumber: "555-789-0123",
        imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
        location: "San Francisco, CA",
        isVerified: true,
      },
      {
        name: "Amanda Wilson, PsyD",
        title: "Licensed Psychologist",
        bio: "Dr. Wilson specializes in helping couples recover from relationship challenges like infidelity and emotional disconnect. Her approach is compassionate, direct, and focused on practical solutions.",
        specialties: ["emotional_disconnect", "trauma", "behavioral_therapy"],
        modalities: ["online", "phone", "text_based"],
        websiteUrl: "https://www.amandawilsonpsyd.com",
        email: "a.wilson@example.com",
        phoneNumber: "555-234-5678",
        imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
        location: "Denver, CO",
        isVerified: true,
      },
    ]);
    console.log("Seeded 5 therapists");
  } else {
    console.log(`Skipping therapists (${existingTherapists[0].count} already exist)`);
  }

  console.log("Seed complete!");
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().then(() => process.exit(1));
  });
