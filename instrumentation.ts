export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDbSingleton } = await import("@/lib/db/client");
    await initDbSingleton();
    const { resetStaleSessionConnections } = await import(
      "@/lib/services/bootstrap-service"
    );
    resetStaleSessionConnections();
  }
}
