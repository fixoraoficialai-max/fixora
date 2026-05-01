import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { CreateVideoWizard } from "@/features/video/components/CreateVideoWizard";

export const metadata: Metadata = { title: "Create New Video" };

export default function NewProjectPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        title="Create Video"
        description="Set up your project, build your scenes, and generate"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <CreateVideoWizard />
      </div>
    </div>
  );
}
