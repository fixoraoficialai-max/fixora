import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { HistoryClient } from "@/components/shared/HistoryClient";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [videos, images] = await Promise.all([
    db.video.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        url: true,
        status: true,
        duration: true,
        createdAt: true,
        metadata: true,
        project: { select: { id: true, name: true } },
      },
    }),
    db.generatedImage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Historial"
        description={`${videos.length} videos · ${images.length} imágenes`}
      />
      <HistoryClient videos={videos} images={images} />
    </div>
  );
}
