import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class IntegrationsService {
  status() {
    return {
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET,
      ),
      emailProvider: 'resend',
      mediaProvider: 'cloudinary',
    };
  }

  createCloudinarySignature(body: Record<string, unknown>) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        configured: false,
        message: 'Cloudinary credentials are not configured. Use stored URLs in local demo mode.',
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = typeof body.folder === 'string' ? body.folder : 'skillbridge';
    const publicId = typeof body.publicId === 'string' ? body.publicId : undefined;
    const params = [
      `folder=${folder}`,
      publicId ? `public_id=${publicId}` : null,
      `timestamp=${timestamp}`,
    ]
      .filter(Boolean)
      .join('&');
    const signature = createHash('sha1')
      .update(`${params}${apiSecret}`)
      .digest('hex');

    return {
      configured: true,
      cloudName,
      // apiKey is the public half of the credential pair (like a client ID)
      // and is required by Cloudinary's own signed-upload API alongside the
      // signature - only apiSecret must never leave the server, and it
      // never does (it's only used above to compute the signature).
      apiKey,
      folder,
      publicId,
      timestamp,
      signature,
    };
  }
}
