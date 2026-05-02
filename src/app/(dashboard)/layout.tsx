import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Belt-and-suspenders auth check (middleware handles most cases)
  if (!session?.user?.id) {
    redirect("/login");
  }

  const credits = await db.userCredits.findUnique({
    where:  { userId: session.user.id },
    select: { balance: true },
  });

  return (
    <DashboardShell
      userCredits={credits?.balance ?? 0}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
    >
      {children}
    </DashboardShell>
  );
}
