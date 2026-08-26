import {
  Search,
  Link2,
  X,
  ChevronDown,
  Library,
  LayoutGrid,
  Globe,
  Sun,
  Moon,
  ArrowUpDown,
  History,
  Copy,
  Check,
  type LucideProps,
} from "lucide-react";

const iconMap = {
  search: Search,
  link: Link2,
  close: X,
  expand_more: ChevronDown,
  bookmarks: Library,
  workspaces: LayoutGrid,
  language: Globe,
  light_mode: Sun,
  dark_mode: Moon,
  sort: ArrowUpDown,
  history: History,
  copy: Copy,
  check: Check,
};

export type IconName = keyof typeof iconMap;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  const Component = iconMap[name];
  if (!Component) return null;
  return (
    <Component
      size={size}
      className={className}
      fill="none"
      strokeWidth={2}
      {...rest}
    />
  );
}
