import { requireSession } from "@/lib/auth/session";
import { AssetLibrary } from "@/components/assets/asset-library";

export default async function AssetsPage() {
  await requireSession();
  return <AssetLibrary />;
}
