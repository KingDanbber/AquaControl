/* =========================
   SUPABASE CLIENT
========================= */

const SUPABASE_URL = "https://unkfacqdebcshldhcutz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_50inErOUj8IYqNSoIuan9A_lPlYwaKG";

export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =========================
   AUTH HELPERS
========================= */

export async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Error obteniendo usuario:", error.message);
    return null;
  }

  return data.user;
}

export async function getCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Error obteniendo sesión:", error.message);
    return null;
  }

  return data.session;
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("Error cerrando sesión:", error.message);
    throw error;
  }

  return true;
}

/* =========================
   PROFILE HELPERS
========================= */

export async function getMyProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error obteniendo perfil:", error.message);
    return null;
  }

  return data;
}

export async function updateMyProfile({ full_name, whatsapp, active_business_id }) {
  const user = await getCurrentUser();

  if (!user) throw new Error("No hay usuario logeado.");

  const payload = {
    full_name,
    whatsapp,
    active_business_id,
  };

  const { data, error } = await supabaseClient
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* =========================
   BUSINESS HELPERS
========================= */

export async function getMyBusinesses() {
  const user = await getCurrentUser();

  if (!user) return [];

  const { data, error } = await supabaseClient
    .from("business_members")
    .select(`
      id,
      role,
      business_id,
      businesses (
        id,
        name,
        is_active,
        created_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error obteniendo negocios:", error.message);
    return [];
  }

  return data || [];
}