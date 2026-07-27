import { USE_MOCK_API } from "./config";
import { authApi as authApiReal } from "./real/auth";
import { profilesApi as profilesApiReal } from "./real/profiles";
import { jobsApi as jobsApiReal } from "./real/jobs";
import { companiesApi as companiesApiReal } from "./real/companies";
import { challengesApi as challengesApiReal } from "./real/challenges";
import { marketplaceApi as marketplaceApiReal } from "./real/marketplace";
import { notificationsApi as notificationsApiReal } from "./real/notifications";
import { adminApi as adminApiReal } from "./real/admin";
import { feedbackApi as feedbackApiReal } from "./real/feedback";
import { usersApi as usersApiReal } from "./real/users";
import { integrationsApi as integrationsApiReal } from "./real/integrations";
import { mediaApi as mediaApiReal } from "./real/media";
import { messagesApi as messagesApiReal } from "./real/messages";
import { authApiMock } from "./mock/auth";
import { profilesApiMock } from "./mock/profiles";
import { jobsApiMock } from "./mock/jobs";
import { companiesApiMock } from "./mock/companies";
import { challengesApiMock } from "./mock/challenges";
import { marketplaceApiMock } from "./mock/marketplace";
import { notificationsApiMock } from "./mock/notifications";
import { adminApiMock } from "./mock/admin";
import { feedbackApiMock } from "./mock/feedback";
import { usersApiMock } from "./mock/users";
import { integrationsApiMock } from "./mock/integrations";
import { mediaApiMock } from "./mock/media";
import { messagesApiMock } from "./mock/messages";

export const auth = USE_MOCK_API ? authApiMock : authApiReal;
export const profiles = USE_MOCK_API ? profilesApiMock : profilesApiReal;
export const jobs = USE_MOCK_API ? jobsApiMock : jobsApiReal;
export const companies = USE_MOCK_API ? companiesApiMock : companiesApiReal;
export const challenges = USE_MOCK_API ? challengesApiMock : challengesApiReal;
export const marketplace = USE_MOCK_API ? marketplaceApiMock : marketplaceApiReal;
export const notifications = USE_MOCK_API ? notificationsApiMock : notificationsApiReal;
export const admin = USE_MOCK_API ? adminApiMock : adminApiReal;
export const feedback = USE_MOCK_API ? feedbackApiMock : feedbackApiReal;
export const users = USE_MOCK_API ? usersApiMock : usersApiReal;
export const integrations = USE_MOCK_API ? integrationsApiMock : integrationsApiReal;
export const media = USE_MOCK_API ? mediaApiMock : mediaApiReal;
export const messages = USE_MOCK_API ? messagesApiMock : messagesApiReal;

export { API_BASES, USE_MOCK_API } from "./config";
export * from "./types";
export {
  DEMO_ADMIN_CREDENTIALS,
  DEMO_ANALYST_CREDENTIALS,
  DEMO_CREDENTIALS,
  DEMO_EMPLOYER_CREDENTIALS,
} from "./mock/auth";
