import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { User, User as SelectUser } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

// Rate limiters for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again later." },
});

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

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  // Require SESSION_SECRET in production — refuse to start with the default
  if (!process.env.SESSION_SECRET) {
    if (isProduction) {
      throw new Error(
        "SESSION_SECRET environment variable is required in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      );
    }
    console.warn(
      "WARNING: SESSION_SECRET not set — using insecure default. Set SESSION_SECRET before deploying."
    );
  }

  // Trust first proxy in production environment for secure cookies
  app.set("trust proxy", 1);

  // Set up session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "couple-clarity-dev-only-secret",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax",
        secure: isProduction, // HTTPS-only cookies in production
        httpOnly: true,
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
        // Try to find user by username or email
        let user = await storage.getUserByUsername(username);

        if (!user) {
          user = await storage.getUserByEmail(username);
        }

        if (!user) {
          return done(null, false, { message: "Incorrect username or email" });
        }

        const isPasswordValid = await comparePasswords(password, user.password);

        if (!isPasswordValid) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
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
  app.post("/api/login", authLimiter, (req, res, next) => {
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

  app.post("/api/register", authLimiter, async (req, res, next) => {
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
      
      // Create a new user with explicitly picked fields to prevent mass assignment
      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        username: req.body.username,
        password: hashedPassword,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        displayName: req.body.displayName || `${req.body.firstName} ${req.body.lastName}`,
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
        
        // Send partner invitation email
        const { emailService } = require('./email-service');
        await emailService.sendPartnerInviteEmail(
          newUser, 
          req.body.partnerEmail, 
          inviteToken
        );
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

  app.post("/api/register/invite", authLimiter, async (req, res, next) => {
    try {
      // Verify the invite token
      const invite = await storage.getInviteByToken(req.body.inviteToken);
      if (!invite) {
        return res.status(400).json({ error: "Invalid invite token" });
      }
      
      if (invite.acceptedAt) {
        // Check if the invited user already exists
        const existingPartner = await storage.getUserByEmail(req.body.email);
        
        // If the email in the request matches the partner's email in the invite,
        // and the partner already has an account, attempt to connect them directly
        if (existingPartner) {
          const inviter = await storage.getUser(invite.fromUserId);
          if (inviter) {
            // Check if a partnership already exists
            const existingPartnership = await storage.getPartnershipByUsers(invite.fromUserId, existingPartner.id);
            if (existingPartnership) {
              return res.status(400).json({ 
                error: "You already have a partnership with this user",
                partnerName: `${inviter.firstName} ${inviter.lastName}`,
                redirectUrl: "/dashboard"
              });
            }
            
            // If they don't have a partnership yet, create one
            await storage.createPartnership({
              user1Id: invite.fromUserId,
              user2Id: existingPartner.id,
              status: "pending",
              relationshipType: null,
              anniversaryDate: null,
              meetingStory: null,
              coupleNickname: null,
              sharedPicture: null,
              relationshipGoals: null,
              privacyLevel: "standard"
            });
            
            // Login as the existing user
            req.login(existingPartner, (err: Error) => {
              if (err) {
                return next(err);
              }
              
              return res.status(200).json({ 
                message: "Successfully connected with partner",
                user: existingPartner,
                redirectUrl: "/dashboard"
              });
            });
            return;
          }
        }
        
        // If we can't handle the automatic connection, fall back to the error
        return res.status(400).json({ error: "Invite has already been used. If you already have an account, try using the 'Connect Existing Account' option instead." });
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
      
      // Create a new user with explicitly picked fields to prevent mass assignment
      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        username: req.body.username,
        password: hashedPassword,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        displayName: req.body.displayName || `${req.body.firstName} ${req.body.lastName}`,
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
      const { partnerFirstName, partnerLastName, partnerEmail } = req.body;

      if (!partnerFirstName || !partnerLastName || !partnerEmail) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Generate a unique token for the invite
      const inviteToken = uuidv4();

      // Create the invite in the database — always use the authenticated user's ID
      const invite = await storage.createInvite({
        fromUserId: req.user.id,
        partnerFirstName,
        partnerLastName,
        partnerEmail,
      }, inviteToken);
      
      // Send partner invitation email
      const { emailService } = require('./email-service');
      await emailService.sendPartnerInviteEmail(
        req.user, 
        partnerEmail, 
        inviteToken
      );
      
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
        return res.status(400).json({ 
          error: "Invite has already been used. If you already have an account, try using the 'Connect Existing Account' option instead.",
          showConnectOption: true
        });
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
  app.post("/api/forgot-password", passwordResetLimiter, async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Generate and store a password reset token
      const tokenData = await storage.createPasswordResetToken(email);

      if (!tokenData) {
        // Return success even if email not found to prevent user enumeration
        return res.status(200).json({
          message: "If your email exists in our system, you will receive a password reset link"
        });
      }

      // Get the user for email sending
      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(500).json({ error: "Unexpected error occurred" });
      }

      // Send the password reset email
      const { emailService } = require('./email-service');
      await emailService.sendPasswordResetEmail(user, tokenData.token);

      res.status(200).json({
        message: "If your email exists in our system, you will receive a password reset link"
      });
    } catch (error) {
      console.error("Password reset error:", error);
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