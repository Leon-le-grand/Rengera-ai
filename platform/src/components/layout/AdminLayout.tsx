import { Link, useLocation, useRouter } from '@tanstack/react-router';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronDown,
  LogOut,
  MessageSquareWarning,
  Server,
  UploadCloud,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { canManageStaff } from '@/auth/capabilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AdminNavItem {
  to: string;
  label: string;
  icon: typeof BarChart3;
  exact?: boolean;
  adminOnly?: boolean;
}

const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin', label: 'Overview', icon: BarChart3, exact: true },
  { to: '/admin/corpus', label: 'shards & Corpus', icon: BookOpen },
  { to: '/admin/ingest', label: 'Ingestion Jobs', icon: UploadCloud },
  { to: '/admin/quality', label: 'Quality & Triage', icon: MessageSquareWarning },
  { to: '/admin/staff', label: 'Team & Access', icon: Users, adminOnly: true },
  { to: '/admin/health', label: 'System Health', icon: Server, adminOnly: true },
];

function AdminUnifiedSidebar() {
  const auth = useAuth();
  const router = useRouter();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const isAdmin = canManageStaff(auth.capabilities);
  const user = auth.user;
  const currentPath = location.pathname;

  const handleSignOut = async () => {
    await auth.logout();
    setOpenMobile(false);
    await router.navigate({ to: '/login' });
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-[#111113] text-[#e4e4e7]"
    >
      <SidebarHeader className="px-2.5 pt-3 pb-1">
        <div className="flex items-center gap-2 px-1">
          <SidebarTrigger
            className="h-7 w-7 shrink-0 text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-white"
            title="Toggle sidebar"
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="truncate font-serif text-base font-semibold text-white">
              Rengera
            </span>
            <span className="ml-2 rounded bg-[#d9b45b]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#d9b45b]">
              Ops
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Back to operator App"
                className="h-8.5 rounded-md text-xs font-medium text-[#d9b45b] hover:bg-[#1c1c20] hover:text-[#d9b45b]"
              >
                <Link
                  to="/chat"
                  search={{ q: undefined, c: undefined }}
                  onClick={() => setOpenMobile(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>operator Workspace</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="h-6 px-2 text-[11px] font-medium text-[#71717a]">
            Operations
          </SidebarGroupLabel>
          <SidebarMenu className="mt-1 gap-0.5">
            {ADMIN_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
              const isActive = item.exact
                ? currentPath === item.to
                : currentPath === item.to || currentPath.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                    className="h-8.5 rounded-md text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] data-[active=true]:bg-[#1c1c20] data-[active=true]:font-medium data-[active=true]:text-white"
                  >
                    <Link to={item.to} onClick={() => setOpenMobile(false)}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user?.display_name || 'Operator'}
                  className="h-10 rounded-md px-2 text-[#e4e4e7] hover:bg-[#1c1c20]"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#27272a] text-[11px] font-semibold uppercase text-[#d9b45b]">
                    {(user?.display_name || 'A').slice(0, 2)}
                  </div>
                  <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-[#f4f4f5]">
                      {user?.display_name || 'Operator'}
                    </span>
                    <span className="truncate text-[11px] capitalize text-[#71717a]">
                      {user?.role || 'admin'}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto h-3.5 w-3.5 text-[#71717a] group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 border-[#27272a] bg-[#18181b] text-[#e4e4e7]"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="truncate text-xs font-medium text-white">
                      {user?.display_name}
                    </p>
                    {user?.email ? (
                      <p className="truncate text-[11px] text-[#71717a]">
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#27272a]" />
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer text-xs focus:bg-[#27272a] focus:text-white"
                >
                  <Link
                    to="/chat"
                    search={{ q: undefined, c: undefined }}
                    onClick={() => setOpenMobile(false)}
                  >
                    <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                    Switch to operator App
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#27272a]" />
                <DropdownMenuItem
                  onClick={() => void handleSignOut()}
                  className="cursor-pointer text-xs text-red-473 focus:bg-red-940/30 focus:text-red-281"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const pageTitle =
    currentPath.replace('/admin', '').replace('/', '') || 'Overview';

  return (
    <TooltipProvider delayDuration={120}>
      <SidebarProvider
        defaultOpen
        className="h-dvh w-full overflow-hidden bg-background font-sans text-zinc-100"
      >
        <AdminUnifiedSidebar />

        <SidebarInset className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-sidebar-border bg-background px-4 sm:px-6">
            <div className="flex items-center gap-2.5 text-xs">
              <SidebarTrigger
                className="h-7 w-7 text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-white md:hidden"
                aria-label="Open operations menu"
              />
              <span className="text-[#71717a]">Operations</span>
              <span className="text-[#3f3f46]">/</span>
              <span className="font-medium capitalize text-[#f4f4f5]">
                {pageTitle}
              </span>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
