import { AppShell } from "@/components/shell/AppShell";
import { LibraryView } from "@/components/library/LibraryView";
import { DesignNotesLayer } from "@/components/notes/DesignNotes";

export default function Home() {
  return (
    <AppShell>
      <LibraryView />
      <DesignNotesLayer />
    </AppShell>
  );
}
