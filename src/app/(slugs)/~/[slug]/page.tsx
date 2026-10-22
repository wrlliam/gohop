import { notFound } from "next/navigation";
import { RedirectSlug } from "~/components/RedirectSlug";
import { getActiveLink } from "~/lib/links/get-active-link";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await getActiveLink(slug))) notFound();
  return <RedirectSlug slug={slug} />;
}
