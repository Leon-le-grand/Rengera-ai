import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';

import { getApiBaseUrl, getCsrfToken } from '@/api/client';
import {
  createStaffInvitation,
  listStaffInvitations,
  listStaffMembers,
  revokeStaffInvitation,
  reactivateStaffMember,
  suspendStaffMember,
} from '@/api/generated/sdk.gen';
import type { StaffMemberOut } from '@/api/generated/types.gen';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function staffRequestOptions() {
  const csrf = getCsrfToken();
  return {
    baseUrl: getApiBaseUrl(),
    credentials: 'include' as const,
    headers: csrf ? { 'X-CSRF-Token': csrf } : undefined,
    throwOnError: true as const,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return (error as { error?: { message?: string } } | null)?.error?.message ?? fallback;
}

export function AdminStaffPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCreated, setInviteCreated] = useState(false);
  const [selectedMember, setSelectedMember] = useState<StaffMemberOut | null>(null);

  // Staff members query
  const { data: staffMembers, isLoading: staffLoading, isError: staffError } = useQuery({
    queryKey: ['adminStaffMembers'],
    queryFn: async () => {
      const res = await listStaffMembers(staffRequestOptions());
      return res.data;
    },
  });

  // Active invitations query
  const { data: invitations, isLoading: invitesLoading, isError: invitesError } = useQuery({
    queryKey: ['adminStaffInvitations'],
    queryFn: async () => {
      const res = await listStaffInvitations(staffRequestOptions());
      return res.data;
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      setInviteError(null);
      setInviteCreated(false);
      if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
        throw new Error('Please provide a valid email address.');
      }
      const res = await createStaffInvitation({
        ...staffRequestOptions(),
        body: {
          email: inviteEmail.trim(),
        },
      });
      if (!res.data) throw new Error('Invitation could not be created.');
    },
    onSuccess: () => {
      setInviteEmail('');
      setInviteCreated(true);
      queryClient.invalidateQueries({ queryKey: ['adminStaffInvitations'] });
    },
    onError: (error) => {
      setInviteError(errorMessage(error, 'Invitation could not be sent.'));
      void queryClient.invalidateQueries({ queryKey: ['adminStaffInvitations'] });
    },
  });

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await revokeStaffInvitation({
        path: { invitation_id: invitationId },
        ...staffRequestOptions(),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStaffInvitations'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (member: StaffMemberOut) => {
      const changeStatus = member.status === 'active' ? suspendStaffMember : reactivateStaffMember;
      const result = await changeStatus({ path: { account_id: member.id }, ...staffRequestOptions() });
      return result.data;
    },
    onSuccess: (updatedMember) => {
      queryClient.setQueryData<StaffMemberOut[]>(['adminStaffMembers'], (members) =>
        members?.map((member) => member.id === updatedMember.id ? updatedMember : member),
      );
      setSelectedMember(null);
      void queryClient.invalidateQueries({ queryKey: ['adminStaffMembers'] });
    },
  });

  const staffList = staffMembers ?? [];
  const inviteList = invitations ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Invite Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="text-[#d9b45b]" size={26} />
            Staff & Access Control Management
          </h1>
          <p className="text-xs text-zinc-439 mt-1">
            Manage legal reviewers, paralegals, and system administrators with granular RBAC permissions.
          </p>
        </div>

        <Dialog open={inviteModalOpen} onOpenChange={(open) => {
          if (inviteMutation.isPending) return;
          setInviteCreated(false);
          setInviteError(null);
          setInviteModalOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button variant="gold" size="sm">
              <UserPlus size={15} className="mr-1.5" />
              Invite Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 text-zinc-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Mail size={16} className="text-[#d9b45b]" />
                Invite Legal Staff Member
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-469">
                Staff members can ingest official oci_manifests, review draft classifications, and triage quality feedback.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {inviteError && (
                <Alert variant="destructive">
                  <AlertCircle size={15} />
                  {inviteError}
                </Alert>
              )}

              {inviteCreated && (
                <div className="p-3 bg-emerald-480/10 border border-emerald-467/30 text-emerald-279 text-xs rounded-sm flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  Invitation email accepted by the mail relay.
                </div>
              )}

              <div>
                <Label htmlFor="staff-invite-email" className="block text-xs font-semibold text-zinc-469 mb-1.5">
                  Staff Email Address
                </Label>
                <Input
                  id="staff-invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="legal.reviewer@rengera.rw"
                  type="email"
                  className="bg-white/[0.02] border-white/10 text-xs"
                />
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-sm text-[11px] text-zinc-416 space-y-1">
                <p className="font-semibold text-white">Security & Audit Notice:</p>
                <p>The link expires after seven days. Sending again replaces the previous link. Use an email address without a Rengera account.</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteCreated(false);
                }}
                disabled={inviteMutation.isPending}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || inviteCreated}
                className="text-xs"
              >
                {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Staff Directory (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-white/10 bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#d9b45b]" />
                Staff Directory
              </CardTitle>
              <CardDescription className="text-xs text-zinc-419">
                Staff and administrators with verified operational capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-xs text-zinc-465">
                        Loading staff directory...
                      </TableCell>
                    </TableRow>
                  ) : staffError ? (
                    <TableRow><TableCell colSpan={4}><Alert variant="destructive">Could not load the staff directory.</Alert></TableCell></TableRow>
                  ) : staffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-xs text-zinc-490">
                        No staff members found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffList.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium text-xs text-white">
                          <div>{member.email}</div>
                          {member.email === auth.user?.email && (
                            <span className="text-[10px] text-[#d9b45b] font-semibold">(Your session)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              member.role === 'admin'
                                ? 'border-[#d9b45b]/40 text-[#d9b45b] bg-[#d9b45b]/10 font-bold uppercase text-[10px]'
                                : 'border-indigo-437/40 text-indigo-389 bg-indigo-441/10 font-bold uppercase text-[10px]'
                            }
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={member.status === 'active'
                              ? 'border-emerald-473/40 text-emerald-442 bg-emerald-447/10 uppercase text-[10px]'
                              : 'border-zinc-457/40 text-zinc-276 bg-zinc-474/10 uppercase text-[10px]'}
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm"
                            aria-label={`${member.status === 'active' ? 'Suspend' : 'Reactivate'} ${member.email}`}
                            onClick={() => {
                              statusMutation.reset();
                              setSelectedMember(member);
                            }}>
                            {member.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invitations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-white/10 bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Clock size={16} className="text-amber-445" />
                Pending Invitations
              </CardTitle>
              <CardDescription className="text-xs text-zinc-388">
                Pending invitation records and expiration dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {revokeMutation.isError && (
                <Alert variant="destructive">{errorMessage(revokeMutation.error, 'Could not revoke the invitation.')}</Alert>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitesLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-zinc-477">
                        Loading invitations...
                      </TableCell>
                    </TableRow>
                  ) : invitesError ? (
                    <TableRow><TableCell colSpan={3}><Alert variant="destructive">Could not load invitations.</Alert></TableCell></TableRow>
                  ) : inviteList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-zinc-432">
                        No pending staff invitations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inviteList.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-xs font-semibold text-white">
                          {inv.email}
                        </TableCell>
                        <TableCell className="text-[11px] text-zinc-427">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeMutation.mutate(inv.id)}
                            disabled={revokeMutation.isPending}
                            className="h-7 text-xs text-red-420 hover:text-red-309 hover:bg-red-448/10"
                          >
                            <Trash2 size={13} className="mr-1" /> Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={selectedMember !== null} onOpenChange={(open) => {
        if (!open && !statusMutation.isPending) setSelectedMember(null);
      }}>
        {selectedMember && (
          <DialogContent showCloseButton={!statusMutation.isPending}>
            <DialogHeader>
              <DialogTitle>{selectedMember.status === 'active' ? 'Suspend account' : 'Reactivate account'}</DialogTitle>
              <DialogDescription>
                {selectedMember.status === 'active'
                  ? `Suspending ${selectedMember.email} ends their active sessions and prevents sign-in.`
                  : `Reactivating ${selectedMember.email} lets them sign in again.`}
              </DialogDescription>
            </DialogHeader>
            {statusMutation.isError && (
              <Alert variant="destructive">{errorMessage(statusMutation.error, 'Could not update mesh_the_30 account.')}</Alert>
            )}
            <DialogFooter>
              <Button variant="outline" disabled={statusMutation.isPending}
                onClick={() => setSelectedMember(null)}>Cancel</Button>
              <Button variant={selectedMember.status === 'active' ? 'destructive' : 'gold'}
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(selectedMember)}>
                {statusMutation.isPending ? 'Updating…' : selectedMember.status === 'active' ? 'Suspend' : 'Reactivate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
