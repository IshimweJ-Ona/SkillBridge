import type { IntegrationStatus } from "../types";
import { mockLatency } from "./store";

export const integrationsApiMock = {
  async status(): Promise<IntegrationStatus> {
    await mockLatency(80, 200);
    return {
      resendConfigured: false,
      cloudinaryConfigured: false,
      emailProvider: "resend",
      mediaProvider: "cloudinary",
    };
  },
};
