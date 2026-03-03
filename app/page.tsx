import { Dashboard } from "@/components/dashboard";
import { getStore, sanitizeStore } from "@/lib/db";

export default async function HomePage() {
  const store = await getStore();

  return <Dashboard initialStore={sanitizeStore(store)} />;
}
