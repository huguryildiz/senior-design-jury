import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CallerAdminContext {
  userId: string;
  email: string | null;
  isSuperAdmin: boolean;
}

type RequireAdminResult =
  | { ok: true; context: CallerAdminContext }
  | { ok: false; status: number; error: string };

function getTokenFromRequest(req: Request): string {
  const authHeader = req.headers.get("authorization") || "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

async function isSuperAdmin(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await service
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .is("organization_id", null)
    .eq("role", "super_admin")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data?.user_id);
}

async function hasOrgAdminMembership(
  service: SupabaseClient,
  userId: string,
  organizationId: string | null,
): Promise<boolean> {
  let query = service
    .from("memberships")
    .select("user_id")
    .eq("user_id", userId)
    .in("role", ["org_admin", "super_admin"])
    .limit(1);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.user_id);
}

/**
 * Validates bearer token via Auth-v1 and checks admin permissions via memberships.
 *
 * - If `organizationId` is provided: caller must be super_admin OR org_admin for that organization.
 * - If `organizationId` is absent: caller must be any org_admin/super_admin membership.
 */
export async function requireAdminCaller(
  req: Request,
  organizationId?: string | null,
): Promise<RequireAdminResult> {
  const token = getTokenFromRequest(req);
  if (!token) return { ok: false, status: 401, error: "Missing bearer token" };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, status: 500, error: "Supabase environment is not configured." };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  const userId = userData?.user?.id || null;
  if (userErr || !userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const superAdmin = await isSuperAdmin(service, userId);
    if (superAdmin) {
      return {
        ok: true,
        context: {
          userId,
          email: userData.user.email || null,
          isSuperAdmin: true,
        },
      };
    }

    const allowed = await hasOrgAdminMembership(service, userId, organizationId || null);
    if (!allowed) return { ok: false, status: 403, error: "admin access required" };

    return {
      ok: true,
      context: {
        userId,
        email: userData.user.email || null,
        isSuperAdmin: false,
      },
    };
  } catch (e) {
    return { ok: false, status: 500, error: (e as Error).message };
  }
}
