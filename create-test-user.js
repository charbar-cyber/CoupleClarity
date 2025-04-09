// create-test-user.js
const { hashPassword } = require('./server/auth');
const { storage } = require('./server/storage');

async function createTestUser() {
  try {
    // Check if test user exists
    const existingUser = await storage.getUserByUsername('testuser');
    
    if (existingUser) {
      console.log('Test user already exists with id:', existingUser.id);
      return;
    }
    
    // Hash password
    const hashedPassword = await hashPassword('password123');
    
    // Create test user
    const user = await storage.createUser({
      username: 'testuser',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      displayName: 'Test User'
    });
    
    console.log('Created test user with id:', user.id);
    
    // Create user preferences
    await storage.createUserPreferences({
      userId: user.id,
      loveLanguage: 'words_of_affirmation',
      conflictStyle: 'talk_calmly',
      communicationStyle: 'direct',
      repairStyle: 'apology',
      preferredAiModel: 'openai'
    });
    
    console.log('Created test user preferences');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();