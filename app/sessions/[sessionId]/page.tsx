import { ChatPageClient } from "./chat-page-client";
import { initDbSingleton } from "@/lib/db/client";
import { getSessionDetail } from "@/lib/services/session-service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await initDbSingleton();
  const { sessionId } = await params;
  const session = getSessionDetail(sessionId);
  if (!session) notFound();
  return <ChatPageClient sessionId={sessionId} initialTitle={session.title} />;
}
