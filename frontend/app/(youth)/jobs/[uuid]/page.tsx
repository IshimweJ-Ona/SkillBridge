import { JobDetailClient } from "./job-detail-client";

export default async function JobDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <JobDetailClient uuid={uuid} />;
}
