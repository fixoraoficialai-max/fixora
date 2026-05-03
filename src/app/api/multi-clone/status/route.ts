import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { multiCloneStatusSchema } from "@/lib/validations/multi-clone";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  // We use the first jobId as an anchor to find the whole group
  const parsed = multiCloneStatusSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { jobId } = parsed.data;
  const userId = session.user.id;

  // 1. Find the anchor video to get the multiCloneId
  const anchorVideo = await db.video.findUnique({
    where: { id: jobId, userId },
    select: { metadata: true },
  });

  if (!anchorVideo || !anchorVideo.metadata) {
    return ApiErrors.notFound("Multi-Clone Session");
  }

  const meta = anchorVideo.metadata as { multiCloneId?: string };
  if (!meta.multiCloneId) {
    return ApiErrors.validation({ message: "Job is not part of a Multi-Clone session" });
  }

  const multiCloneId = meta.multiCloneId;

  // 2. Fetch all parts of this multi-clone
  const parts = await db.video.findMany({
    where: {
      userId,
      metadata: { path: ["multiCloneId"], equals: multiCloneId }
    },
    select: {
      id: true,
      status: true,
      url: true,
      metadata: true,
    }
  });

  if (parts.length === 0) return ApiErrors.notFound("Multi-Clone parts");

  type PartMeta = { multiCloneId?: string; partIndex?: number };

  // 2b. Sort by sequence in memory (Prisma sorting on JSON paths can be limited)
  parts.sort((a, b) => {
    const partA = (a.metadata as PartMeta)?.partIndex ?? 0;
    const partB = (b.metadata as PartMeta)?.partIndex ?? 0;
    return partA - partB;
  });

  // 3. Aggregate status
  const completed = parts.filter(p => p.status === "COMPLETED");
  const failed = parts.filter(p => p.status === "FAILED");
  const pending = parts.filter(p => p.status === "PENDING" || p.status === "PROCESSING");

  let overallStatus = "PROCESSING";
  if (failed.length > 0) overallStatus = "FAILED";
  if (completed.length === parts.length) overallStatus = "COMPLETED";

  return apiSuccess({
    multiCloneId,
    overallStatus,
    progress: `${completed.length}/${parts.length}`,
    parts: parts.map(p => ({
      id: p.id,
      status: p.status,
      url: p.url,
      partIndex: (p.metadata as PartMeta)?.partIndex ?? 0
    }))
  });
}
