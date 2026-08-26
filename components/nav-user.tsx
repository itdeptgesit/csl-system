import * as React from "react"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => void
  onNavigate?: (view: string) => void
}

export function NavUser({ user, onLogout, onNavigate }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [imgError, setImgError] = React.useState(false)
  const initials = (user.name || user.email || "US").substring(0, 2).toUpperCase()

  const hasAvatar = !!user.avatar && !imgError

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          render={<Link to="/profile" />}
        >
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {hasAvatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user.name}</span>
            <span className="truncate text-xs opacity-70">{user.email}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
