import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, User as SelectUser } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function setupAuth(app: Express) {
  // Trust first proxy in production environment for secure cookies
  app.set("trust proxy", 1);

  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "couple-clarity-secret-key",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax", // Allows the cookie to be sent with same-site requests and top-level navigation
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Prevents JavaScript from accessing the cookie
      },
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up Local Strategy for authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Authentication Routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err: Error) => {
        if (err) {
          return next(err);
        }
        
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Error during logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      // Create a new user with displayName if not provided
      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        ...req.body,
        password: hashedPassword,
        displayName: req.body.displayName || `${req.body.firstName} ${req.body.lastName}`
      };
      
      const newUser = await storage.createUser(userData);
      
      // If partner details are provided, create an invite
      if (req.body.partnerEmail && req.body.partnerFirstName) {
        const inviteToken = uuidv4();
        const invite = {
          fromUserId: newUser.id,
          partnerEmail: req.body.partnerEmail,
          partnerFirstName: req.body.partnerFirstName,
          partnerLastName: req.body.partnerLastName || "",
        };
        
        await storage.createInvite(invite, inviteToken);
        
        // Here you would send an email with the invitation link
        // For now, we'll just log it
        console.log(`Invitation link: ${process.env.HOST || 'http://localhost:3000'}/auth?token=${inviteToken}`);
      }
      
      // Log in the newly created user
      req.login(newUser, (err: Error) => {
        if (err) {
          return next(err);
        }
        
        return res.status(201).json(newUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/register/invite", async (req, res, next) => {
    try {
      // Verify the invite token
      const invite = await storage.getInviteByToken(req.body.inviteToken);
      if (!invite) {
        return res.status(400).json({ error: "Invalid invite token" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ error: "Invite has already been used" });
      }
      
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(req.body.username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(req.body.email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      
      // Create a new user with displayName if not provided
      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        ...req.body,
        password: hashedPassword,
        displayName: req.body.displayName || `${req.body.firstName} ${req.body.lastName}`
      };
      
      const newUser = await storage.createUser(userData);
      
      // Mark the invite as accepted
      await storage.updateInviteAccepted(invite.id);
      
      // Create a partnership between the inviter and the new user
      const inviter = await storage.getUser(invite.fromUserId);
      if (inviter) {
        await storage.createPartnership({
          user1Id: invite.fromUserId,
          user2Id: newUser.id
        });
      }
      
      // Log in the newly created user
      req.login(newUser, (err: Error) => {
        if (err) {
          return next(err);
        }
        
        return res.status(201).json(newUser);
      });
    } catch (error) {
      next(error);
    }
  });

  // Create a new partner invite
  app.post("/api/invites", isAuthenticated, async (req: Request & { user?: User }, res, next) => {
    try {
      const { partnerFirstName, partnerLastName, partnerEmail, fromUserId } = req.body;
      
      if (!partnerFirstName || !partnerLastName || !partnerEmail) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Generate a unique token for the invite
      const inviteToken = uuidv4();
      
      // Create the invite in the database
      const invite = await storage.createInvite({
        fromUserId: fromUserId || req.user.id,  // Use the authenticated user's ID if not explicitly provided
        partnerFirstName,
        partnerLastName,
        partnerEmail,
      }, inviteToken);
      
      // In a real production app, we would send an email to the partner with the invite link
      // For now, we'll just return the invite details with the token
      console.log(`Invitation link: ${process.env.HOST || 'http://localhost:3000'}/auth?token=${inviteToken}`);
      
      res.status(201).json({
        id: invite.id,
        inviteToken,
        partnerEmail: invite.partnerEmail,
        message: "Invitation created successfully"
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Get invite details by token
  app.get("/api/invites/:token", async (req, res, next) => {
    try {
      const token = req.params.token;
      const invite = await storage.getInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      if (invite.acceptedAt) {
        return res.status(400).json({ error: "Invite has already been used" });
      }
      
      const inviter = await storage.getUser(invite.fromUserId);
      if (!inviter) {
        return res.status(404).json({ error: "Inviter not found" });
      }
      
      res.json({
        partnerFirstName: inviter.firstName,
        partnerLastName: inviter.lastName,
        partnerEmail: invite.partnerEmail,
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Generate an invitation link without requiring email
  app.post("/api/invites/generate-link", isAuthenticated, async (req: Request & { user?: User }, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Get user data to provide context for the invite
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Generate a unique token for the invite
      const token = uuidv4();
      
      // Create a minimal invite record
      const invite = await storage.createInvite({
        fromUserId: req.user.id,
        partnerFirstName: "",
        partnerLastName: "",
        partnerEmail: "", // No email for link-based invites
      }, token);
      
      // Return just the token and basic info
      res.status(201).json({
        id: invite.id,
        token,
        inviterName: `${user.firstName} ${user.lastName}`.trim(),
        message: "Invitation link generated successfully"
      });
    } catch (error) {
      next(error);
    }
  });

  // Password reset request - initiate
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Generate and store a password reset token
      const tokenData = await storage.createPasswordResetToken(email);
      
      if (!tokenData) {
        // We return success even if email not found to prevent user enumeration
        return res.status(200).json({
          message: "If your email exists in our system, you will receive a password reset link"
        });
      }
      
      // In a real production app, send an email with the reset link
      // Here we just log the token for development purposes
      console.log(`Password reset link: ${process.env.HOST || 'http://localhost:3000'}/reset-password?token=${tokenData.token}`);
      
      res.status(200).json({
        message: "If your email exists in our system, you will receive a password reset link",
        // Only include token in development, remove in production
        token: tokenData.token
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Verify reset token
  app.get("/api/reset-password/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      
      const tokenData = await storage.getPasswordResetToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ 
          valid: false,
          error: "Invalid or expired token" 
        });
      }
      
      res.json({ 
        valid: true,
        message: "Token is valid" 
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Reset password with token
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      
      // Validate token
      const tokenData = await storage.getPasswordResetToken(token);
      
      if (!tokenData) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password
      await storage.updateUserPassword(tokenData.userId, hashedPassword);
      
      // Invalidate the token to prevent reuse
      await storage.invalidatePasswordResetToken(token);
      
      res.json({ message: "Password has been successfully reset" });
    } catch (error) {
      next(error);
    }
  });
}