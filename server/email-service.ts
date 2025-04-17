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

// Using Mailgun as an alternative to SendGrid
export class MailgunEmailService implements EmailService {
  private apiKey: string;
  private domain: string;
  private fromEmail: string;

  constructor(apiKey: string, domain: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.domain = domain;
    this.fromEmail = fromEmail;
  }

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
    
    try {
      // We'll use fetch to make a request to the Mailgun API
      const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          from: `CoupleClarity <${this.fromEmail}>`,
          to: user.email,
          subject: 'Reset Your CoupleClarity Password',
          text: `Hello ${user.firstName},

We received a request to reset your CoupleClarity password.

To reset your password, follow this link:
${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this message.

Best regards,
The CoupleClarity Team`
        }).toString()
      });
      
      if (!response.ok) {
        console.error('Failed to send password reset email:', await response.text());
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  async sendPartnerInviteEmail(user: User, partnerEmail: string, inviteToken: string): Promise<boolean> {
    const inviteLink = this.formatInviteLink(inviteToken);
    
    try {
      // Using fetch to make a request to the Mailgun API
      const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          from: `CoupleClarity <${this.fromEmail}>`,
          to: partnerEmail,
          subject: `${user.firstName} ${user.lastName} has invited you to join CoupleClarity`,
          text: `Hello,

${user.firstName} ${user.lastName} has invited you to connect on CoupleClarity, an app for strengthening your relationship.

To accept their invitation, follow this link:
${inviteLink}

This link will allow you to create an account and connect with your partner.

Best regards,
The CoupleClarity Team`
        }).toString()
      });
      
      if (!response.ok) {
        console.error('Failed to send partner invite email:', await response.text());
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error sending partner invite email:', error);
      return false;
    }
  }
  
  async sendWelcomeEmail(user: User): Promise<boolean> {
    try {
      // Using fetch to make a request to the Mailgun API
      const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          from: `CoupleClarity <${this.fromEmail}>`,
          to: user.email,
          subject: `Welcome to CoupleClarity, ${user.firstName}!`,
          text: `Hello ${user.firstName},

Welcome to CoupleClarity! We're excited to help you strengthen your relationship.

Here are some tips to get started:
1. Complete your profile and relationship questionnaire
2. Invite your partner to join
3. Start expressing emotions and working through challenges together

If you have any questions, please reach out to our support team.

Best regards,
The CoupleClarity Team`
        }).toString()
      });
      
      if (!response.ok) {
        console.error('Failed to send welcome email:', await response.text());
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }
}

// Factory function to create the appropriate email service
export function createEmailService(): EmailService {
  // Check if Mailgun credentials are available
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && process.env.MAILGUN_FROM_EMAIL) {
    return new MailgunEmailService(
      process.env.MAILGUN_API_KEY,
      process.env.MAILGUN_DOMAIN,
      process.env.MAILGUN_FROM_EMAIL
    );
  }
  
  // Fall back to the development email service
  return new DevEmailService();
}

// Singleton instance for the application
export const emailService = createEmailService();