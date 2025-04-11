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
  pushSubscriptions, type PushSubscription, type InsertPushSubscription,
  notificationPreferences, type NotificationPreferences, type InsertNotificationPreferences,
  currentEmotions, type CurrentEmotion, type InsertCurrentEmotion,
  relationshipMilestones, type Milestone, type InsertMilestone,
  communicationExercises, type CommunicationExercise, type InsertExercise,
  exerciseSteps, type ExerciseStep, type InsertExerciseStep,
  exerciseResponses, type ExerciseResponse, type InsertExerciseResponse,
  exerciseTemplates, type ExerciseTemplate, type InsertExerciseTemplate,
  exerciseTypeOptions, exerciseStatusOptions,
  conflictStatusOptions,
  memoryTypes,
  therapistSpecialties,
  therapyModalities,
  relationshipTypeOptions,
  privacyLevelOptions,
  milestoneTypeOptions
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
  getPartnershipByUser(userId: number): Promise<Partnership | undefined>;
  getPartnershipsForUser(userId: number): Promise<Partnership[]>;
  updatePartnershipStatus(id: number, status: string): Promise<Partnership>;
  updatePartnershipProfile(id: number, profileData: Partial<InsertPartnership>): Promise<Partnership>;
  
  // Milestone operations
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  getMilestonesByPartnership(partnershipId: number): Promise<Milestone[]>;
  getMilestonesByType(partnershipId: number, type: string): Promise<Milestone[]>;
  updateMilestone(id: number, milestoneData: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;
  
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
  
  // Journal entry operations
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getUserJournalEntries(userId: number, isPrivate?: boolean, limit?: number): Promise<JournalEntry[]>;
  getSharedJournalEntries(userId: number, partnerId: number, limit?: number): Promise<JournalEntry[]>;
  updateJournalEntry(id: number, data: Partial<InsertJournalEntry>): Promise<JournalEntry>;
  deleteJournalEntry(id: number): Promise<void>;
  
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
  
  // Push notification operations
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscription(id: number): Promise<PushSubscription | undefined>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]>;
  deletePushSubscription(id: number): Promise<void>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>;
  saveNotificationSubscription(userId: number, subscription: any): Promise<PushSubscription>;
  removeNotificationSubscription(userId: number, endpoint: string): Promise<void>;
  getNotificationSubscriptions(userId: number): Promise<PushSubscription[]>;
  
  // Notification preferences operations
  createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences>;
  getNotificationPreferences(userId: number): Promise<NotificationPreferences | undefined>;
  updateNotificationPreferences(userId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences>;
  
  // Current emotions operations
  getCurrentEmotion(userId: number): Promise<CurrentEmotion | undefined>;
  setCurrentEmotion(emotion: InsertCurrentEmotion): Promise<CurrentEmotion>;
  updateCurrentEmotion(userId: number, emotion: Partial<InsertCurrentEmotion>): Promise<CurrentEmotion>;
  getPartnerCurrentEmotion(userId: number): Promise<CurrentEmotion | undefined>;
  
  // Communication exercise operations
  createExerciseTemplate(template: InsertExerciseTemplate): Promise<ExerciseTemplate>;
  getExerciseTemplate(id: number): Promise<ExerciseTemplate | undefined>;
  getExerciseTemplates(type?: string, difficultyLevel?: string): Promise<ExerciseTemplate[]>;
  
  createExercise(exercise: InsertExercise): Promise<CommunicationExercise>;
  getExerciseById(id: number): Promise<CommunicationExercise | undefined>;
  getExercisesByPartnership(partnershipId: number, status?: string): Promise<CommunicationExercise[]>;
  getExercisesForUser(userId: number, status?: string): Promise<CommunicationExercise[]>;
  updateExerciseStatus(id: number, status: string): Promise<CommunicationExercise>;
  updateExerciseCurrentStep(id: number, stepNumber: number): Promise<CommunicationExercise>;
  updateExerciseCurrentUser(id: number, userId: number): Promise<CommunicationExercise>;
  completeExercise(id: number): Promise<CommunicationExercise>;
  
  createExerciseStep(step: InsertExerciseStep): Promise<ExerciseStep>;
  getExerciseStepById(id: number): Promise<ExerciseStep | undefined>;
  getExerciseSteps(exerciseId: number): Promise<ExerciseStep[]>;
  getExerciseStepByNumber(exerciseId: number, stepNumber: number): Promise<ExerciseStep | undefined>;
  
  createExerciseResponse(response: InsertExerciseResponse): Promise<ExerciseResponse>;
  getExerciseResponses(exerciseId: number, userId?: number): Promise<ExerciseResponse[]>;
  getExerciseStepResponses(stepId: number): Promise<ExerciseResponse[]>;
  getUserResponseForStep(stepId: number, userId: number): Promise<ExerciseResponse | undefined>;

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
  private pushSubscriptions: Map<number, PushSubscription>;
  private notificationPrefs: Map<number, NotificationPreferences>;
  private currentEmotions: Map<number, CurrentEmotion>;
  private relationshipMilestones: Map<number, Milestone>;
  private communicationExercises: Map<number, CommunicationExercise>;
  private exerciseSteps: Map<number, ExerciseStep>;
  private exerciseResponses: Map<number, ExerciseResponse>;
  private exerciseTemplates: Map<number, ExerciseTemplate>;
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
  private pushSubscriptionIdCounter: number;
  private notificationPrefsIdCounter: number;
  private milestoneIdCounter: number;
  private exerciseIdCounter: number;
  private exerciseStepIdCounter: number;
  private exerciseResponseIdCounter: number;
  private exerciseTemplateIdCounter: number;
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
    this.pushSubscriptions = new Map();
    this.notificationPrefs = new Map();
    this.currentEmotions = new Map();
    this.relationshipMilestones = new Map();
    this.communicationExercises = new Map();
    this.exerciseSteps = new Map();
    this.exerciseResponses = new Map();
    this.exerciseTemplates = new Map();
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
    this.pushSubscriptionIdCounter = 1;
    this.notificationPrefsIdCounter = 1;
    this.milestoneIdCounter = 1;
    this.exerciseIdCounter = 1;
    this.exerciseStepIdCounter = 1;
    this.exerciseResponseIdCounter = 1;
    this.exerciseTemplateIdCounter = 1;
    
    // Create default users with hashed passwords
    // The hash of 'password' using our algorithm
    const hashedPassword = "1b5db04ba4332b716198835c09f9d07d5f3fe242aeee8f324c2bbc506fa1975c5ff25f3787650275c7b808b4fdce36cb48db9fdaff523bc6b75676ffc94dd906.2fa1a8cf45c71b32c2627a9eba6c24be";
    
    // The hash of 'password123' using our algorithm
    const password123Hash = "0e8c16fc0702ba627980910437820ef147228f45021a50c3dff80776d3cb691e8b7e05d4416d13c8ee2d770bdca3277601efc5b09635bea580cd9ec2e4e5755b.a0c4cd0fd4e96b6e8a9f29f9418ec691";
    
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
    
    // Create a test user with known credentials
    const testUser = this.createUser({
      username: "testuser",
      password: password123Hash,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      displayName: "Test User"
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
    console.log(`Searching for user with username: ${username}`);
    const normalizedUsername = username.toLowerCase().trim();
    
    const allUsers = Array.from(this.users.values());
    
    // Case insensitive username comparison
    const user = allUsers.find(
      (user) => user.username.toLowerCase().trim() === normalizedUsername
    );
    
    console.log(user ? `Found user: ${user.username} (ID: ${user.id})` : 'No user found with this username');
    return user;
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
      startDate: null, // Always initialize as null, will be set when accepted
      relationshipType: null,
      anniversaryDate: null,
      meetingStory: null,
      coupleNickname: null,
      sharedPicture: null,
      relationshipGoals: null,
      privacyLevel: "standard"
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
  
  async getPartnershipByUser(userId: number): Promise<Partnership | undefined> {
    // Find the first active partnership for this user, or return the first one if no active partnership exists
    const partnerships = await this.getPartnershipsForUser(userId);
    if (partnerships.length === 0) {
      return undefined;
    }
    
    // Try to find an active partnership first
    const activePartnership = partnerships.find(p => p.status === "active");
    return activePartnership || partnerships[0];
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
  
  async updatePartnershipProfile(id: number, profileData: Partial<InsertPartnership>): Promise<Partnership> {
    const partnership = await this.getPartnership(id);
    if (!partnership) {
      throw new Error(`Partnership with id ${id} not found`);
    }
    
    const updatedPartnership = {
      ...partnership,
      ...profileData
    };
    
    this.partnerships.set(id, updatedPartnership);
    return updatedPartnership;
  }
  
  // Milestone operations
  
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const id = this.milestoneIdCounter++;
    const newMilestone: Milestone = {
      ...milestone,
      id,
      createdAt: new Date(),
      description: milestone.description || null,
      imageUrl: milestone.imageUrl || null,
      isPrivate: milestone.isPrivate || false
    };
    
    this.relationshipMilestones.set(id, newMilestone);
    return newMilestone;
  }
  
  async getMilestone(id: number): Promise<Milestone | undefined> {
    return this.relationshipMilestones.get(id);
  }
  
  async getMilestonesByPartnership(partnershipId: number): Promise<Milestone[]> {
    return Array.from(this.relationshipMilestones.values())
      .filter(milestone => milestone.partnershipId === partnershipId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getMilestonesByType(partnershipId: number, type: string): Promise<Milestone[]> {
    return Array.from(this.relationshipMilestones.values())
      .filter(milestone => milestone.partnershipId === partnershipId && milestone.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async updateMilestone(id: number, milestoneData: Partial<InsertMilestone>): Promise<Milestone> {
    const milestone = await this.getMilestone(id);
    if (!milestone) {
      throw new Error(`Milestone with id ${id} not found`);
    }
    
    const updatedMilestone = {
      ...milestone,
      ...milestoneData
    };
    
    this.relationshipMilestones.set(id, updatedMilestone);
    return updatedMilestone;
  }
  
  async deleteMilestone(id: number): Promise<void> {
    if (!this.relationshipMilestones.has(id)) {
      throw new Error(`Milestone with id ${id} not found`);
    }
    
    this.relationshipMilestones.delete(id);
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
    console.log(`Searching for user with email: ${email}`);
    const normalizedEmail = email.toLowerCase().trim();
    
    const allUsers = Array.from(this.users.values());
    console.log(`Total users in database: ${allUsers.length}`);
    
    // Debug output of all users in the system
    allUsers.forEach(user => {
      console.log(`User ID: ${user.id}, Name: ${user.firstName} ${user.lastName}, Email: ${user.email}`);
    });
    
    // Case insensitive email comparison
    const user = allUsers.find(
      (user) => user.email.toLowerCase().trim() === normalizedEmail
    );
    
    console.log(user ? `Found user: ${user.username}` : 'No user found with this email');
    return user;
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
    console.log(`Looking for invite with token: ${token}`);
    
    const allInvites = Array.from(this.invites.values());
    console.log(`Total invites in database: ${allInvites.length}`);
    
    if (allInvites.length > 0) {
      console.log('Existing invite tokens:');
      allInvites.forEach(invite => {
        console.log(`- Token: ${invite.inviteToken}, From: ${invite.fromUserId}, Partner Email: ${invite.partnerEmail}, Accepted: ${invite.acceptedAt ? 'Yes' : 'No'}`);
      });
    }
    
    const invite = allInvites.find(
      (invite) => invite.inviteToken === token
    );
    
    console.log(invite ? `Found invite from user ID: ${invite.fromUserId}` : 'No invite found with this token');
    return invite;
  }
  
  async getInvitesByEmail(email: string): Promise<Invite[]> {
    console.log(`Looking for invites with email: ${email}`);
    const normalizedEmail = email.toLowerCase().trim();
    
    const invites = Array.from(this.invites.values())
      .filter(invite => invite.partnerEmail.toLowerCase().trim() === normalizedEmail)
      .sort((a, b) => {
        // Sort by invitedAt in descending order (newest first)
        return new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime();
      });
      
    console.log(`Found ${invites.length} invites for email: ${email}`);
    return invites;
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
    
    // Ensure preferredAiModel has a value
    const preferredAiModel = insertPreferences.preferredAiModel || 'openai';
    
    const preferences: UserPreferences = {
      ...insertPreferences,
      preferredAiModel,
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
    
    // Handle preferredAiModel update separately to ensure it's never undefined
    const preferredAiModel = updatedPreferences.preferredAiModel !== undefined ? 
      updatedPreferences.preferredAiModel : userPrefs.preferredAiModel;
      
    const updatedPrefs: UserPreferences = {
      ...userPrefs,
      ...updatedPreferences,
      preferredAiModel, // Explicitly set this to avoid type errors
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

  // Push subscription operations
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = this.pushSubscriptionIdCounter++;
    const now = new Date();
    
    const newSubscription: PushSubscription = {
      ...subscription,
      id,
      createdAt: now
    };
    
    this.pushSubscriptions.set(id, newSubscription);
    return newSubscription;
  }
  
  async getPushSubscription(id: number): Promise<PushSubscription | undefined> {
    return this.pushSubscriptions.get(id);
  }
  
  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    return Array.from(this.pushSubscriptions.values()).find(
      (subscription) => subscription.endpoint === endpoint
    );
  }
  
  async getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values())
      .filter(subscription => subscription.userId === userId);
  }
  
  async deletePushSubscription(id: number): Promise<void> {
    this.pushSubscriptions.delete(id);
  }
  
  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    const subscription = await this.getPushSubscriptionByEndpoint(endpoint);
    if (subscription) {
      this.pushSubscriptions.delete(subscription.id);
    }
  }
  
  async saveNotificationSubscription(userId: number, subscription: any): Promise<PushSubscription> {
    // First check if this endpoint already exists
    const existingSubscription = await this.getPushSubscriptionByEndpoint(subscription.endpoint);
    
    if (existingSubscription) {
      // If it exists, just return it
      return existingSubscription;
    }
    
    // Otherwise, create a new subscription
    return this.createPushSubscription({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    });
  }
  
  async removeNotificationSubscription(userId: number, endpoint: string): Promise<void> {
    await this.deletePushSubscriptionByEndpoint(endpoint);
  }
  
  async getNotificationSubscriptions(userId: number): Promise<PushSubscription[]> {
    return this.getPushSubscriptionsByUserId(userId);
  }
  
  // Notification preferences operations
  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const id = this.notificationPrefsIdCounter++;
    const now = new Date();
    
    // Create a properly typed NotificationPreferences object
    const newPreferences: NotificationPreferences = {
      id,
      userId: preferences.userId,
      updatedAt: now,
      newConflicts: preferences.newConflicts !== undefined ? preferences.newConflicts : true,
      partnerEmotions: preferences.partnerEmotions !== undefined ? preferences.partnerEmotions : true,
      directMessages: preferences.directMessages !== undefined ? preferences.directMessages : true,
      conflictUpdates: preferences.conflictUpdates !== undefined ? preferences.conflictUpdates : true,
      weeklyCheckIns: preferences.weeklyCheckIns !== undefined ? preferences.weeklyCheckIns : true,
      appreciations: preferences.appreciations !== undefined ? preferences.appreciations : true,
      exerciseNotifications: preferences.exerciseNotifications !== undefined ? preferences.exerciseNotifications : true
    };
    
    this.notificationPrefs.set(id, newPreferences);
    return newPreferences;
  }
  
  async getNotificationPreferences(userId: number): Promise<NotificationPreferences | undefined> {
    return Array.from(this.notificationPrefs.values()).find(
      (prefs) => prefs.userId === userId
    );
  }
  
  async updateNotificationPreferences(userId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const existingPrefs = await this.getNotificationPreferences(userId);
    
    if (existingPrefs) {
      // Create an updated copy of existing preferences
      const updatedPrefs: NotificationPreferences = {
        id: existingPrefs.id,
        userId: existingPrefs.userId,
        updatedAt: new Date(),
        // Apply updates with fallback to existing values
        newConflicts: preferences.newConflicts !== undefined ? preferences.newConflicts : existingPrefs.newConflicts,
        partnerEmotions: preferences.partnerEmotions !== undefined ? preferences.partnerEmotions : existingPrefs.partnerEmotions,
        directMessages: preferences.directMessages !== undefined ? preferences.directMessages : existingPrefs.directMessages,
        conflictUpdates: preferences.conflictUpdates !== undefined ? preferences.conflictUpdates : existingPrefs.conflictUpdates,
        weeklyCheckIns: preferences.weeklyCheckIns !== undefined ? preferences.weeklyCheckIns : existingPrefs.weeklyCheckIns,
        appreciations: preferences.appreciations !== undefined ? preferences.appreciations : existingPrefs.appreciations,
        exerciseNotifications: preferences.exerciseNotifications !== undefined ? preferences.exerciseNotifications : (existingPrefs.exerciseNotifications ?? true)
      };
      
      this.notificationPrefs.set(existingPrefs.id, updatedPrefs);
      return updatedPrefs;
    } else {
      // Create new preferences if they don't exist
      return this.createNotificationPreferences({
        userId,
        newConflicts: preferences.newConflicts ?? true,
        partnerEmotions: preferences.partnerEmotions ?? true,
        directMessages: preferences.directMessages ?? true,
        conflictUpdates: preferences.conflictUpdates ?? true,
        weeklyCheckIns: preferences.weeklyCheckIns ?? true,
        appreciations: preferences.appreciations ?? true,
        exerciseNotifications: preferences.exerciseNotifications ?? true
      });
    }
  }

  // Current emotion operations
  async getCurrentEmotion(userId: number): Promise<CurrentEmotion | undefined> {
    return Array.from(this.currentEmotions.values()).find(
      (emotion) => emotion.userId === userId
    );
  }
  
  async setCurrentEmotion(emotion: InsertCurrentEmotion): Promise<CurrentEmotion> {
    // Check if user has an existing emotion
    const existingEmotion = await this.getCurrentEmotion(emotion.userId);
    
    if (existingEmotion) {
      // Update the existing emotion
      return this.updateCurrentEmotion(emotion.userId, emotion);
    }
    
    // Create a new emotion entry
    const id = this.currentEmotions.size + 1;
    const now = new Date();
    
    const newEmotion: CurrentEmotion = {
      ...emotion,
      id,
      updatedAt: now,
      note: emotion.note || null,
      intensity: emotion.intensity || 5
    };
    
    this.currentEmotions.set(id, newEmotion);
    return newEmotion;
  }
  
  async updateCurrentEmotion(userId: number, emotionData: Partial<InsertCurrentEmotion>): Promise<CurrentEmotion> {
    const existingEmotion = await this.getCurrentEmotion(userId);
    
    if (!existingEmotion) {
      // If no emotion exists, create a new one
      return this.setCurrentEmotion({
        userId,
        emotion: emotionData.emotion || "neutral",
        intensity: emotionData.intensity || 5,
        note: emotionData.note
      });
    }
    
    // Update the existing emotion
    const updatedEmotion = {
      ...existingEmotion,
      ...emotionData,
      updatedAt: new Date()
    };
    
    this.currentEmotions.set(existingEmotion.id, updatedEmotion);
    return updatedEmotion;
  }
  
  async getPartnerCurrentEmotion(userId: number): Promise<CurrentEmotion | undefined> {
    // Get partnership
    const partnership = await this.getPartnershipByUser(userId);
    if (!partnership || partnership.status !== 'active') {
      return undefined;
    }
    
    // Determine partner's ID
    const partnerId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;
    
    // Get partner's current emotion
    return this.getCurrentEmotion(partnerId);
  }

  // Communication exercise operations
  async createExerciseTemplate(template: InsertExerciseTemplate): Promise<ExerciseTemplate> {
    const id = this.exerciseTemplateIdCounter++;
    const now = new Date();
    
    const newTemplate: ExerciseTemplate = {
      ...template,
      id,
      createdAt: now,
      isActive: true
    };
    
    this.exerciseTemplates.set(id, newTemplate);
    return newTemplate;
  }
  
  async getExerciseTemplate(id: number): Promise<ExerciseTemplate | undefined> {
    return this.exerciseTemplates.get(id);
  }
  
  async getExerciseTemplates(type?: string, difficultyLevel?: string): Promise<ExerciseTemplate[]> {
    let templates = Array.from(this.exerciseTemplates.values());
    
    if (type) {
      templates = templates.filter(template => template.type === type);
    }
    
    if (difficultyLevel) {
      templates = templates.filter(template => template.difficultyLevel === difficultyLevel);
    }
    
    return templates.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  async createExercise(exercise: InsertExercise): Promise<CommunicationExercise> {
    const id = this.exerciseIdCounter++;
    const now = new Date();
    
    const newExercise: CommunicationExercise = {
      id,
      partnershipId: exercise.partnershipId,
      initiatorId: exercise.initiatorId,
      partnerId: exercise.partnerId,
      templateId: exercise.templateId || null,
      title: exercise.title,
      description: exercise.description,
      type: exercise.type,
      status: 'in_progress',
      currentStep: exercise.currentStep || 1,
      currentStepNumber: exercise.currentStepNumber || 1,
      totalSteps: exercise.totalSteps,
      currentUserId: exercise.currentUserId || exercise.initiatorId,
      scheduledFor: exercise.scheduledFor || now,
      completedAt: null,
      user1Progress: exercise.user1Progress || '{}',
      user2Progress: exercise.user2Progress || '{}',
      createdAt: now,
      lastUpdatedAt: now
    };
    
    this.communicationExercises.set(id, newExercise);
    return newExercise;
  }
  
  async getExerciseById(id: number): Promise<CommunicationExercise | undefined> {
    return this.communicationExercises.get(id);
  }
  
  async getExercisesByPartnership(partnershipId: number, status?: string): Promise<CommunicationExercise[]> {
    let exercises = Array.from(this.communicationExercises.values())
      .filter(exercise => exercise.partnershipId === partnershipId);
    
    if (status) {
      exercises = exercises.filter(exercise => exercise.status === status);
    }
    
    return exercises.sort((a, b) => 
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    );
  }
  
  async getExercisesForUser(userId: number, status?: string): Promise<CommunicationExercise[]> {
    let exercises = Array.from(this.communicationExercises.values())
      .filter(exercise => 
        exercise.initiatorId === userId || 
        exercise.partnerId === userId
      );
    
    if (status) {
      exercises = exercises.filter(exercise => exercise.status === status);
    }
    
    return exercises.sort((a, b) => 
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
    );
  }
  
  async updateExerciseStatus(id: number, status: string): Promise<CommunicationExercise> {
    const exercise = await this.getExerciseById(id);
    if (!exercise) {
      throw new Error(`Exercise with id ${id} not found`);
    }
    
    const now = new Date();
    const updatedExercise: CommunicationExercise = {
      ...exercise,
      status: status as typeof exerciseStatusOptions[number],
      lastUpdatedAt: now,
      completedAt: status === 'completed' ? now : exercise.completedAt
    };
    
    this.communicationExercises.set(id, updatedExercise);
    return updatedExercise;
  }
  
  async updateExerciseCurrentStep(id: number, stepNumber: number): Promise<CommunicationExercise> {
    const exercise = await this.getExerciseById(id);
    if (!exercise) {
      throw new Error(`Exercise with id ${id} not found`);
    }
    
    const updatedExercise: CommunicationExercise = {
      ...exercise,
      currentStepNumber: stepNumber,
      lastUpdatedAt: new Date()
    };
    
    this.communicationExercises.set(id, updatedExercise);
    return updatedExercise;
  }
  
  async updateExerciseCurrentUser(id: number, userId: number): Promise<CommunicationExercise> {
    const exercise = await this.getExerciseById(id);
    if (!exercise) {
      throw new Error(`Exercise with id ${id} not found`);
    }
    
    // Verify that userId belongs to either initiator or partner
    if (userId !== exercise.initiatorId && userId !== exercise.partnerId) {
      throw new Error(`User ${userId} is not part of this exercise`);
    }
    
    const updatedExercise: CommunicationExercise = {
      ...exercise,
      currentUserId: userId,
      lastUpdatedAt: new Date()
    };
    
    this.communicationExercises.set(id, updatedExercise);
    return updatedExercise;
  }
  
  async completeExercise(id: number): Promise<CommunicationExercise> {
    const exercise = await this.getExerciseById(id);
    if (!exercise) {
      throw new Error(`Exercise with id ${id} not found`);
    }
    
    const now = new Date();
    const updatedExercise: CommunicationExercise = {
      ...exercise,
      status: 'completed',
      completedAt: now,
      lastUpdatedAt: now
    };
    
    this.communicationExercises.set(id, updatedExercise);
    return updatedExercise;
  }
  
  async createExerciseStep(step: InsertExerciseStep): Promise<ExerciseStep> {
    const id = this.exerciseStepIdCounter++;
    
    const newStep: ExerciseStep = {
      id,
      exerciseId: step.exerciseId,
      stepNumber: step.stepNumber,
      title: step.title,
      instructions: step.instructions || '',
      promptText: step.promptText,
      expectedResponseType: step.expectedResponseType,
      options: step.options || '[]',
      requiredForCompletion: step.requiredForCompletion !== undefined ? step.requiredForCompletion : true,
      userRole: step.userRole || 'both',
      timeEstimate: step.timeEstimate || null
    };
    
    this.exerciseSteps.set(id, newStep);
    return newStep;
  }
  
  async getExerciseStepById(id: number): Promise<ExerciseStep | undefined> {
    return this.exerciseSteps.get(id);
  }
  
  async getExerciseSteps(exerciseId: number): Promise<ExerciseStep[]> {
    return Array.from(this.exerciseSteps.values())
      .filter(step => step.exerciseId === exerciseId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }
  
  async getExerciseStepByNumber(exerciseId: number, stepNumber: number): Promise<ExerciseStep | undefined> {
    return Array.from(this.exerciseSteps.values())
      .find(step => step.exerciseId === exerciseId && step.stepNumber === stepNumber);
  }
  
  async createExerciseResponse(response: InsertExerciseResponse): Promise<ExerciseResponse> {
    const id = this.exerciseResponseIdCounter++;
    const now = new Date();
    
    const newResponse: ExerciseResponse = {
      id,
      userId: response.userId,
      exerciseId: response.exerciseId,
      stepId: response.stepId,
      responseText: response.responseText || null,
      responseOption: response.responseOption || null,
      audioUrl: response.audioUrl || null,
      aiAnalysis: response.aiAnalysis || null,
      isCompleted: response.isCompleted !== undefined ? response.isCompleted : true,
      createdAt: now
    };
    
    this.exerciseResponses.set(id, newResponse);
    return newResponse;
  }
  
  async getExerciseResponses(exerciseId: number, userId?: number): Promise<ExerciseResponse[]> {
    let responses = Array.from(this.exerciseResponses.values())
      .filter(response => response.exerciseId === exerciseId);
    
    if (userId) {
      responses = responses.filter(response => response.userId === userId);
    }
    
    return responses.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }
  
  async getExerciseStepResponses(stepId: number): Promise<ExerciseResponse[]> {
    return Array.from(this.exerciseResponses.values())
      .filter(response => response.stepId === stepId)
      .sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }
  
  async getUserResponseForStep(stepId: number, userId: number): Promise<ExerciseResponse | undefined> {
    return Array.from(this.exerciseResponses.values())
      .find(response => response.stepId === stepId && response.userId === userId);
  }
}

export const storage = new MemStorage();
