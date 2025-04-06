import { 
  messages, type Message, type InsertMessage, 
  users, type User, type InsertUser,
  partnerships, type Partnership, type InsertPartnership,
  responses, type Response, type InsertResponse,
  inviteSchema, type Invite, type InsertInvite,
  userPreferences, type UserPreferences, type InsertUserPreferences,
  checkInPrompts, type CheckInPrompt, type InsertCheckInPrompt,
  checkInResponses, type CheckInResponse, type InsertCheckInResponse,
  appreciations, type Appreciation, type InsertAppreciation,
  conflictThreads, type ConflictThread, type InsertConflictThread,
  conflictMessages, type ConflictMessage, type InsertConflictMessage,
  directMessages, type DirectMessage, type InsertDirectMessage,
  memories, type Memory, type InsertMemory,
  therapists, type Therapist, type InsertTherapist,
  conflictStatusOptions,
  memoryTypes,
  therapistSpecialties,
  therapyModalities
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "crypto";

// Storage interface with CRUD methods
// Extend the SessionStore interface to include the get method
interface SessionStore extends session.Store {
  get: (sessionId: string, callback: (err: any, session?: any) => void) => void;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, userData: Partial<User>): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<User>;
  updateUserAvatar(userId: number, avatarUrl: string): Promise<User>;
  createPasswordResetToken(email: string): Promise<{token: string, userId: number} | null>;
  getPasswordResetToken(token: string): Promise<{userId: number, expiresAt: Date} | null>;
  invalidatePasswordResetToken(token: string): Promise<void>;
  
  // Partnership operations
  createPartnership(partnership: InsertPartnership): Promise<Partnership>;
  getPartnership(id: number): Promise<Partnership | undefined>;
  getPartnershipByUsers(user1Id: number, user2Id: number): Promise<Partnership | undefined>;
  getPartnershipsForUser(userId: number): Promise<Partnership[]>;
  updatePartnershipStatus(id: number, status: string): Promise<Partnership>;
  
  // Message storage operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByUserId(userId: number): Promise<Message[]>;
  getSharedMessagesForPartner(partnerId: number): Promise<Message[]>;
  searchMessages(userId: number, query: string): Promise<Message[]>;
  
  // Response operations
  createResponse(response: InsertResponse): Promise<Response>;
  getResponse(id: number): Promise<Response | undefined>;
  getResponsesByMessageId(messageId: number): Promise<Response[]>;
  
  // Invite operations
  createInvite(invite: InsertInvite, token: string): Promise<Invite>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  getInvitesByEmail(email: string): Promise<Invite[]>;
  updateInviteAccepted(id: number): Promise<Invite>;
  
  // User preferences operations
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: number, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  
  // Weekly check-in operations
  createCheckInPrompt(prompt: InsertCheckInPrompt): Promise<CheckInPrompt>;
  getActiveCheckInPrompts(limit?: number): Promise<CheckInPrompt[]>;
  getCheckInPrompt(id: number): Promise<CheckInPrompt | undefined>;
  createCheckInResponse(response: InsertCheckInResponse): Promise<CheckInResponse>;
  getUserCheckInResponses(userId: number, weekOf?: Date): Promise<CheckInResponse[]>;
  getLatestCheckInWeek(userId: number): Promise<Date | undefined>;
  
  // Appreciation log operations
  createAppreciation(appreciation: InsertAppreciation): Promise<Appreciation>;
  getAppreciationsByUserId(userId: number, limit?: number): Promise<Appreciation[]>;
  getAppreciation(id: number): Promise<Appreciation | undefined>;
  
  // Conflict thread operations
  createConflictThread(thread: InsertConflictThread): Promise<ConflictThread>;
  getConflictThread(id: number): Promise<ConflictThread | undefined>;
  getConflictThreadsByUserId(userId: number): Promise<ConflictThread[]>;
  getActiveConflictThreads(userId: number): Promise<ConflictThread[]>;
  updateConflictThreadStatus(id: number, status: string, summary?: string): Promise<ConflictThread>;
  updateConflictResolutionInsights(id: number, insights: string): Promise<ConflictThread>;
  updateConflictThreadLastActivity(id: number): Promise<ConflictThread>;
  markConflictThreadNeedsHelp(id: number, reason?: string): Promise<ConflictThread>;
  getStaleConflictThreads(thresholdHours: number): Promise<ConflictThread[]>;
  
  // Conflict message operations
  createConflictMessage(message: InsertConflictMessage): Promise<ConflictMessage>;
  getConflictMessagesByThreadId(threadId: number): Promise<ConflictMessage[]>;
  
  // Direct message operations
  createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage>;
  getDirectMessage(id: number): Promise<DirectMessage | undefined>;
  getUserDirectMessages(userId: number): Promise<DirectMessage[]>;
  getDirectMessageConversation(user1Id: number, user2Id: number, limit?: number): Promise<DirectMessage[]>;
  markDirectMessageAsRead(id: number): Promise<DirectMessage>;
  getUnreadDirectMessageCount(userId: number): Promise<number>;
  
  // Memory operations
  createMemory(memory: InsertMemory): Promise<Memory>;
  getMemory(id: number): Promise<Memory | undefined>;
  getMemoriesByUserId(userId: number, limit?: number): Promise<Memory[]>;
  getMemoriesByPartnershipId(partnershipId: number, limit?: number): Promise<Memory[]>;
  getSignificantMemories(partnershipId: number, limit?: number): Promise<Memory[]>;
  getMemoriesByType(partnershipId: number, type: string, limit?: number): Promise<Memory[]>;
  searchMemories(partnershipId: number, query: string): Promise<Memory[]>;
  updateMemory(id: number, memory: Partial<InsertMemory>): Promise<Memory>;
  deleteMemory(id: number): Promise<void>;
  
  // Therapist operations
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  getTherapist(id: number): Promise<Therapist | undefined>;
  getAllTherapists(): Promise<Therapist[]>;
  getTherapistsBySpecialty(specialty: string): Promise<Therapist[]>;
  getTherapistsByModality(modality: string): Promise<Therapist[]>;
  getRecommendedTherapists(specialties?: string[], modalities?: string[], limit?: number): Promise<Therapist[]>;
  
  // Session store
  sessionStore: SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private partnerships: Map<number, Partnership>;
  private responses: Map<number, Response>;
  private invites: Map<number, Invite>;
  private preferences: Map<number, UserPreferences>;
  private checkInPrompts: Map<number, CheckInPrompt>;
  private checkInResponses: Map<number, CheckInResponse>;
  private appreciations: Map<number, Appreciation>;
  private conflictThreads: Map<number, ConflictThread>;
  private conflictMessages: Map<number, ConflictMessage>;
  private directMessages: Map<number, DirectMessage>;
  private memories: Map<number, Memory>;
  private therapists: Map<number, Therapist>;
  private userIdCounter: number;
  private messageIdCounter: number;
  private partnershipIdCounter: number;
  private responseIdCounter: number;
  private inviteIdCounter: number;
  private preferencesIdCounter: number;
  private checkInPromptIdCounter: number;
  private checkInResponseIdCounter: number;
  private appreciationIdCounter: number;
  private conflictThreadIdCounter: number;
  private conflictMessageIdCounter: number;
  private directMessageIdCounter: number;
  private memoryIdCounter: number;
  private therapistIdCounter: number;
  sessionStore: session.Store;

  constructor() {
    // Initialize memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.users = new Map();
    this.messages = new Map();
    this.partnerships = new Map();
    this.responses = new Map();
    this.invites = new Map();
    this.preferences = new Map();
    this.checkInPrompts = new Map();
    this.checkInResponses = new Map();
    this.appreciations = new Map();
    this.conflictThreads = new Map();
    this.conflictMessages = new Map();
    this.directMessages = new Map();
    this.memories = new Map();
    this.therapists = new Map();
    this.userIdCounter = 1;
    this.messageIdCounter = 1;
    this.partnershipIdCounter = 1;
    this.responseIdCounter = 1;
    this.inviteIdCounter = 1;
    this.preferencesIdCounter = 1;
    this.checkInPromptIdCounter = 1;
    this.checkInResponseIdCounter = 1;
    this.appreciationIdCounter = 1;
    this.conflictThreadIdCounter = 1;
    this.conflictMessageIdCounter = 1;
    this.directMessageIdCounter = 1;
    this.memoryIdCounter = 1;
    this.therapistIdCounter = 1;
    
    // Create default users with hashed passwords
    // The hash of 'password' using our algorithm
    const hashedPassword = "1b5db04ba4332b716198835c09f9d07d5f3fe242aeee8f324c2bbc506fa1975c5ff25f3787650275c7b808b4fdce36cb48db9fdaff523bc6b75676ffc94dd906.2fa1a8cf45c71b32c2627a9eba6c24be";
    
    const user1 = this.createUser({
      username: "partner1",
      password: hashedPassword,
      firstName: "Alex",
      lastName: "Smith",
      email: "partner1@example.com",
      displayName: "Partner One"
    });
    
    const user2 = this.createUser({
      username: "partner2",
      password: hashedPassword,
      firstName: "Jordan",
      lastName: "Taylor",
      email: "partner2@example.com",
      displayName: "Partner Two"
    });
    
    // Create a partnership between the two users
    user1.then(u1 => {
      user2.then(u2 => {
        this.createPartnership({
          user1Id: u1.id,
          user2Id: u2.id
        }).then(partnership => {
          this.updatePartnershipStatus(partnership.id, "active");
        });
      });
    });
    
    // Create default check-in prompts
    this.createCheckInPrompt({
      prompt: "What's one thing your partner did this week that made you feel appreciated?",
      category: "appreciation"
    });
    
    this.createCheckInPrompt({
      prompt: "Is there a conversation or topic you'd like to discuss with your partner this week?",
      category: "communication"
    });
    
    this.createCheckInPrompt({
      prompt: "What's one challenge you faced together this week, and how do you feel about how you handled it?",
      category: "challenges"
    });
    
    this.createCheckInPrompt({
      prompt: "What's one goal you have for your relationship in the coming week?",
      category: "goals"
    });
    
    // Create default therapists
    this.createTherapist({
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
      isVerified: true
    });
    
    this.createTherapist({
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
      isVerified: true
    });
    
    this.createTherapist({
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
      isVerified: true
    });
    
    this.createTherapist({
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
      isVerified: true
    });
    
    this.createTherapist({
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
      isVerified: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      displayName: insertUser.displayName || `${insertUser.firstName} ${insertUser.lastName}`,
      avatarUrl: insertUser.avatarUrl || null,
      relationshipGoals: null,
      challengeAreas: null,
      communicationFrequency: null,
      onboardingCompleted: false
    };
    this.users.set(id, user);
    return user;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: now,
      context: insertMessage.context || null,
      isShared: insertMessage.isShared || false,
      partnerId: insertMessage.partnerId || null
    };
    
    this.messages.set(id, message);
    return message;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async searchMessages(userId: number, query: string): Promise<Message[]> {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.messages.values())
      .filter(message => 
        message.userId === userId && 
        (message.rawMessage.toLowerCase().includes(lowercaseQuery) ||
         message.transformedMessage.toLowerCase().includes(lowercaseQuery) ||
         message.emotion.toLowerCase().includes(lowercaseQuery))
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  // Partnership operations
  async createPartnership(insertPartnership: InsertPartnership): Promise<Partnership> {
    const id = this.partnershipIdCounter++;
    const now = new Date();
    
    // Create partnership with explicit properties to ensure type safety
    const partnership: Partnership = {
      id,
      user1Id: insertPartnership.user1Id,
      user2Id: insertPartnership.user2Id,
      status: "pending",
      createdAt: now,
      startDate: null // Always initialize as null, will be set when accepted
    };
    
    this.partnerships.set(id, partnership);
    return partnership;
  }
  
  async getPartnership(id: number): Promise<Partnership | undefined> {
    return this.partnerships.get(id);
  }
  
  async getPartnershipByUsers(user1Id: number, user2Id: number): Promise<Partnership | undefined> {
    return Array.from(this.partnerships.values()).find(
      (partnership) => 
        (partnership.user1Id === user1Id && partnership.user2Id === user2Id) ||
        (partnership.user1Id === user2Id && partnership.user2Id === user1Id)
    );
  }
  
  async getPartnershipsForUser(userId: number): Promise<Partnership[]> {
    return Array.from(this.partnerships.values())
      .filter(partnership => 
        partnership.user1Id === userId || partnership.user2Id === userId
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async updatePartnershipStatus(id: number, status: string): Promise<Partnership> {
    const partnership = await this.getPartnership(id);
    if (!partnership) {
      throw new Error(`Partnership with id ${id} not found`);
    }
    
    const updatedPartnership = {
      ...partnership,
      status
    };
    
    this.partnerships.set(id, updatedPartnership);
    return updatedPartnership;
  }
  
  // Shared messages
  async getSharedMessagesForPartner(partnerId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        message.isShared && message.partnerId === partnerId
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  // Response operations
  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const id = this.responseIdCounter++;
    const now = new Date();
    
    const response: Response = {
      ...insertResponse,
      id,
      createdAt: now,
      aiSummary: insertResponse.aiSummary || null
    };
    
    this.responses.set(id, response);
    return response;
  }
  
  async getResponse(id: number): Promise<Response | undefined> {
    return this.responses.get(id);
  }
  
  async getResponsesByMessageId(messageId: number): Promise<Response[]> {
    return Array.from(this.responses.values())
      .filter(response => response.messageId === messageId)
      .sort((a, b) => {
        // Sort by createdAt in ascending order (oldest first for conversation flow)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }
  
  // User operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  // Password reset operations
  private passwordResetTokens: Map<string, { userId: number, expiresAt: Date }> = new Map();
  
  async updateUserPassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update user password
    const updatedUser = { ...user, password: newPassword };
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async updateUserAvatar(userId: number, avatarUrl: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update user avatar
    const updatedUser = { ...user, avatarUrl };
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Create an updated user object with the supplied fields
    const updatedUser = { 
      ...user,
      ...userData,
      // Ensure these fields are properly preserved with defaults
      relationshipGoals: userData.relationshipGoals !== undefined ? userData.relationshipGoals : user.relationshipGoals || null,
      challengeAreas: userData.challengeAreas !== undefined ? userData.challengeAreas : user.challengeAreas || null,
      communicationFrequency: userData.communicationFrequency !== undefined ? userData.communicationFrequency : user.communicationFrequency || null,
      onboardingCompleted: userData.onboardingCompleted !== undefined ? userData.onboardingCompleted : user.onboardingCompleted || null
    };
    
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async createPasswordResetToken(email: string): Promise<{ token: string, userId: number } | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null; // User not found
    }
    
    // Generate a unique token using Node.js crypto module
    const token = crypto.randomUUID().replace(/-/g, '');
    
    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store the token
    this.passwordResetTokens.set(token, { userId: user.id, expiresAt });
    
    return { token, userId: user.id };
  }
  
  async getPasswordResetToken(token: string): Promise<{ userId: number, expiresAt: Date } | null> {
    const tokenData = this.passwordResetTokens.get(token);
    
    if (!tokenData) {
      return null;
    }
    
    // Check if token is expired
    if (new Date() > tokenData.expiresAt) {
      this.passwordResetTokens.delete(token);
      return null;
    }
    
    return tokenData;
  }
  
  async invalidatePasswordResetToken(token: string): Promise<void> {
    this.passwordResetTokens.delete(token);
  }
  
  // Invite operations
  async createInvite(invite: InsertInvite, token: string): Promise<Invite> {
    const id = this.inviteIdCounter++;
    const now = new Date();
    
    const newInvite: Invite = {
      ...invite,
      id,
      inviteToken: token,
      invitedAt: now,
      acceptedAt: null
    };
    
    this.invites.set(id, newInvite);
    return newInvite;
  }
  
  async getInviteByToken(token: string): Promise<Invite | undefined> {
    return Array.from(this.invites.values()).find(
      (invite) => invite.inviteToken === token
    );
  }
  
  async getInvitesByEmail(email: string): Promise<Invite[]> {
    return Array.from(this.invites.values())
      .filter(invite => invite.partnerEmail === email)
      .sort((a, b) => {
        // Sort by invitedAt in descending order (newest first)
        return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
      });
  }
  
  async updateInviteAccepted(id: number): Promise<Invite> {
    const invite = this.invites.get(id);
    if (!invite) {
      throw new Error(`Invite with id ${id} not found`);
    }
    
    const updatedInvite = {
      ...invite,
      acceptedAt: new Date()
    };
    
    this.invites.set(id, updatedInvite);
    return updatedInvite;
  }
  
  // User preferences operations
  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const id = this.preferencesIdCounter++;
    const now = new Date();
    
    // Check if preferences already exist for this user
    const existingPrefs = Array.from(this.preferences.values()).find(
      pref => pref.userId === insertPreferences.userId
    );
    
    if (existingPrefs) {
      throw new Error(`Preferences for user with id ${insertPreferences.userId} already exist`);
    }
    
    const preferences: UserPreferences = {
      ...insertPreferences,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.preferences.set(id, preferences);
    return preferences;
  }
  
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return Array.from(this.preferences.values()).find(
      pref => pref.userId === userId
    );
  }
  
  async updateUserPreferences(userId: number, updatedPreferences: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const userPrefs = await this.getUserPreferences(userId);
    if (!userPrefs) {
      throw new Error(`Preferences for user with id ${userId} not found`);
    }
    
    const now = new Date();
    const updatedPrefs: UserPreferences = {
      ...userPrefs,
      ...updatedPreferences,
      updatedAt: now
    };
    
    this.preferences.set(userPrefs.id, updatedPrefs);
    return updatedPrefs;
  }
  
  // Weekly check-in operations
  async createCheckInPrompt(prompt: InsertCheckInPrompt): Promise<CheckInPrompt> {
    const id = this.checkInPromptIdCounter++;
    const now = new Date();
    
    const checkInPrompt: CheckInPrompt = {
      ...prompt,
      id,
      createdAt: now,
      active: prompt.active ?? true
    };
    
    this.checkInPrompts.set(id, checkInPrompt);
    return checkInPrompt;
  }
  
  async getActiveCheckInPrompts(limit: number = 3): Promise<CheckInPrompt[]> {
    return Array.from(this.checkInPrompts.values())
      .filter(prompt => prompt.active)
      .sort(() => Math.random() - 0.5) // Randomly shuffle prompts
      .slice(0, limit);
  }
  
  async getCheckInPrompt(id: number): Promise<CheckInPrompt | undefined> {
    return this.checkInPrompts.get(id);
  }
  
  async createCheckInResponse(insertResponse: InsertCheckInResponse): Promise<CheckInResponse> {
    const id = this.checkInResponseIdCounter++;
    const now = new Date();
    
    const checkInResponse: CheckInResponse = {
      ...insertResponse,
      id,
      createdAt: now,
      isShared: insertResponse.isShared ?? false
    };
    
    this.checkInResponses.set(id, checkInResponse);
    return checkInResponse;
  }
  
  async getUserCheckInResponses(userId: number, weekOf?: Date): Promise<CheckInResponse[]> {
    const responses = Array.from(this.checkInResponses.values())
      .filter(response => response.userId === userId);
      
    if (weekOf) {
      // Filter by week
      const weekStart = this.getWeekStart(weekOf);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      return responses.filter(response => {
        const responseDate = new Date(response.weekOf);
        return responseDate >= weekStart && responseDate < weekEnd;
      });
    }
    
    return responses.sort((a, b) => {
      // Sort by createdAt in descending order (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  async getLatestCheckInWeek(userId: number): Promise<Date | undefined> {
    const userResponses = Array.from(this.checkInResponses.values())
      .filter(response => response.userId === userId)
      .sort((a, b) => {
        // Sort by weekOf in descending order (newest first)
        return new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime();
      });
    
    if (userResponses.length === 0) {
      return undefined;
    }
    
    return new Date(userResponses[0].weekOf);
  }
  
  // Helper method to get the start of a week (Sunday)
  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day); // Go to Sunday
    result.setHours(0, 0, 0, 0); // Set to beginning of day
    return result;
  }
  
  // Appreciation log operations
  
  async createAppreciation(appreciation: InsertAppreciation): Promise<Appreciation> {
    const id = this.appreciationIdCounter++;
    const now = new Date();
    
    const newAppreciation: Appreciation = {
      ...appreciation,
      id,
      createdAt: now
    };
    
    this.appreciations.set(id, newAppreciation);
    return newAppreciation;
  }
  
  async getAppreciationsByUserId(userId: number, limit: number = 5): Promise<Appreciation[]> {
    return Array.from(this.appreciations.values())
      .filter(appreciation => appreciation.userId === userId)
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);
  }
  
  async getAppreciation(id: number): Promise<Appreciation | undefined> {
    return this.appreciations.get(id);
  }
  
  // Conflict thread operations
  
  async createConflictThread(thread: InsertConflictThread): Promise<ConflictThread> {
    const id = this.conflictThreadIdCounter++;
    const now = new Date();
    
    // Create conflict thread with explicit properties to ensure type safety
    const conflictThread: ConflictThread = {
      id,
      userId: thread.userId,
      partnerId: thread.partnerId,
      topic: thread.topic,
      status: "active",
      createdAt: now,
      lastActivityAt: now,
      resolvedAt: null,
      resolutionSummary: null,
      resolutionInsights: null,
      needsExtraHelp: false,
      stuckReason: null
    };
    
    this.conflictThreads.set(id, conflictThread);
    return conflictThread;
  }
  
  async getConflictThread(id: number): Promise<ConflictThread | undefined> {
    return this.conflictThreads.get(id);
  }
  
  async getConflictThreadsByUserId(userId: number): Promise<ConflictThread[]> {
    return Array.from(this.conflictThreads.values())
      .filter(thread => thread.userId === userId || thread.partnerId === userId)
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async getActiveConflictThreads(userId: number): Promise<ConflictThread[]> {
    return Array.from(this.conflictThreads.values())
      .filter(thread => 
        (thread.userId === userId || thread.partnerId === userId) && 
        thread.status === "active"
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async updateConflictThreadStatus(id: number, status: string, summary?: string): Promise<ConflictThread> {
    const thread = await this.getConflictThread(id);
    if (!thread) {
      throw new Error(`Conflict thread with id ${id} not found`);
    }
    
    const now = new Date();
    const updatedThread: ConflictThread = {
      ...thread,
      status: status as typeof conflictStatusOptions[number],
      resolvedAt: status === "resolved" ? now : thread.resolvedAt,
      resolutionSummary: summary ? summary : thread.resolutionSummary
    };
    
    this.conflictThreads.set(id, updatedThread);
    return updatedThread;
  }
  
  async updateConflictResolutionInsights(id: number, insights: string): Promise<ConflictThread> {
    const thread = await this.getConflictThread(id);
    if (!thread) {
      throw new Error(`Conflict thread with id ${id} not found`);
    }
    
    const updatedThread = {
      ...thread,
      resolutionInsights: insights
    };
    
    this.conflictThreads.set(id, updatedThread);
    return updatedThread;
  }
  
  async updateConflictThreadLastActivity(id: number): Promise<ConflictThread> {
    const thread = await this.getConflictThread(id);
    if (!thread) {
      throw new Error(`Conflict thread with id ${id} not found`);
    }
    
    const now = new Date();
    const updatedThread: ConflictThread = {
      ...thread,
      lastActivityAt: now
    };
    
    this.conflictThreads.set(id, updatedThread);
    return updatedThread;
  }
  
  async markConflictThreadNeedsHelp(id: number, reason?: string): Promise<ConflictThread> {
    const thread = await this.getConflictThread(id);
    if (!thread) {
      throw new Error(`Conflict thread with id ${id} not found`);
    }
    
    const updatedThread: ConflictThread = {
      ...thread,
      needsExtraHelp: true,
      stuckReason: reason || thread.stuckReason
    };
    
    this.conflictThreads.set(id, updatedThread);
    return updatedThread;
  }
  
  async getStaleConflictThreads(thresholdHours: number): Promise<ConflictThread[]> {
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - (thresholdHours * 60 * 60 * 1000));
    
    return Array.from(this.conflictThreads.values())
      .filter(thread => 
        thread.status === "active" && 
        new Date(thread.lastActivityAt) < thresholdTime
      )
      .sort((a, b) => {
        // Sort by lastActivityAt in ascending order (oldest first)
        return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
      });
  }
  
  async createConflictMessage(message: InsertConflictMessage): Promise<ConflictMessage> {
    const id = this.conflictMessageIdCounter++;
    const now = new Date();
    
    const conflictMessage: ConflictMessage = {
      ...message,
      id,
      createdAt: now,
      emotionalTone: message.emotionalTone || null,
      messageType: message.messageType || "user"
    };
    
    this.conflictMessages.set(id, conflictMessage);
    return conflictMessage;
  }
  
  async getConflictMessagesByThreadId(threadId: number): Promise<ConflictMessage[]> {
    return Array.from(this.conflictMessages.values())
      .filter(message => message.threadId === threadId)
      .sort((a, b) => {
        // Sort by createdAt in ascending order (oldest first for conversation flow)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }
  
  // Direct message operations
  
  async createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage> {
    const id = this.directMessageIdCounter++;
    const now = new Date();
    
    const directMessage: DirectMessage = {
      ...message,
      id,
      isRead: false,
      createdAt: now
    };
    
    this.directMessages.set(id, directMessage);
    return directMessage;
  }
  
  async getDirectMessage(id: number): Promise<DirectMessage | undefined> {
    return this.directMessages.get(id);
  }
  
  async getUserDirectMessages(userId: number): Promise<DirectMessage[]> {
    return Array.from(this.directMessages.values())
      .filter(message => message.recipientId === userId || message.senderId === userId)
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async getDirectMessageConversation(user1Id: number, user2Id: number, limit: number = 50): Promise<DirectMessage[]> {
    return Array.from(this.directMessages.values())
      .filter(message => 
        (message.senderId === user1Id && message.recipientId === user2Id) ||
        (message.senderId === user2Id && message.recipientId === user1Id)
      )
      .sort((a, b) => {
        // Sort by createdAt in ascending order (oldest first for conversation flow)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .slice(-limit); // Get the most recent messages up to the limit
  }
  
  async markDirectMessageAsRead(id: number): Promise<DirectMessage> {
    const message = await this.getDirectMessage(id);
    if (!message) {
      throw new Error(`Direct message with id ${id} not found`);
    }
    
    const updatedMessage = {
      ...message,
      isRead: true
    };
    
    this.directMessages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async getUnreadDirectMessageCount(userId: number): Promise<number> {
    return Array.from(this.directMessages.values())
      .filter(message => message.recipientId === userId && !message.isRead)
      .length;
  }
  
  // Memory operations
  async createMemory(memory: InsertMemory): Promise<Memory> {
    const id = this.memoryIdCounter++;
    const now = new Date();
    
    const newMemory: Memory = {
      id,
      title: memory.title,
      description: memory.description,
      type: memory.type as typeof memoryTypes[number],
      userId: memory.userId,
      partnershipId: memory.partnershipId,
      date: memory.date || now,
      createdAt: now,
      isSignificant: memory.isSignificant || false,
      linkedItemId: memory.linkedItemId || null,
      linkedItemType: memory.linkedItemType || null,
      imageUrl: memory.imageUrl || null,
      tags: memory.tags || []
    };
    
    this.memories.set(id, newMemory);
    return newMemory;
  }
  
  async getMemory(id: number): Promise<Memory | undefined> {
    return this.memories.get(id);
  }
  
  async getMemoriesByUserId(userId: number, limit: number = 20): Promise<Memory[]> {
    return Array.from(this.memories.values())
      .filter(memory => memory.userId === userId)
      .sort((a, b) => {
        // Sort by date in descending order (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, limit);
  }
  
  async getMemoriesByPartnershipId(partnershipId: number, limit: number = 20): Promise<Memory[]> {
    return Array.from(this.memories.values())
      .filter(memory => memory.partnershipId === partnershipId)
      .sort((a, b) => {
        // Sort by date in descending order (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, limit);
  }
  
  async getSignificantMemories(partnershipId: number, limit: number = 10): Promise<Memory[]> {
    return Array.from(this.memories.values())
      .filter(memory => memory.partnershipId === partnershipId && memory.isSignificant)
      .sort((a, b) => {
        // Sort by date in descending order (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, limit);
  }
  
  async getMemoriesByType(partnershipId: number, type: string, limit: number = 10): Promise<Memory[]> {
    if (!memoryTypes.includes(type as any)) {
      throw new Error(`Invalid memory type: ${type}`);
    }
    
    return Array.from(this.memories.values())
      .filter(memory => memory.partnershipId === partnershipId && memory.type === type)
      .sort((a, b) => {
        // Sort by date in descending order (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, limit);
  }
  
  async searchMemories(partnershipId: number, query: string): Promise<Memory[]> {
    const lowercaseQuery = query.toLowerCase();
    
    return Array.from(this.memories.values())
      .filter(memory => 
        memory.partnershipId === partnershipId && 
        (memory.title.toLowerCase().includes(lowercaseQuery) ||
         memory.description.toLowerCase().includes(lowercaseQuery) ||
         (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))))
      )
      .sort((a, b) => {
        // Sort by date in descending order (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }
  
  async updateMemory(id: number, memoryUpdate: Partial<InsertMemory>): Promise<Memory> {
    const memory = await this.getMemory(id);
    if (!memory) {
      throw new Error(`Memory with id ${id} not found`);
    }
    
    const updatedMemory: Memory = {
      id,
      title: memoryUpdate.title || memory.title,
      description: memoryUpdate.description || memory.description,
      type: (memoryUpdate.type || memory.type) as typeof memoryTypes[number],
      userId: memory.userId,
      partnershipId: memory.partnershipId,
      date: memoryUpdate.date || memory.date,
      createdAt: memory.createdAt,
      isSignificant: memoryUpdate.isSignificant !== undefined ? memoryUpdate.isSignificant : memory.isSignificant,
      linkedItemId: memoryUpdate.linkedItemId !== undefined ? memoryUpdate.linkedItemId : memory.linkedItemId,
      linkedItemType: memoryUpdate.linkedItemType !== undefined ? memoryUpdate.linkedItemType : memory.linkedItemType,
      imageUrl: memoryUpdate.imageUrl !== undefined ? memoryUpdate.imageUrl : memory.imageUrl,
      tags: memoryUpdate.tags || memory.tags
    };
    
    this.memories.set(id, updatedMemory);
    return updatedMemory;
  }
  
  async deleteMemory(id: number): Promise<void> {
    if (!this.memories.has(id)) {
      throw new Error(`Memory with id ${id} not found`);
    }
    
    this.memories.delete(id);
  }
  
  // Therapist operations
  async createTherapist(therapist: InsertTherapist): Promise<Therapist> {
    const id = this.therapistIdCounter++;
    const now = new Date();
    
    const newTherapist: Therapist = {
      id,
      name: therapist.name,
      title: therapist.title,
      bio: therapist.bio,
      specialties: therapist.specialties,
      modalities: therapist.modalities,
      createdAt: now,
      isVerified: therapist.isVerified || false,
      email: therapist.email || null,
      phoneNumber: therapist.phoneNumber || null,
      websiteUrl: therapist.websiteUrl || null,
      imageUrl: therapist.imageUrl || null,
      location: therapist.location || null
    };
    
    this.therapists.set(id, newTherapist);
    return newTherapist;
  }
  
  async getTherapist(id: number): Promise<Therapist | undefined> {
    return this.therapists.get(id);
  }
  
  async getAllTherapists(): Promise<Therapist[]> {
    return Array.from(this.therapists.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getTherapistsBySpecialty(specialty: string): Promise<Therapist[]> {
    if (!therapistSpecialties.includes(specialty as any)) {
      throw new Error(`Invalid therapist specialty: ${specialty}`);
    }
    
    return Array.from(this.therapists.values())
      .filter(therapist => therapist.specialties.includes(specialty))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getTherapistsByModality(modality: string): Promise<Therapist[]> {
    if (!therapyModalities.includes(modality as any)) {
      throw new Error(`Invalid therapy modality: ${modality}`);
    }
    
    return Array.from(this.therapists.values())
      .filter(therapist => therapist.modalities.includes(modality))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getRecommendedTherapists(specialties?: string[], modalities?: string[], limit: number = 5): Promise<Therapist[]> {
    let filteredTherapists = Array.from(this.therapists.values());
    
    // Filter by specialties if provided
    if (specialties && specialties.length > 0) {
      filteredTherapists = filteredTherapists.filter(therapist => 
        specialties.some(specialty => therapist.specialties.includes(specialty))
      );
    }
    
    // Filter by modalities if provided
    if (modalities && modalities.length > 0) {
      filteredTherapists = filteredTherapists.filter(therapist => 
        modalities.some(modality => therapist.modalities.includes(modality))
      );
    }
    
    // Sort by relevance (more matching specialties and modalities first)
    filteredTherapists.sort((a, b) => {
      // Count the number of matching specialties and modalities
      const aScore = (specialties ? specialties.filter(s => a.specialties.includes(s)).length : 0) +
                    (modalities ? modalities.filter(m => a.modalities.includes(m)).length : 0);
      const bScore = (specialties ? specialties.filter(s => b.specialties.includes(s)).length : 0) +
                    (modalities ? modalities.filter(m => b.modalities.includes(m)).length : 0);
      
      // Sort by score in descending order (higher score first)
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      
      // If scores are the same, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return filteredTherapists.slice(0, limit);
  }
}

export const storage = new MemStorage();
