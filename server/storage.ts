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
  conflictStatusOptions
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Storage interface with CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  
  // Conflict message operations
  createConflictMessage(message: InsertConflictMessage): Promise<ConflictMessage>;
  getConflictMessagesByThreadId(threadId: number): Promise<ConflictMessage[]>;
  
  // Session store
  sessionStore: session.Store;
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
  private userIdCounter: number;
  private messageIdCounter: number;
  private partnershipIdCounter: number;
  private responseIdCounter: number;
  private inviteIdCounter: number;
  private preferencesIdCounter: number;
  private checkInPromptIdCounter: number;
  private checkInResponseIdCounter: number;
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
      displayName: insertUser.displayName || `${insertUser.firstName} ${insertUser.lastName}`
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
    
    const partnership: Partnership = {
      ...insertPartnership,
      id,
      status: "pending",
      createdAt: now
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
  private appreciations: Map<number, Appreciation> = new Map();
  private appreciationIdCounter: number = 1;
  
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
  private conflictThreads: Map<number, ConflictThread> = new Map();
  private conflictMessages: Map<number, ConflictMessage> = new Map();
  private conflictThreadIdCounter: number = 1;
  private conflictMessageIdCounter: number = 1;
  
  async createConflictThread(thread: InsertConflictThread): Promise<ConflictThread> {
    const id = this.conflictThreadIdCounter++;
    const now = new Date();
    
    const conflictThread: ConflictThread = {
      ...thread,
      id,
      status: "active",
      createdAt: now,
      resolvedAt: null,
      resolutionSummary: null,
      resolutionInsights: null
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
  
  async createConflictMessage(message: InsertConflictMessage): Promise<ConflictMessage> {
    const id = this.conflictMessageIdCounter++;
    const now = new Date();
    
    const conflictMessage: ConflictMessage = {
      ...message,
      id,
      createdAt: now,
      emotionalTone: message.emotionalTone || null
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
}

export const storage = new MemStorage();
