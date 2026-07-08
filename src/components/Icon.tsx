import {
  Search,
  Link2,
  Star,
  Bookmark,
  X,
  ChevronDown,
  ChevronRight,
  Tag,
  Plus,
  Save,
  Settings,
  Library,
  Clock,
  LayoutGrid,
  FileText,
  Globe,
  Terminal,
  Palette,
  BarChart3,
  Rocket,
  PenTool,
  TrendingUp,
  Table,
  Sun,
  Moon,
  Monitor,
  Wand2,
  Upload,
  Download,
  Pencil,
  Trash2,
  Filter,
  ArrowUpDown,
  List,
  Code,
  Megaphone,
  GraduationCap,
  BookOpen,
  History,
  Copy,
  type LucideProps,
} from "lucide-react";

const iconMap = {
  search: Search,
  link: Link2,
  star: Star,
  star_border: Star,
  bookmark: Bookmark,
  close: X,
  expand_more: ChevronDown,
  chevron_right: ChevronRight,
  sell: Tag,
  add: Plus,
  save: Save,
  settings: Settings,
  bookmarks: Library,
  schedule: Clock,
  workspaces: LayoutGrid,
  article: FileText,
  language: Globe,
  terminal: Terminal,
  palette: Palette,
  query_stats: BarChart3,
  rocket_launch: Rocket,
  description: FileText,
  draw: PenTool,
  trending_up: TrendingUp,
  table: Table,
  light_mode: Sun,
  dark_mode: Moon,
  desktop_windows: Monitor,
  magic_button: Wand2,
  upload: Upload,
  download: Download,
  edit: Pencil,
  delete: Trash2,
  filter_list: Filter,
  sort: ArrowUpDown,
  table_rows: List,
  grid_view: LayoutGrid,
  code: Code,
  insights: TrendingUp,
  campaign: Megaphone,
  school: GraduationCap,
  book_open: BookOpen,
  history: History,
  copy: Copy,
};

export type IconName = keyof typeof iconMap;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  filled?: boolean;
}

export function Icon({ name, filled, size = 16, className, ...rest }: IconProps) {
  const Component = iconMap[name];
  if (!Component) return null;
  return (
    <Component
      size={size}
      className={className}
      fill={filled ? "currentColor" : "none"}
      strokeWidth={filled ? 1.5 : 2}
      {...rest}
    />
  );
}
