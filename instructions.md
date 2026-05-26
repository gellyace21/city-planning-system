## Codebase Orientation

This app is a Next.js dashboard for city planning workflows. The important split is:

- Theme and layout live at the app shell level.
- AIP and Monitoring live inside one shared table controller.
- Server actions are the write path to Neon.
- The client table handles filtering, sorting, editing, comments, autosave, and exports.

## Dark Mode

Dark mode is controlled by `next-themes` in `app/providers.tsx`.

- `ThemeProvider` uses `attribute="class"`, so the library toggles a `dark` class on the root `<html>` element.
- The current choice is stored in local storage under `theme-preference`.
- The user opens the theme picker from the avatar menu, which launches `SettingsModal`.
- In `SettingsModal`, the Light and Dark buttons call `setTheme("light")` and `setTheme("dark")`.
- Styling reacts in `app/globals.css`:
  - `@custom-variant dark (&:is(.dark *))` makes Tailwind's dark styles apply under `.dark`.
  - The `.dark` block swaps CSS variables like `--background`, `--foreground`, `--card`, and `--muted-foreground`.
  - `html.dark` also sets `color-scheme: dark`, so native controls match.

In practice, the toggle is not a custom global React state. It is a persisted theme class on `<html>`.

Example implementation pattern:

```tsx
const { theme, setTheme } = useTheme();

<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
  Toggle theme
</button>;
```

If you wanted to add a system theme option, you would usually add one more button and call `setTheme("system")`, while keeping the same provider in `app/providers.tsx`.

## Project Tables

The main table controller is `components/project-monitoring/ProjectTable.tsx`.

It owns most of the interactive behavior:

- row creation and deletion
- inline editing
- sort and filter state
- row selection
- undo and redo
- comments and history panels
- file upload handling for leads
- export to XLSX
- autosave to local storage

The page decides which mode to render:

- `app/dashboard/project-monitoring/page.tsx` loads monitoring rows and passes `mode="monitoring"`.
- `app/dashboard/annual-investment-plan/page.tsx` loads AIP rows and passes `mode="aip"`.

Inside `ProjectTable`, the `mode` prop switches the UI and data flow:

- In AIP mode, it renders `AIPTable`.
- In monitoring mode, it renders `MonitoringTable`.
- Each mode has its own search, year filter, sort, and status tab state.
- The final filtered row list is computed in `filteredAip` or `filteredMonitoring` and passed down.

The child table components are mostly presentational with table-specific controls:

- `AIPTable` handles AIP columns, sector and department filters, and lead/admin status styling.
- `MonitoringTable` handles monitoring columns, resizing, and virtual-ish extra empty rows.

Example implementation pattern for adding a new table feature:

1. Add the new piece of state in `ProjectTable`.
2. Compute a filtered or derived list with `useMemo`.
3. Pass the final data and handlers into `AIPTable` or `MonitoringTable`.
4. Keep the child table focused on rendering and cell interactions.

For example, if you wanted a new "location" filter in monitoring, the shape would look like this:

```tsx
const [monitoringLocation, setMonitoringLocation] = useState("All");

const filteredMonitoring = useMemo(() => {
  return (
    monitoringRows
      .filter(
        (row) =>
          monitoringLocation === "All" || row.location === monitoringLocation,
      )
      // keep the other existing filters here
      .sort(/* existing sort logic */)
  );
}, [monitoringRows, monitoringLocation]);

<MonitoringTable
  filtered={filteredMonitoring}
  // other existing props
/>;
```

For an editable AIP field, the usual flow is:

```tsx
const startAipEdit = (
  rowId: number,
  field: keyof AIPRow,
  currentVal: string | number,
) => {
  setAipEditCell({ rowId, field });
  setAipEditValue(String(currentVal));
};

const commitAipEdit = async () => {
  if (!aipEditCell) return;
  await updateAipRowFieldAction(
    aipEditCell.rowId,
    aipEditCell.field,
    aipEditValue,
  );
  setAipEditCell(null);
  setAipEditValue("");
};
```

That same pattern is reused for monitoring rows with the monitoring-specific action and state.

## Data Flow

The read path is:

1. Page loads session and role.
2. Page calls `getAipPageData()` or `getMonitoringPageData()`.
3. Those call `getProjectMonitoringData()` in `lib/services/projectMonitoringService.ts`.
4. That service reads the DB state, converts raw rows into typed rows, and applies role-based filtering.

The write path is:

- Client events call server actions in `lib/services/projectMonitoringActions.ts`.
- Those actions call the service layer.
- The service layer writes to Neon through `lib/services/projectMonitoringTableStore.ts`.
- The action revalidates the relevant route so the page reloads with fresh data.

## Role Behavior

- Super admin can access the admin area, but the project-monitoring page redirects super admins away from the admin-only view.
- Admin can edit both AIP and monitoring rows.
- Lead mostly works through the AIP workspace and uploads files.
- Submitted lead uploads are treated differently from drafts, and the service layer filters what admins see accordingly.

## If You Want To Read The Code In Order

Start here:

1. `app/layout.tsx`
2. `app/providers.tsx`
3. `components/SettingsModal.tsx`
4. `app/dashboard/annual-investment-plan/page.tsx`
5. `app/dashboard/project-monitoring/page.tsx`
6. `components/project-monitoring/ProjectTable.tsx`
7. `lib/services/projectMonitoringService.ts`

`TODO.md` is useful for history, but the implementation files above are the source of truth.
