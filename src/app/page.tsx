import { headers } from "next/headers";
import DesktopPage from "@/(desktop)/page";
import MobilePage from "@/(mobile)/page";

export default async function Root() {
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";

  const isMobile = /android|iphone|ipad|ipod|mobile|blackberry|opera mini|iemobile/i.test(ua);

  return isMobile ? <MobilePage /> : <DesktopPage />;
}
