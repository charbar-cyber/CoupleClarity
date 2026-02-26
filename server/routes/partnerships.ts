import { type Express, type Request, type Response } from "express";
import { WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../storage";
import { isAuthenticated, type RouteContext } from "./types";
import { type User, coupleProfileSchema, milestoneSchema, milestoneTypeOptions } from "@shared/schema";

export function registerPartnershipRoutes(app: Express, ctx: RouteContext) {
  const { clients, sendNotification } = ctx;

  // ====== Partner Management API ======

  // Remove partnership
  app.delete('/api/partnerships/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const partnershipId = parseInt(req.params.id);
      if (isNaN(partnershipId)) {
        return res.status(400).json({ error: 'Invalid partnership ID' });
      }

      // Get the partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ error: 'Partnership not found' });
      }

      // Verify that the user is part of this partnership
      if (partnership.user1Id !== req.user.id && partnership.user2Id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to remove this partnership' });
      }

      // Get the partner's ID
      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

      // Update the partnership status to "removed"
      await storage.updatePartnershipStatus(partnershipId, "removed");

      // Notify the partner about the partnership removal if they are online
      const client = clients.get(partnerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'partnership_removed',
          data: {
            partnershipId,
            partnerId: req.user.id,
            message: 'Your partner has ended the relationship in CoupleClarity'
          }
        }));
      }

      // Send a notification to the partner if they have enabled notifications
      const partnerPrefs = await storage.getNotificationPreferences(partnerId);
      if (partnerPrefs) {
        await sendNotification(partnerId, {
          title: 'Partnership Ended',
          body: 'Your partner has ended the relationship in CoupleClarity',
          url: '/settings?tab=partner',
          type: 'partnershipUpdates'
        });
      }

      res.json({ message: 'Partnership successfully removed' });
    } catch (error) {
      console.error('Error removing partnership:', error);
      res.status(500).json({ error: 'Failed to remove partnership' });
    }
  });

  // Regenerate invitation for partner
  app.post('/api/partnerships/:id/regenerate-invite', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const partnershipId = parseInt(req.params.id);
      if (isNaN(partnershipId)) {
        return res.status(400).json({ error: 'Invalid partnership ID' });
      }

      // Get the partnership
      const partnership = await storage.getPartnership(partnershipId);
      if (!partnership) {
        return res.status(404).json({ error: 'Partnership not found' });
      }

      // Verify that the user is part of this partnership
      if (partnership.user1Id !== req.user.id && partnership.user2Id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to regenerate invite for this partnership' });
      }

      // Only allow regenerating invites for pending partnerships
      if (partnership.status !== 'pending') {
        return res.status(400).json({ error: 'Can only regenerate invites for pending partnerships' });
      }

      // Generate a new token for the invite
      const token = uuidv4();

      // Create a new invite
      const invite = await storage.createInvite({
        fromUserId: req.user.id,
        partnerFirstName: "",
        partnerLastName: "",
        partnerEmail: "",
      }, token);

      res.status(201).json({
        id: invite.id,
        token,
        partnershipId,
        message: "New invitation link generated successfully"
      });
    } catch (error) {
      console.error('Error regenerating invite:', error);
      res.status(500).json({ error: 'Failed to regenerate invitation' });
    }
  });

  // ====== Couple Profile and Settings API ======

  // Get couple profile
  app.get('/api/partnership/profile', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }

      // Get partner's information
      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;
      const partner = await storage.getUser(partnerId);

      // Return the partnership and partner data
      res.json({
        partnership,
        partner: partner ? {
          id: partner.id,
          displayName: partner.displayName,
          firstName: partner.firstName,
          lastName: partner.lastName,
          avatarUrl: partner.avatarUrl
        } : null
      });
    } catch (error) {
      console.error('Error fetching couple profile:', error);
      res.status(500).json({ error: 'Failed to fetch couple profile' });
    }
  });

  // Update couple profile
  app.put('/api/partnership/profile', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = coupleProfileSchema.parse(req.body);

      // Find the partnership
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }

      // Update the partnership
      const updatedPartnership = await storage.updatePartnershipProfile(partnership.id, {
        relationshipType: validatedData.relationshipType,
        privacyLevel: validatedData.privacyLevel,
        anniversaryDate: validatedData.anniversaryDate ? new Date(validatedData.anniversaryDate) : null,
        meetingStory: validatedData.meetingStory,
        relationshipGoals: validatedData.relationshipGoals,
        coupleNickname: validatedData.coupleNickname,
        sharedPicture: validatedData.sharedPicture
      });

      res.json(updatedPartnership);
    } catch (error: any) {
      console.error('Error updating couple profile:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data format', details: error.errors });
      }

      res.status(500).json({ error: 'Failed to update couple profile' });
    }
  });

  // ====== Partner Connection API ======

  // Connect with existing partner using invitation token
  app.post('/api/partnerships/connect-by-token', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { inviteToken } = req.body;

      if (!inviteToken) {
        return res.status(400).json({ error: "Invite token is required" });
      }

      // Find the invite
      const invite = await storage.getInviteByToken(inviteToken);

      if (!invite) {
        return res.status(404).json({ error: "Invalid invitation token" });
      }

      // Get the inviter
      const inviter = await storage.getUser(invite.fromUserId);

      if (!inviter) {
        return res.status(404).json({ error: "Inviter not found" });
      }

      // Check if an active partnership already exists
      const existingPartnership = await storage.getPartnershipByUsers(invite.fromUserId, req.user.id);

      if (existingPartnership) {
        // If the partnership is already active, just return success
        if (existingPartnership.status === "active") {
          return res.status(200).json({
            message: "You are already connected with this partner",
            partnerName: `${inviter.firstName} ${inviter.lastName}`,
            partnership: existingPartnership
          });
        }

        // If it's pending or other status, update it to active
        const updatedPartnership = await storage.updatePartnership(existingPartnership.id, {
          ...existingPartnership,
          status: "active"
        });

        // Notify the partner of the connection
        const client = clients.get(invite.fromUserId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'connection_accepted',
            data: {
              userId: req.user.id,
              partnerName: `${req.user.firstName} ${req.user.lastName}`,
              timestamp: new Date()
            }
          }));
        }

        return res.status(200).json({
          message: "Successfully reconnected with partner",
          partnerName: `${inviter.firstName} ${inviter.lastName}`,
          partnership: updatedPartnership
        });
      }

      // Mark the invite as accepted
      await storage.updateInviteAccepted(invite.id);

      // Create a new partnership
      const partnership = await storage.createPartnership({
        user1Id: invite.fromUserId,
        user2Id: req.user.id,
        status: "pending",
        relationshipType: null,
        anniversaryDate: null,
        meetingStory: null,
        coupleNickname: null,
        sharedPicture: null,
        relationshipGoals: null,
        privacyLevel: "standard"
      });

      // Notify the partner of the connection being successful
      const client = clients.get(invite.fromUserId);
      if (client) {
        client.send(JSON.stringify({
          type: 'connection_accepted',
          data: {
            userId: req.user.id,
            partnerName: `${req.user.firstName} ${req.user.lastName}`,
            timestamp: new Date()
          }
        }));
      }

      res.status(201).json({
        message: "Successfully connected with partner",
        partnerName: `${inviter.firstName} ${inviter.lastName}`,
        partnership
      });
    } catch (error) {
      console.error("Error connecting by token:", error);
      res.status(500).json({ error: "Error connecting with partner" });
    }
  });

  // Connect by partner email
  app.post('/api/partnerships/connect', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { partnerEmail } = req.body;

      if (!partnerEmail) {
        return res.status(400).json({ error: "Partner email is required" });
      }

      // Check if the partner exists
      console.log(`Looking for partner with email: ${partnerEmail}`);
      const partnerUser = await storage.getUserByEmail(partnerEmail);
      console.log(`Partner user search result:`, partnerUser ? `Found user: ${partnerUser.username}` : 'No user found');

      if (!partnerUser) {
        return res.status(404).json({ error: "No user found with this email" });
      }

      // Check if a partnership already exists between these users
      const existingPartnership = await storage.getPartnershipByUsers(req.user.id, partnerUser.id);
      if (existingPartnership) {
        // If partnership exists but is not active, update it
        if (existingPartnership.status !== "active") {
          const updatedPartnership = await storage.updatePartnership(existingPartnership.id, {
            ...existingPartnership,
            status: "active"
          });

          return res.status(200).json({
            success: true,
            message: "Successfully reconnected with partner",
            partnership: updatedPartnership
          });
        }

        return res.status(200).json({
          success: true,
          message: "You are already connected with this partner",
          partnership: existingPartnership
        });
      }

      // Create partnership
      const partnership = await storage.createPartnership({
        user1Id: req.user.id,
        user2Id: partnerUser.id,
        status: "pending",
        relationshipType: null,
        anniversaryDate: null,
        meetingStory: null,
        coupleNickname: null,
        sharedPicture: null,
        relationshipGoals: null,
        privacyLevel: "standard"
      });

      // Notify the partner that they've been invited to a partnership
      const client = clients.get(partnerUser.id);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'partner_request',
          data: {
            partnershipId: partnership.id,
            fromUser: {
              id: req.user.id,
              name: `${req.user.firstName} ${req.user.lastName}`
            }
          }
        }));
      }

      // Also send a notification if configured
      const partnerPrefs = await storage.getNotificationPreferences(partnerUser.id);
      if (partnerPrefs) {
        await sendNotification(partnerUser.id, {
          title: 'New Partnership Request',
          body: `${req.user.firstName} ${req.user.lastName} wants to connect with you on CoupleClarity`,
          url: '/dashboard',
          type: 'directMessages' // Using existing notification type that's most relevant
        });
      }

      res.status(201).json({
        success: true,
        partnership
      });
    } catch (error) {
      console.error("Error connecting with partner:", error);
      res.status(500).json({ error: "Failed to connect with partner" });
    }
  });

  // Check if a user exists by email
  app.get('/api/users/check-email/:email', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { email } = req.params;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const existingUser = await storage.getUserByEmail(email);

      // Don't return user details, just whether the user exists
      res.json({
        exists: !!existingUser,
        // Only send the id if the user exists
        userId: existingUser ? existingUser.id : null,
        // Only include name if the user exists
        name: existingUser ? `${existingUser.firstName} ${existingUser.lastName}` : null
      });
    } catch (error) {
      console.error("Error checking user email:", error);
      res.status(500).json({ error: "Failed to check user email" });
    }
  });

  // ====== Relationship Milestones API ======

  // Get milestones
  app.get('/api/partnership/milestones', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }

      // Get milestones for this partnership
      const milestones = await storage.getMilestonesByPartnership(partnership.id);

      res.json(milestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  });

  // Get milestones by type
  app.get('/api/partnership/milestones/:type', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { type } = req.params;

      // Validate milestone type
      if (!milestoneTypeOptions.includes(type as any)) {
        return res.status(400).json({ error: 'Invalid milestone type' });
      }

      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }

      // Get milestones for this partnership and type
      const milestones = await storage.getMilestonesByType(partnership.id, type);

      res.json(milestones);
    } catch (error) {
      console.error('Error fetching milestones by type:', error);
      res.status(500).json({ error: 'Failed to fetch milestones' });
    }
  });

  // Add milestone
  app.post('/api/partnership/milestones', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = milestoneSchema.parse(req.body);

      // Find the active partnership for the user
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No partnership found' });
      }

      // Create milestone
      const milestone = await storage.createMilestone({
        partnershipId: partnership.id,
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        date: new Date(validatedData.date),
        imageUrl: validatedData.imageUrl,
        isPrivate: validatedData.isPrivate
      });

      // Create a memory for this milestone (if applicable)
      await storage.createMemory({
        userId: req.user.id,
        partnershipId: partnership.id,
        type: 'milestone',
        title: validatedData.title,
        description: validatedData.description || '',
        date: new Date(validatedData.date),
        imageUrl: validatedData.imageUrl,
        linkedItemId: milestone.id,
        linkedItemType: 'milestone',
        isSignificant: true
      });

      res.status(201).json(milestone);
    } catch (error: any) {
      console.error('Error creating milestone:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data format', details: error.errors });
      }

      res.status(500).json({ error: 'Failed to create milestone' });
    }
  });

  // Update milestone
  app.put('/api/partnership/milestones/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const milestoneId = parseInt(id);

      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: 'Invalid milestone ID' });
      }

      const validatedData = milestoneSchema.parse(req.body);

      // Find the milestone
      const milestone = await storage.getMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      // Verify user is part of the partnership
      const partnership = await storage.getPartnership(milestone.partnershipId);
      if (!partnership || (partnership.user1Id !== req.user.id && partnership.user2Id !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to update this milestone' });
      }

      // Update milestone
      const updatedMilestone = await storage.updateMilestone(milestoneId, {
        type: validatedData.type,
        title: validatedData.title,
        description: validatedData.description,
        date: new Date(validatedData.date),
        imageUrl: validatedData.imageUrl,
        isPrivate: validatedData.isPrivate
      });

      res.json(updatedMilestone);
    } catch (error: any) {
      console.error('Error updating milestone:', error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data format', details: error.errors });
      }

      res.status(500).json({ error: 'Failed to update milestone' });
    }
  });

  // Delete milestone
  app.delete('/api/partnership/milestones/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const milestoneId = parseInt(id);

      if (isNaN(milestoneId)) {
        return res.status(400).json({ error: 'Invalid milestone ID' });
      }

      // Find the milestone
      const milestone = await storage.getMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      // Verify user is part of the partnership
      const partnership = await storage.getPartnership(milestone.partnershipId);
      if (!partnership || (partnership.user1Id !== req.user.id && partnership.user2Id !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to delete this milestone' });
      }

      // Delete milestone
      await storage.deleteMilestone(milestoneId);

      res.status(204).end();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      res.status(500).json({ error: 'Failed to delete milestone' });
    }
  });
}
