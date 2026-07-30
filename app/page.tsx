import { WorkspaceProvider } from "@/lib/store";
import { Workspace } from "@/components/layout/Workspace";

export default function Home() {
  return (
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  );
}
