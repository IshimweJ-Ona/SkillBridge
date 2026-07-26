import { ContractDetailClient } from "./contract-detail-client";

export default async function ContractDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ContractDetailClient uuid={uuid} />;
}
