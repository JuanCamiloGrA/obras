import { requireAdmin } from "@/lib/auth";
import { getAdminPlayList } from "@/lib/plays";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPanelPage() {
  await requireAdmin();
  const plays = await getAdminPlayList();

  return (
    <main className="pageShell adminShell">
      <AdminDashboard plays={plays} />
    </main>
  );
}
