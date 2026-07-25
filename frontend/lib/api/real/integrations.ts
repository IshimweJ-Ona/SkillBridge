import { apiFetch } from "../client";
import { API_BASES } from "../config";
import type { IntegrationStatus } from "../types";

const base = API_BASES.admin;

export const integrationsApi = {
  status: () => apiFetch<IntegrationStatus>(base, "/integrations/status"),
};
