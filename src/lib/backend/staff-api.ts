import { apiFetch } from "@/lib/api/client";

export type StaffInviteResponse = {
  supabaseUserId: string;
};

export async function inviteStaffMember(data: {
  email: string;
  displayName: string;
  role: string;
  kitchenRole?: string;
  password?: string;
}): Promise<StaffInviteResponse> {
  return apiFetch<StaffInviteResponse>("/api/admin/staff/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export type UserSearchResult = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

export async function searchUsers(q: string): Promise<{ users: UserSearchResult[] }> {
  return apiFetch<{ users: UserSearchResult[] }>(
    `/api/admin/users/search?q=${encodeURIComponent(q)}`,
  );
}
