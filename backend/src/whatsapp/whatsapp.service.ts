import { Injectable, Logger } from '@nestjs/common';

type SendWhatsAppInput = {
  to: string;
  text: string;
};

export type SendWhatsAppResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string; statusCode?: number };

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async send(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const from = process.env.WHATSAPP_SYSTEM_PHONE;
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;

    if (!from) {
      return {
        status: 'skipped',
        reason: 'WHATSAPP_SYSTEM_PHONE is not configured.',
      };
    }

    if (!apiUrl) {
      return {
        status: 'skipped',
        reason: 'WHATSAPP_API_URL is not configured.',
      };
    }

    if (!apiToken) {
      return {
        status: 'skipped',
        reason: 'WHATSAPP_API_TOKEN is not configured.',
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.to,
          text: input.text,
        }),
      });

      if (response.ok) {
        return { status: 'sent' };
      }

      const errorBody = await response.text();
      const reason = `WhatsApp provider returned ${response.status}: ${errorBody}`;
      this.logger.warn(reason);

      return { status: 'failed', reason, statusCode: response.status };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown WhatsApp provider error.';
      this.logger.warn(`WhatsApp provider request failed: ${reason}`);

      return { status: 'failed', reason };
    }
  }
}
