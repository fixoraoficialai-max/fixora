import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { CreateVideoWizard } from "@/features/video/components/CreateVideoWizard";

export const metadata: Metadata = { title: "Create New Video" };

export default function NewProjectPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Create Video"
        description="Set up your project, build your scenes, and generate"
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Link>
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <CreateVideoWizard />
      </div>
    </div>
  );
}
