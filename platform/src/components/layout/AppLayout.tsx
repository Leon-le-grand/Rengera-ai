import { Link, useLocation, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  Edit2,
  FileSignature,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  deleteConversationMutation,
  listConversationsOptions,
  updateConversationMutation,
} from '@/api/generated/@tanstack/react-query.gen';
import type { ConversationOut } from '@/api/generated/types.gen';
import { useAuth } from '@/auth/AuthProvider';
import { canAccessOperationsPortal } from '@/auth/capabilities';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { SkipLink } from '@/components/ui/SkipLink';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useRouteFocus } from '@/lib/use-route-focus';
import '@/styles/workspace.css';

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff';
    default:
      return 'operator';
  }
}

function UnifiedClaudeSidebar() {
  const auth = useAuth();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const queryClient = useQueryClient();

  const pathname = useLocation({ select: (loc) => loc.pathname });
  const searchStr = useLocation({ select: (loc) => loc.searchStr });
  const activeConversationId = useMemo(() => {
    const params = new URLSearchParams(searchStr);
    return params.get('c');
  }, [searchStr]);

  const { data: conversationsData } = useQuery({
    ...listConversationsOptions(),
    enabled: auth.status === 'authenticated',
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [renameTarget, setRenameTarget] = useState<ConversationOut | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ConversationOut | null>(null);

  const updateMutation = useMutation({
    ...updateConversationMutation(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: listConversationsOptions().queryKey,
      });
      setRenameTarget(null);
    },
  });

  const deleteMutation = useMutation({
    ...deleteConversationMutation(),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: listConversationsOptions().queryKey,
      });
      if (activeConversationId === variables.path.conversation_id) {
        void router.navigate({ to: '/chat', search: { q: undefined, c: undefined } });
      }
      setDeleteTarget(null);
    },
  });

  const agent_sessions = useMemo(
    () => conversationsData?.items ?? [],
    [conversationsData?.items],
  );

  const filteredConversations = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return agent_sessions;
    return agent_sessions.filter((c) => c.title.toLowerCase().includes(q));
  }, [agent_sessions, filterQuery]);

  const showAdminPortal = canAccessOperationsPortal(auth.capabilities);

  const handleNewChat = () => {
    setFilterOpen(false);
    setOpenMobile(false);
    void router.navigate({ to: '/chat', search: { q: undefined, c: undefined } });
  };

  const handleSelectThread = (conv: ConversationOut) => {
    setFilterOpen(false);
    setOpenMobile(false);
    void router.navigate({ to: '/chat', search: { q: undefined, c: conv.id } });
  };

  const handleConfirmRename = () => {
    if (!renameTarget || !renameTitle.trim()) return;
    updateMutation.mutate({
      path: { conversation_id: renameTarget.id },
      body: { title: renameTitle.trim() },
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({
      path: { conversation_id: deleteTarget.id },
    });
  };

  const handleSignOut = async () => {
    await auth.logout();
    setOpenMobile(false);
    await router.navigate({ to: '/login' });
  };

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border bg-[#111113] text-[#e4e4e7]"
      >
        {/* Top Brand + Collapse Trigger Header (Matches Claude Desktop/Web) */}
        <SidebarHeader className="px-2.5 pt-3 pb-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <SidebarTrigger
                className="h-7 w-7 shrink-0 text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-white"
                title="Toggle sidebar"
              />
              <Link
                to="/chat"
                search={{ q: undefined, c: undefined }}
                onClick={() => setOpenMobile(false)}
                aria-label="Rengera workspace"
                title="Rengera workspace"
                className="flex min-w-0 items-center gap-2 truncate font-serif text-lg font-semibold tracking-tight text-[#f4f4f5]"
              >
                <span className="rengera-workspace-brand-mark" aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:hidden">Rengera</span>
              </Link>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-2">
          {/* Primary Navigation Group */}
          <SidebarGroup className="p-0">
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleNewChat}
                  tooltip="New chat"
                  isActive={pathname === '/chat' && !activeConversationId && !filterOpen}
                  className="h-8.5 rounded-md text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] data-[active=true]:bg-[#1c1c20] data-[active=true]:font-medium data-[active=true]:text-white"
                >
                  <Plus className="h-4 w-4 text-[#d9b45b]" />
                  <span>New</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setFilterOpen((prev) => !prev)}
                  tooltip="Search chats"
                  isActive={filterOpen}
                  className="h-8.5 rounded-md text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] data-[active=true]:bg-[#1c1c20] data-[active=true]:text-white"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="shard Library"
                  isActive={pathname === '/library' || pathname.startsWith('/shards')}
                  className="h-8.5 rounded-md text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] data-[active=true]:bg-[#1c1c20] data-[active=true]:text-white"
                >
                  <Link
                    to="/library"
                    onClick={() => {
                      setFilterOpen(false);
                      setOpenMobile(false);
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>shard Library</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Draft Complaint"
                  isActive={pathname.startsWith('/complaints')}
                  className="h-8.5 rounded-md text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] data-[active=true]:bg-[#1c1c20] data-[active=true]:text-white"
                >
                  <Link
                    to="/complaints"
                    onClick={() => {
                      setFilterOpen(false);
                      setOpenMobile(false);
                    }}
                  >
                    <FileSignature className="h-4 w-4" />
                    <span>Draft Complaint</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Saved"
                  isActive={pathname.startsWith('/bookmarks')}
                  className="h-8.5 rounded-md text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] data-[active=true]:bg-[#1c1c20] data-[active=true]:text-white"
                >
                  <Link
                    to="/bookmarks"
                    onClick={() => {
                      setFilterOpen(false);
                      setOpenMobile(false);
                    }}
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>Saved</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Optional Search Input */}
          {filterOpen ? (
            <div className="mt-2 px-1 group-data-[collapsible=icon]:hidden">
              <Input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter chats…"
                className="h-8 border-[#27272a] bg-[#18181b] text-xs text-white placeholder:text-[#71717a]"
                autoFocus
              />
            </div>
          ) : null}

          {/* Recents agent_session List (Hidden when collapsed to icon mode) */}
          <SidebarGroup className="mt-4 flex-1 p-0 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="h-6 px-2 text-[11px] font-medium text-[#71717a]">
              Recents
            </SidebarGroupLabel>
            <SidebarMenu className="mt-1 gap-0.5">
              {filteredConversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[#71717a]">
                  {filterQuery ? 'No matching chats' : 'No recent chats yet'}
                </p>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive =
                    pathname.startsWith('/chat') && activeConversationId === conv.id;
                  return (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        onClick={() => handleSelectThread(conv)}
                        isActive={isActive}
                        className="h-8 rounded-md px-2 text-[13px] font-normal text-[#c4c4cc] hover:bg-[#1c1c20] hover:text-white data-[active=true]:bg-[#1c1c20] data-[active=true]:font-medium data-[active=true]:text-white"
                      >
                        <span className="truncate">{conv.title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction
                            showOnHover
                            aria-label="agent_session options"
                            className="text-[#71717a] hover:bg-[#27272a] hover:text-white"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          className="w-40 border-[#27272a] bg-[#18181b] text-[#e4e4e7]"
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameTarget(conv);
                              setRenameTitle(conv.title);
                            }}
                            className="cursor-pointer text-xs focus:bg-[#27272a] focus:text-white"
                          >
                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(conv)}
                            className="cursor-pointer text-xs text-red-447 focus:bg-red-901/40 focus:text-red-279"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* Bottom User Profile Footer (Matches Claude Bottom-Left User Pill) */}
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={auth.user?.display_name || 'Account'}
                    className="h-10 rounded-md px-2 text-[#e4e4e7] hover:bg-[#1c1c20]"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#27272a] text-[11px] font-semibold uppercase text-[#d9b45b]">
                      {(auth.user?.display_name || 'U').slice(0, 2)}
                    </div>
                    <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium text-[#f4f4f5]">
                        {auth.user?.display_name || 'Account'}
                      </span>
                      <span className="truncate text-[11px] text-[#71717a]">
                        {roleLabel(auth.user?.role || 'user')}
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
                        {auth.user?.display_name}
                      </p>
                      {auth.user?.email ? (
                        <p className="truncate text-[11px] text-[#71717a]">
                          {auth.user.email}
                        </p>
                      ) : null}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#27272a]" />

                  {showAdminPortal ? (
                    <>
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer text-xs text-[#d9b45b] focus:bg-[#27272a] focus:text-[#d9b45b]"
                      >
                        <Link to="/admin" onClick={() => setOpenMobile(false)}>
                          <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                          Operations Console
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#27272a]" />
                    </>
                  ) : null}

                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer text-xs focus:bg-[#27272a] focus:text-white"
                  >
                    <Link to="/settings" onClick={() => setOpenMobile(false)}>
                      <SettingsIcon className="mr-2 h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer text-xs text-red-425 focus:bg-red-992/30 focus:text-red-311"
                  >
                    <Link to="/emergency" onClick={() => setOpenMobile(false)}>
                      <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                      Emergency 112 Help
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-[#27272a]" />

                  <DropdownMenuItem
                    onClick={() => void handleSignOut()}
                    className="cursor-pointer text-xs text-[#a1a1aa] focus:bg-[#27272a] focus:text-white"
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

      {/* Rename agent_session Dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="border-[#27272a] bg-[#121215] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Rename chat</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="Chat title"
              className="border-[#27272a] bg-[#18181b] text-sm text-white"
              autoFocus
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRenameTarget(null)}
              className="border-[#27272a] text-[#a1a1aa]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRename}
              disabled={updateMutation.isPending || !renameTitle.trim()}
              className="bg-[#d9b45b] font-semibold text-black hover:bg-[#c2a277]"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete agent_session Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-[#27272a] bg-[#121215] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-red-434">
              Delete chat
            </DialogTitle>
          </DialogHeader>
          <p className="py-2 text-xs text-[#a1a1aa]">
            Delete <span className="font-medium text-white">“{deleteTarget?.title}”</span>?
            This cannot be undone.
          </p>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="border-[#27272a] text-[#a1a1aa]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const mainRef = useRouteFocus<HTMLElement>();
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const isChatRoute = pathname === '/chat' || pathname.startsWith('/chat/');

  return (
    <TooltipProvider delayDuration={120}>
      <SidebarProvider
        defaultOpen
        className={`h-dvh w-full overflow-hidden text-[var(--app-text)] ${isChatRoute ? 'rengera-workspace' : 'bg-background'}`}
      >
        <SkipLink />

        {/* Single Unified Collapsible Sidebar (Desktop Icon/Full + Mobile Slide-Over Sheet) */}
        <UnifiedClaudeSidebar />

        {/* Main Distraction-Free Canvas */}
        <SidebarInset className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
          {/* Minimal Mobile Top Bar so the Slide-Over Sheet Trigger is always reachable on phones */}
          <header className={`flex h-12 shrink-0 items-center justify-between px-3 md:hidden ${isChatRoute ? 'workspace-mobile-header' : 'border-b border-sidebar-border bg-background'}`}>
            <div className="flex items-center gap-2">
              <SidebarTrigger
                className={`h-8 w-8 ${isChatRoute ? 'workspace-mobile-trigger' : 'text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-white'}`}
                aria-label="Open navigation menu"
              />
              {isChatRoute ? <span className="rengera-workspace-brand-mark" aria-hidden="true" /> : null}
              <span className={`font-serif text-base font-semibold ${isChatRoute ? 'text-[#0b0b0b]' : 'text-white'}`}>
                Rengera
              </span>
            </div>
            <Link
              to="/chat"
              search={{ q: undefined, c: undefined }}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium ${isChatRoute ? 'workspace-mobile-new' : 'border border-[#27272a] bg-[#18181b] text-[#e4e4e7]'}`}
            >
              <Plus className={`h-3.5 w-3.5 ${isChatRoute ? 'text-[#94681a]' : 'text-[#d9b45b]'}`} />
              New
            </Link>
          </header>

          {isChatRoute ? (
            <div
              id="main-content"
              ref={mainRef as React.RefObject<HTMLDivElement>}
              tabIndex={-1}
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden outline-none"
            >
              {children}
            </div>
          ) : (
            <div
              id="main-content"
              ref={mainRef as React.RefObject<HTMLDivElement>}
              tabIndex={-1}
              className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 outline-none sm:px-6 lg:px-10"
            >
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </div>
          )}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
