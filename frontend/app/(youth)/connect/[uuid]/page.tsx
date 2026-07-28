import { ConnectProfileClient } from "./connect-profile-client";

export default async function ConnectProfilePage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ConnectProfileClient uuid={uuid} />;
}
