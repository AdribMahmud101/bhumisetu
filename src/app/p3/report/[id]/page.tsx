import Portal from "@/components/portal";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Portal view="p3-report" id={id} />;
}
