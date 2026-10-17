import Portal from "@/components/portal";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Portal view="land" id={(await params).id} />;
}
