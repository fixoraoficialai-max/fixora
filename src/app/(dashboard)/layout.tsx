import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";

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
    where: { userId: session.user.id },
    select: { balance: true },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        userCredits={credits?.balance ?? 0}
        userName={session.user.name}
        userEmail={session.user.email}
        userImage={session.user.image}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
