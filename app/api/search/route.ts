import { initDbSingleton } from "@/lib/db/client";
import { searchService } from "@/lib/services/search-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await initDbSingleton();
  const url = new URL(request.url);
  const results = searchService(url.searchParams.get("q") ?? "");
  return Response.json({ results });
}
