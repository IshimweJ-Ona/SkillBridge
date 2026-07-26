import { ApplicantDetailClient } from "./applicant-detail-client";

export default async function ApplicantDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ApplicantDetailClient uuid={uuid} />;
}
