import Portal from "@/components/portal";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Portal view="record" id={(await params).id} />;
}
