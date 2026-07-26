import { ListingDetailClient } from "./listing-detail-client";

export default async function ListingDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ListingDetailClient uuid={uuid} />;
}
