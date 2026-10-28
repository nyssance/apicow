import { t } from "@yaakapp-internal/lib/i18n";
import { Icon } from "@yaakapp-internal/ui";
import type { RecentFilter } from "../../hooks/useRecentFilters";
import { Dropdown, type DropdownItem } from "../core/Dropdown";
import { IconButton } from "../core/IconButton";

interface Props {
  recentFilters: RecentFilter[];
  activeFilter: string | null;
  onSelect: (value: string) => void;
  onRemove: (value: string) => void;
  onTogglePin: (value: string) => void;
  onClear: () => void;
}

export function RecentFiltersDropdown({
  recentFilters,
  activeFilter,
  onSelect,
  onRemove,
  onTogglePin,
  onClear,
}: Props) {
  const pinned = recentFilters.filter((f) => f.pinned);
  const unpinned = recentFilters.filter((f) => !f.pinned);

  const toItem = (filter: RecentFilter): DropdownItem => ({
    label: (
      <div className="font-mono text-sm truncate max-w-sm" title={filter.value}>
        {filter.value}
      </div>
    ),
    leftSlot: <Icon icon={filter.value === activeFilter ? "check" : "empty"} />,
    onSelect: () => onSelect(filter.value),
    submenuTrigger: "button",
    submenu: [
      {
        label: filter.pinned ? t("Unpin") : t("Pin"),
        icon: filter.pinned ? "unpin" : "pin",
        keepOpenOnSelect: true,
        onSelect: () => onTogglePin(filter.value),
      },
      {
        label: t("Remove"),
        icon: "trash",
        color: "danger",
        keepOpenOnSelect: true,
        onSelect: () => onRemove(filter.value),
      },
    ],
  });

  const items: DropdownItem[] = [];

  if (recentFilters.length === 0) {
    items.push({
      type: "content",
      label: (
        <span className="block px-4 py-1 text-sm text-text-subtle">
          {t("Filters you use are remembered here")}
        </span>
      ),
    });
  }

  if (pinned.length > 0) {
    items.push({ type: "separator", label: t("Pinned") }, ...pinned.map(toItem));
  }

  if (unpinned.length > 0) {
    items.push({ type: "separator", label: t("Recent") }, ...unpinned.map(toItem));
  }

  if (recentFilters.length > 0) {
    items.push(
      { type: "separator" },
      {
        label: t("Clear All"),
        leftSlot: <Icon icon="trash" />,
        color: "danger",
        onSelect: onClear,
      },
    );
  }

  return (
    <Dropdown items={items}>
      <IconButton
        size="xs"
        icon="filter"
        title={t("Recent filters")}
        iconColor="secondary"
        className="w-8 ml-0.5 mr-1 h-auto!"
      />
    </Dropdown>
  );
}
