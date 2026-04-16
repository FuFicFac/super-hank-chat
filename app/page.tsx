import { initDbSingleton } from "@/lib/db/client";
import { createSessionService, listSessionsService } from "@/lib/services/session-service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await initDbSingleton();
  const sessions = listSessionsService();
  if (sessions.length > 0) {
    redirect(`/sessions/${sessions[0].id}`);
  }
  const created = createSessionService({});
  redirect(`/sessions/${created.id}`);
}
