import { ChallengeWorkspaceClient } from "./challenge-workspace-client";

export default async function ChallengeWorkspacePage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ChallengeWorkspaceClient uuid={uuid} />;
}
