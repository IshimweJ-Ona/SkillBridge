import { Injectable, Logger } from '@nestjs/common';

type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string; statusCode?: number };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const fromName = process.env.RESEND_FROM_NAME ?? 'SkillBridge';
    const apiUrl = process.env.RESEND_API_URL ?? 'https://api.resend.com/emails';
    const recipients = input.to.filter(Boolean);

    if (!apiKey) {
      return { status: 'skipped', reason: 'RESEND_API_KEY is not configured.' };
    }

    if (!fromEmail) {
      return {
        status: 'skipped',
        reason: 'RESEND_FROM_EMAIL is not configured.',
      };
    }

    if (recipients.length === 0) {
      return {
        status: 'skipped',
        reason: 'No email recipients were configured.',
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.formatFrom(fromName, fromEmail),
          to: recipients,
          subject: this.sanitizeText(input.subject),
          text: this.sanitizeText(input.text),
          ...(input.html ? { html: input.html } : {}),
        }),
      });

      if (response.ok) {
        return { status: 'sent' };
      }

      const errorBody = await response.text();
      const reason = `Resend returned ${response.status}: ${errorBody}`;
      this.logger.warn(reason);

      return { status: 'failed', reason, statusCode: response.status };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown Resend error.';
      this.logger.warn(`Resend request failed: ${reason}`);

      return { status: 'failed', reason };
    }
  }

  private sanitizeText(input: string): string {
    return input
      .replace(/[\r\n]/g, ' ')
      .replace(/[<>]/g, '')
      .trim();
  }

  private formatFrom(name: string, email: string) {
    const safeName = name.replace(/[\r\n"]/g, '').trim();

    return safeName ? `${safeName} <${email}>` : email;
  }
}
