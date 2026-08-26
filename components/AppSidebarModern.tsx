"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"
import {
  useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavGroup, type NavItem } from "@/components/nav-group"
import { NavUser } from "@/components/nav-user"
import { APP_MENU_STRUCTURE } from "../constants"
import { UserAccount, UserGroup } from "../types"
import { useLanguage } from "../translations"

// LUCIDE ICONS — native SVG, fully compatible with Shadcn's [&>svg]:size-4
import {
  Home,
  HelpCircle,
  Activity,
  Calendar,
  ShoppingCart,
  Package,
  Server,
  FolderOpen,
  Shield,
  Users,
  Building2,
  Briefcase,
  Layers,
  Zap,
  Phone,
  Settings,
  Megaphone,
  Key,
  User,
  LayoutGrid,
  Receipt,
  ArrowLeftRight,
  FileCheck,
  Fingerprint,
  History,
  // CSL-specific icons
  Kanban,
  Plus,
  Tag,
  GitBranch,
  Monitor,
  Files,
  Scale,
  Cloud,
  Wallet,
  PieChart,
  ClipboardList,
  BarChart2,
  BookOpen,
  Landmark,
  MoreHorizontal,
  Store,
  FileBarChart,
  Timer,
  CalendarCheck,
  Coins,
  TrendingUp,
  Bell,
  Cpu,
} from "lucide-react"

const ICON_MAP: Record<string, React.ElementType> = {
  // Original gesit-erp icons
  LayoutDashboard: Home,
  LifeBuoy: HelpCircle,
  Activity: Activity,
  Calendar: Calendar,
  ShoppingCart: ShoppingCart,
  Cpu: Cpu,
  Network: Server,
  FolderOpen: FolderOpen,
  Shield: Shield,
  Users: Users,
  Building2: Building2,
  Briefcase: Briefcase,
  Layers: Layers,
  Zap: Zap,
  Phone: Phone,
  Settings: Settings,
  Megaphone: Megaphone,
  Key: Key,
  User: User,
  Receipt: Receipt,
  ArrowLeftRight: ArrowLeftRight,
  FileCheck: FileCheck,
  Fingerprint: Fingerprint,
  History: History,
  // CSL ERP icons
  Kanban: Kanban,
  Plus: Plus,
  Tag: Tag,
  GitBranch: GitBranch,
  Monitor: Monitor,
  Files: Files,
  Scale: Scale,
  Cloud: Cloud,
  Wallet: Wallet,
  PieChart: PieChart,
  ClipboardList: ClipboardList,
  BarChart2: BarChart2,
  BookUser: BookOpen,
  Landmark: Landmark,
  MoreHorizontal: MoreHorizontal,
  Store: Store,
  FileBarChart: FileBarChart,
  Timer: Timer,
  CalendarCheck: CalendarCheck,
  Coins: Coins,
  TrendingUp: TrendingUp,
  Bell: Bell,
}

interface AppSidebarProps {
  currentUser: UserAccount | null
  groupDefinitions: UserGroup[]
  onLogout: () => void
  onNavigate?: (view: string) => void
  appName?: string
  logoUrl?: string
}

export function AppSidebarModern({
  currentUser,
  groupDefinitions,
  onLogout,
  onNavigate,
  appName = "CSL ERP",
  logoUrl = "/image/logo.png",
}: AppSidebarProps) {
  const { t } = useLanguage()
  const location = useLocation()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const allowedMenuIds = React.useMemo(() => {
    const allowed = new Set<string>()
    const role = currentUser?.role?.toLowerCase() || ""
    const userGroups = currentUser?.groups || []

    if (role.includes("admin") || role.includes("owner")) {
      APP_MENU_STRUCTURE.forEach((m) => allowed.add(m.id))
      return allowed
    }

    if (userGroups.length === 0) {
      ;["csl-my-requests", "csl-create-request", "profile"].forEach((id) =>
        allowed.add(id)
      )
      return allowed
    }

    userGroups.forEach((groupId) => {
      const groupConfig = groupDefinitions?.find((g) => g.id === groupId)
      if (groupConfig && Array.isArray(groupConfig.allowedMenus)) {
        groupConfig.allowedMenus.forEach((menuId) => allowed.add(menuId))
      }
    })

    // Auto-allow parents of allowed children
    APP_MENU_STRUCTURE.forEach((menu) => {
      if (menu.parentId && allowed.has(menu.id)) allowed.add(menu.parentId)
    })

    return allowed
  }, [currentUser, groupDefinitions])

  // Helper to build NavItem tree from a top-level menu id
  const buildNavItems = (excludeIds: string[] = []): NavItem[] => {
    const allMenus = APP_MENU_STRUCTURE
    
    // Check if user is part of CSL Team to conditionally change labels
    const isCslTeam = currentUser?.role?.toLowerCase().includes("admin") || 
                      currentUser?.role?.toLowerCase().includes("owner") || 
                      (currentUser?.groups || []).includes("csl_staff");

    return allMenus
      .filter(
        (m) =>
          !m.parentId &&
          !excludeIds.includes(m.id) &&
          allowedMenuIds.has(m.id)
      )
      .map((m) => ({
        title: m.label,
        url: m.id === "dashboard" ? "/" : `/${m.id}`,
        icon: ICON_MAP[m.iconName] || LayoutGrid,
        isActive:
          location.pathname === (m.id === "dashboard" ? "/" : `/${m.id}`),
        items: allMenus
          .filter((c) => c.parentId === m.id && allowedMenuIds.has(c.id))
          .map((c) => ({
            title: c.id === 'csl-my-requests' && isCslTeam ? 'Assigned to Me' : c.label,
            url: `/${c.id}`,
            icon: ICON_MAP[c.iconName] || LayoutGrid,
          })),
      }))
  }

  // Main nav: everything except 'settings'
  const mainItems: NavItem[] = React.useMemo(
    () => buildNavItems(["settings"]),
    [allowedMenuIds, location.pathname]
  )

  // Settings group (rendered at the bottom, above user)
  const settingsItems: NavItem[] = React.useMemo(() => {
    if (!allowedMenuIds.has("settings")) return []
    const settingsNode = APP_MENU_STRUCTURE.find((m) => m.id === "settings")
    if (!settingsNode) return []
    return [
      {
        title: settingsNode.label,
        url: "/settings",
        icon: ICON_MAP[settingsNode.iconName] || Settings,
        isActive: false,
        items: APP_MENU_STRUCTURE.filter(
          (c) => c.parentId === "settings" && allowedMenuIds.has(c.id)
        ).map((c) => ({
          title: c.label,
          url: `/${c.id}`,
          icon: ICON_MAP[c.iconName] || LayoutGrid,
        })),
      },
    ]
  }, [allowedMenuIds])

  const userData = currentUser
    ? {
        name: currentUser.fullName,
        email: currentUser.email,
        avatar: currentUser.avatarUrl || "",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "",
      }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center">
                <img src={logoUrl} alt={appName} className="size-8 object-contain" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">{appName}</span>
                <span className="truncate text-xs text-muted-foreground">Corporate Secretary & Legal</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup title="Main Menu" items={mainItems} />
        {settingsItems.length > 0 && (
          <NavGroup title="Settings" items={settingsItems} />
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userData} onLogout={onLogout} onNavigate={onNavigate} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
