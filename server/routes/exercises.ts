import { type Express, type Request, type Response } from "express";
import { WebSocket } from "ws";
import { storage } from "../storage";
import {
  insertExerciseSchema,
  exerciseProgressSchema,
  exerciseStatusOptions,
  exerciseTypeOptions,
  type User
} from "@shared/schema";
import { isAuthenticated, type RouteContext } from "./types";

export function register(app: Express, ctx: RouteContext) {
  const { clients, sendNotification } = ctx;

  // Get exercise templates
  app.get('/api/exercises/templates', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { type, difficulty } = req.query;

      const templates = await storage.getExerciseTemplates(
        type as string | undefined,
        difficulty as string | undefined
      );

      res.json(templates);
    } catch (error) {
      console.error('Error fetching exercise templates:', error);
      res.status(500).json({ error: 'Failed to fetch exercise templates' });
    }
  });

  // Get a specific exercise template
  app.get('/api/exercises/templates/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: 'Invalid template ID' });
      }

      const template = await storage.getExerciseTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Exercise template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching exercise template:', error);
      res.status(500).json({ error: 'Failed to fetch exercise template' });
    }
  });

  // Create a new exercise from template
  app.post('/api/exercises', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = insertExerciseSchema.parse(req.body);

      // Get the user's active partnership
      const partnership = await storage.getPartnershipByUser(req.user.id);
      if (!partnership) {
        return res.status(404).json({ error: 'No active partnership found' });
      }

      // Create the exercise
      const exercise = await storage.createExercise({
        ...validatedData,
        initiatorId: req.user.id,
        partnershipId: partnership.id,
        partnerId: partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id,
        currentUserId: req.user.id
      });

      // Check if template steps were provided
      if (validatedData.templateId) {
        const template = await storage.getExerciseTemplate(validatedData.templateId);
        if (template && template.steps) {
          let stepsData: any;
          try {
            stepsData = JSON.parse(template.steps);
          } catch {
            console.error(`Failed to parse exercise template steps for template ${validatedData.templateId}`);
            stepsData = [];
          }
          if (Array.isArray(stepsData)) {
            for (let i = 0; i < stepsData.length; i++) {
              const stepData = stepsData[i];
              await storage.createExerciseStep({
                exerciseId: exercise.id,
                stepNumber: i + 1,
                title: stepData.title || `Step ${i + 1}`,
                promptText: stepData.promptText || '',
                instructions: stepData.instructions || '',
                expectedResponseType: stepData.expectedResponseType || 'text',
                options: stepData.options || '[]',
                requiredForCompletion: stepData.requiredForCompletion !== undefined ? stepData.requiredForCompletion : true,
                userRole: stepData.userRole || 'both',
                timeEstimate: stepData.timeEstimate || null
              });
            }
          }
        }
      }

      // Send notification to partner about new exercise
      const partnerId = partnership.user1Id === req.user.id ? partnership.user2Id : partnership.user1Id;

      // Send WebSocket notification if user is connected
      const client = clients.get(partnerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_exercise',
          exerciseId: exercise.id,
          initiatorId: req.user.id,
          exerciseName: validatedData.title
        }));
      }

      // Send push notification if enabled
      const partnerPrefs = await storage.getNotificationPreferences(partnerId);
      if (partnerPrefs && partnerPrefs.exerciseNotifications) {
        await sendNotification(partnerId, {
          title: 'New Communication Exercise',
          body: `${req.user.firstName} has started a new communication exercise: ${validatedData.title}`,
          url: `/exercises/${exercise.id}`,
          type: 'exerciseNotifications'
        });
      }

      res.status(201).json(exercise);
    } catch (error) {
      console.error('Error creating exercise:', error);
      res.status(500).json({ error: 'Failed to create exercise' });
    }
  });

  // Get all exercises for the user
  app.get('/api/exercises', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { status } = req.query;

      const exercises = await storage.getExercisesForUser(
        req.user.id,
        status as string | undefined
      );

      res.json(exercises);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises' });
    }
  });

  // Get a specific exercise
  app.get('/api/exercises/:id', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      res.json(exercise);
    } catch (error) {
      console.error('Error fetching exercise:', error);
      res.status(500).json({ error: 'Failed to fetch exercise' });
    }
  });

  // Update exercise status
  app.patch('/api/exercises/:id/status', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const { status } = req.body;
      if (!status || !exerciseStatusOptions.includes(status as any)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      const updatedExercise = await storage.updateExerciseStatus(exerciseId, status);

      // If exercise is being completed, notify partner
      if (status === 'completed') {
        const partnerId = exercise.initiatorId === req.user.id ? exercise.partnerId : exercise.initiatorId;

        // Send WebSocket notification if user is connected
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'exercise_completed',
            exerciseId: exercise.id,
            completedBy: req.user.id,
            exerciseName: exercise.title
          }));
        }

        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.exerciseNotifications) {
          await sendNotification(partnerId, {
            title: 'Exercise Completed',
            body: `${req.user.firstName} has completed the "${exercise.title}" exercise`,
            url: `/exercises/${exercise.id}/summary`,
            type: 'exerciseNotifications'
          });
        }
      }

      res.json(updatedExercise);
    } catch (error) {
      console.error('Error updating exercise status:', error);
      res.status(500).json({ error: 'Failed to update exercise status' });
    }
  });

  // Update current step
  app.patch('/api/exercises/:id/step', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const { stepNumber } = req.body;
      if (stepNumber === undefined || isNaN(stepNumber) || stepNumber < 1) {
        return res.status(400).json({ error: 'Invalid step number' });
      }

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      // Check if the step exists
      const step = await storage.getExerciseStepByNumber(exerciseId, stepNumber);
      if (!step) {
        return res.status(404).json({ error: 'Step not found' });
      }

      const updatedExercise = await storage.updateExerciseCurrentStep(exerciseId, stepNumber);

      // Also transfer control to the appropriate user based on step requirements
      if (step.userRole === 'initiator') {
        await storage.updateExerciseCurrentUser(exerciseId, exercise.initiatorId);
        updatedExercise.currentUserId = exercise.initiatorId;
      } else if (step.userRole === 'partner') {
        await storage.updateExerciseCurrentUser(exerciseId, exercise.partnerId);
        updatedExercise.currentUserId = exercise.partnerId;
      }

      // Send notification to the user who now has control if not the current user
      if (updatedExercise.currentUserId !== req.user.id) {
        const client = clients.get(updatedExercise.currentUserId!);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'exercise_step_update',
            exerciseId: exercise.id,
            updatedBy: req.user.id,
            stepNumber: stepNumber,
            exerciseName: exercise.title
          }));
        }

        // Send push notification if enabled
        const userPrefs = await storage.getNotificationPreferences(updatedExercise.currentUserId!);
        if (userPrefs && userPrefs.exerciseNotifications) {
          await sendNotification(updatedExercise.currentUserId!, {
            title: 'Exercise Step Update',
            body: `It's your turn to complete step ${stepNumber} in "${exercise.title}"`,
            url: `/exercises/${exercise.id}`,
            type: 'exerciseNotifications'
          });
        }
      }

      res.json(updatedExercise);
    } catch (error) {
      console.error('Error updating exercise step:', error);
      res.status(500).json({ error: 'Failed to update exercise step' });
    }
  });

  // Get steps for an exercise
  app.get('/api/exercises/:id/steps', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      const steps = await storage.getExerciseSteps(exerciseId);

      res.json(steps);
    } catch (error) {
      console.error('Error fetching exercise steps:', error);
      res.status(500).json({ error: 'Failed to fetch exercise steps' });
    }
  });

  // Submit a response to an exercise step
  app.post('/api/exercises/:id/responses', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const { stepId, responseText, responseOption, audioUrl } = req.body;
      if (!stepId || isNaN(parseInt(stepId))) {
        return res.status(400).json({ error: 'Invalid step ID' });
      }

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      // Check if it's the user's turn
      if (exercise.currentUserId !== req.user.id) {
        return res.status(403).json({ error: 'It is not your turn to respond' });
      }

      // Check if the step exists and belongs to this exercise
      const step = await storage.getExerciseStepById(parseInt(stepId));
      if (!step || step.exerciseId !== exerciseId) {
        return res.status(404).json({ error: 'Step not found' });
      }

      // Check if user already responded to this step
      const existingResponse = await storage.getUserResponseForStep(parseInt(stepId), req.user.id);
      if (existingResponse) {
        return res.status(400).json({ error: 'You have already responded to this step' });
      }

      // Create the response
      const response = await storage.createExerciseResponse({
        userId: req.user.id,
        exerciseId: exerciseId,
        stepId: parseInt(stepId),
        responseText: responseText || null,
        responseOption: responseOption || null,
        audioUrl: audioUrl || null
      });

      // Determine whose turn it is next and update the exercise
      const partnerId = exercise.initiatorId === req.user.id ? exercise.partnerId : exercise.initiatorId;

      // Auto advance to next step if this is the last user for this step
      const allResponses = await storage.getExerciseStepResponses(parseInt(stepId));
      const bothUsersResponded = allResponses.some(r => r.userId === exercise.initiatorId) &&
                                 allResponses.some(r => r.userId === exercise.partnerId);

      if (bothUsersResponded || step.userRole === 'initiator' || step.userRole === 'partner') {
        // Move to next step
        const nextStepNumber = exercise.currentStepNumber + 1;
        const nextStep = await storage.getExerciseStepByNumber(exerciseId, nextStepNumber);

        if (nextStep) {
          // Advance to next step
          await storage.updateExerciseCurrentStep(exerciseId, nextStepNumber);

          // Determine who should go next
          if (nextStep.userRole === 'initiator') {
            await storage.updateExerciseCurrentUser(exerciseId, exercise.initiatorId);
          } else if (nextStep.userRole === 'partner') {
            await storage.updateExerciseCurrentUser(exerciseId, exercise.partnerId);
          } else {
            // Default to partner for 'both' since current user just responded
            await storage.updateExerciseCurrentUser(exerciseId, partnerId);
          }

          // Notify the next user
          const nextUserId = nextStep.userRole === 'initiator' ? exercise.initiatorId :
                           (nextStep.userRole === 'partner' ? exercise.partnerId : partnerId);

          if (nextUserId !== req.user.id) {
            const client = clients.get(nextUserId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'exercise_your_turn',
                exerciseId: exerciseId,
                stepNumber: nextStepNumber,
                exerciseName: exercise.title
              }));
            }

            // Send push notification if enabled
            const userPrefs = await storage.getNotificationPreferences(nextUserId);
            if (userPrefs && userPrefs.exerciseNotifications) {
              await sendNotification(nextUserId, {
                title: 'Your Turn in Exercise',
                body: `It's your turn to respond in the "${exercise.title}" exercise`,
                url: `/exercises/${exerciseId}`,
                type: 'exerciseNotifications'
              });
            }
          }
        } else {
          // No more steps, complete the exercise
          await storage.updateExerciseStatus(exerciseId, 'completed');

          // Notify the partner that the exercise is complete
          const client = clients.get(partnerId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'exercise_completed',
              exerciseId: exerciseId,
              exerciseName: exercise.title
            }));
          }

          // Send push notification if enabled
          const partnerPrefs = await storage.getNotificationPreferences(partnerId);
          if (partnerPrefs && partnerPrefs.exerciseNotifications) {
            await sendNotification(partnerId, {
              title: 'Exercise Completed',
              body: `The "${exercise.title}" exercise has been completed`,
              url: `/exercises/${exerciseId}/summary`,
              type: 'exerciseNotifications'
            });
          }
        }
      } else {
        // Just switch user for same step
        await storage.updateExerciseCurrentUser(exerciseId, partnerId);

        // Send notification to partner that it's their turn
        const client = clients.get(partnerId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'exercise_your_turn',
            exerciseId: exerciseId,
            stepNumber: exercise.currentStepNumber,
            exerciseName: exercise.title
          }));
        }

        // Send push notification if enabled
        const partnerPrefs = await storage.getNotificationPreferences(partnerId);
        if (partnerPrefs && partnerPrefs.exerciseNotifications) {
          await sendNotification(partnerId, {
            title: 'Your Turn in Exercise',
            body: `It's your turn to respond in the "${exercise.title}" exercise`,
            url: `/exercises/${exerciseId}`,
            type: 'exerciseNotifications'
          });
        }
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Error submitting exercise response:', error);
      res.status(500).json({ error: 'Failed to submit exercise response' });
    }
  });

  // Get responses for an exercise
  app.get('/api/exercises/:id/responses', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      // Get responses for the exercise
      const responses = await storage.getExerciseResponses(exerciseId);

      res.json(responses);
    } catch (error) {
      console.error('Error fetching exercise responses:', error);
      res.status(500).json({ error: 'Failed to fetch exercise responses' });
    }
  });

  // Update exercise progress
  app.post('/api/exercises/:id/progress', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const exerciseId = parseInt(req.params.id);
      if (isNaN(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exercise ID' });
      }

      const validatedData = exerciseProgressSchema.parse(req.body);

      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user is part of this exercise
      if (exercise.initiatorId !== req.user.id && exercise.partnerId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this exercise' });
      }

      // Update the appropriate progress field based on user role
      let updatedExercise;
      if (exercise.initiatorId === req.user.id) {
        updatedExercise = await storage.updateExerciseStatus(exerciseId, exercise.status);
      } else {
        updatedExercise = await storage.updateExerciseStatus(exerciseId, exercise.status);
      }

      res.json(updatedExercise);
    } catch (error) {
      console.error('Error updating exercise progress:', error);
      res.status(500).json({ error: 'Failed to update exercise progress' });
    }
  });

  // Create exercise template (admin only)
  app.post('/api/exercises/templates', isAuthenticated, async (req: Request & { user?: User }, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Admin check: user.id !== 3 returns 403
      if (req.user.id !== 3) {
        return res.status(403).json({ error: 'Administrator access required' });
      }

      const { title, type, description, difficultyLevel, estimatedTimeMinutes, steps } = req.body;

      if (!title || !type || !steps) {
        return res.status(400).json({ error: 'Title, type and steps are required' });
      }

      if (!exerciseTypeOptions.includes(type as any)) {
        return res.status(400).json({ error: 'Invalid exercise type' });
      }

      // Create the template
      const stepsArray = Array.isArray(steps) ? steps : [];
      const totalSteps = stepsArray.length;

      const template = await storage.createExerciseTemplate({
        title,
        type: type as any,
        description: description || '',
        difficultyLevel: difficultyLevel || 'beginner',
        estimatedTimeMinutes: estimatedTimeMinutes || 15,
        totalSteps,
        steps: JSON.stringify(stepsArray),
        templateData: JSON.stringify({})
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating exercise template:', error);
      res.status(500).json({ error: 'Failed to create exercise template' });
    }
  });
}
