import type { IntegrationStatus } from "../types";
import { mockLatency } from "./store";

export const integrationsApiMock = {
  async status(): Promise<IntegrationStatus> {
    await mockLatency(80, 200);
    return {
      resendConfigured: false,
      mtnMomoSandboxConfigured: false,
      cloudinaryConfigured: false,
      emailProvider: "resend",
      paymentProvider: "mtn-momo-sandbox",
      mediaProvider: "cloudinary",
    };
  },
};
