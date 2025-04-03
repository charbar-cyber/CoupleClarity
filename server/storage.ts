import { 
  messages, type Message, type InsertMessage, 
  users, type User, type InsertUser,
  partnerships, type Partnership, type InsertPartnership,
  responses, type Response, type InsertResponse
} from "@shared/schema";

// Storage interface with CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private partnerships: Map<number, Partnership>;
  private responses: Map<number, Response>;
  private userIdCounter: number;
  private messageIdCounter: number;
  private partnershipIdCounter: number;
  private responseIdCounter: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.partnerships = new Map();
    this.responses = new Map();
    this.userIdCounter = 1;
    this.messageIdCounter = 1;
    this.partnershipIdCounter = 1;
    this.responseIdCounter = 1;
    
    // Create default users
    const user1 = this.createUser({
      username: "partner1",
      password: "password",
      displayName: "Partner One",
      email: "partner1@example.com"
    });
    
    const user2 = this.createUser({
      username: "partner2",
      password: "password",
      displayName: "Partner Two",
      email: "partner2@example.com"
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
      displayName: insertUser.displayName || null,
      email: insertUser.email || null
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
}

export const storage = new MemStorage();
