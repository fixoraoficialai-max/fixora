import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { StudioEditor } from "./StudioEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudioProjectPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  // Load project with scenes and their associated videos in one query
  const project = await db.project.findUnique({
    where: { id, userId: session.user.id, platform: "studio" },
    include: {
      scenes: { orderBy: { order: "asc" } },
      videos: {
        where:   { metadata: { path: ["type"], equals: "studio-scene" } },
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          status:      true,
          url:         true,
          creditsUsed: true,
          metadata:    true,
        },
      },
    },
  });

  if (!project) notFound();

  return <StudioEditor project={project} />;
}
