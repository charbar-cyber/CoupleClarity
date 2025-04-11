import { User } from '@shared/schema';

export interface EmailService {
  sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean>;
  sendPartnerInviteEmail(user: User, partnerEmail: string, inviteToken: string): Promise<boolean>;
  sendWelcomeEmail(user: User): Promise<boolean>;
}

// Development email service that just logs emails to the console
export class DevEmailService implements EmailService {
  private formatResetLink(token: string): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${baseUrl}/reset-password?token=${token}`;
  }
  
  private formatInviteLink(token: string): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    return `${baseUrl}/auth?token=${token}`;
  }

  async sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean> {
    const resetLink = this.formatResetLink(resetToken);
    
    console.log('\n==== PASSWORD RESET EMAIL ====');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Reset Your CoupleClarity Password`);
    console.log('\nHello ' + user.firstName + ',');
    console.log('\nWe received a request to reset your CoupleClarity password.');
    console.log('\nTo reset your password, follow this link:');
    console.log(resetLink);
    console.log('\nThis link will expire in 1 hour.');
    console.log('\nIf you did not request a password reset, please ignore this message.');
    console.log('\nBest regards,');
    console.log('The CoupleClarity Team');
    console.log('============================\n');
    
    return true; // Always returns success in development mode
  }

  async sendPartnerInviteEmail(user: User, partnerEmail: string, inviteToken: string): Promise<boolean> {
    const inviteLink = this.formatInviteLink(inviteToken);
    
    console.log('\n==== PARTNER INVITATION EMAIL ====');
    console.log(`To: ${partnerEmail}`);
    console.log(`Subject: ${user.firstName} ${user.lastName} has invited you to join CoupleClarity`);
    console.log('\nHello,');
    console.log(`\n${user.firstName} ${user.lastName} has invited you to connect on CoupleClarity, an app for strengthening your relationship.`);
    console.log('\nTo accept their invitation, follow this link:');
    console.log(inviteLink);
    console.log('\nThis link will allow you to create an account and connect with your partner.');
    console.log('\nBest regards,');
    console.log('The CoupleClarity Team');
    console.log('=================================\n');
    
    return true; // Always returns success in development mode
  }
  
  async sendWelcomeEmail(user: User): Promise<boolean> {
    console.log('\n==== WELCOME EMAIL ====');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Welcome to CoupleClarity, ${user.firstName}!`);
    console.log('\nHello ' + user.firstName + ',');
    console.log('\nWelcome to CoupleClarity! We\'re excited to help you strengthen your relationship.');
    console.log('\nHere are some tips to get started:');
    console.log('1. Complete your profile and relationship questionnaire');
    console.log('2. Invite your partner to join');
    console.log('3. Start expressing emotions and working through challenges together');
    console.log('\nIf you have any questions, please reach out to our support team.');
    console.log('\nBest regards,');
    console.log('The CoupleClarity Team');
    console.log('=======================\n');
    
    return true; // Always returns success in development mode
  }
}

// Factory function to create the appropriate email service
export function createEmailService(): EmailService {
  // For now, we only have the development email service
  return new DevEmailService();
}

// Singleton instance for the application
export const emailService = createEmailService();