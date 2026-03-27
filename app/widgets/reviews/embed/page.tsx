import { EmbedPageShell } from "@/components/embed/embed-page-shell"

export default async function ReviewsEmbedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <EmbedPageShell searchParams={searchParams} />
}
