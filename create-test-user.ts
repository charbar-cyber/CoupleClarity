import { storage } from "./server/storage";
import { hashPassword } from "./server/auth";

async function createTestUser() {
  const hashedPassword = await hashPassword("password123");
  
  console.log("Creating test user...");
  
  try {
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername("testuser");
    
    if (existingUser) {
      console.log("Test user already exists.");
      console.log("\nYou can login with:");
      console.log("Username: testuser");
      console.log("Password: password123");
      return;
    }
    
    // Create the test user
    const user = await storage.createUser({
      username: "testuser",
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      displayName: "Test User",
      avatarUrl: "",
      onboardingCompleted: true
    });
    
    console.log("Test user created successfully:", user);
    
    // Create user preferences
    const preferences = await storage.createUserPreferences({
      userId: user.id,
      loveLanguage: "quality_time",
      conflictStyle: "talk_calmly",
      communicationStyle: "supportive",
      repairStyle: "talking",
      preferredAiModel: "openai"
    });
    
    console.log("User preferences created:", preferences);
    
    console.log("\nYou can now login with:");
    console.log("Username: testuser");
    console.log("Password: password123");
  } catch (error) {
    console.error("Error creating test user:", error);
  }
}

createTestUser();