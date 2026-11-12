import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getServiceKey(): string {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (direct) return direct;
  const rawSecretMap = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (rawSecretMap) {
    try {
      const parsed = JSON.parse(rawSecretMap) as Record<string, string>;
      if (parsed.default) return parsed.default;
      const first = Object.values(parsed)[0];
      if (first) return first;
    } catch {
      // ignore malformed JSON
    }
  }
  throw new Error('Missing Supabase service role key in Edge Function environment.');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      return jsonResponse({ error: 'Missing SUPABASE_URL' }, 500);
    }

    const adminClient = createClient(supabaseUrl, getServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const payload = (await req.json()) as Record<string, unknown>;
    const action = typeof payload.action === 'string' ? payload.action : '';

    if (action === 'register_admin') {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
      const password = typeof payload.password === 'string' ? payload.password : '';

      if (!name || !email || !password) {
        return jsonResponse({ error: 'Nama, email, dan kata sandi wajib diisi.' }, 400);
      }
      if (password.length < 6) {
        return jsonResponse({ error: 'Kata sandi minimal 6 karakter.' }, 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { role: 'admin' },
      });

      if (createError || !created.user) {
        const msg = createError?.message || 'Gagal membuat akun administrator.';
        const lower = msg.toLowerCase();
        if (lower.includes('already') || lower.includes('exists') || lower.includes('registered')) {
          return jsonResponse({ error: 'Email sudah terdaftar. Silakan gunakan menu Masuk.' }, 409);
        }
        return jsonResponse({ error: msg }, 400);
      }

      const userId = created.user.id;
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { name },
        app_metadata: { role: 'admin', owner_id: userId },
      });

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }

      return jsonResponse({
        user: {
          id: userId,
          email,
          name,
          role: 'admin',
          ownerId: userId,
        },
      });
    }

    // All remaining actions require a valid Admin bearer token
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return jsonResponse({ error: 'Sesi otorisasi tidak ditemukan.' }, 401);
    }

    const {
      data: { user: caller },
      error: callerError,
    } = await adminClient.auth.getUser(token);

    if (callerError || !caller) {
      return jsonResponse({ error: 'Token sesi tidak valid atau sudah kedaluwarsa.' }, 401);
    }

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== 'admin') {
      return jsonResponse({ error: 'Hanya Administrator yang berwenang mengelola akun kasir.' }, 403);
    }

    const ownerId = caller.id;

    if (action === 'create_cashier') {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
      const password = typeof payload.password === 'string' ? payload.password : '';

      if (!name || !email || !password) {
        return jsonResponse({ error: 'Nama, email, dan kata sandi kasir wajib diisi.' }, 400);
      }
      if (password.length < 6) {
        return jsonResponse({ error: 'Kata sandi kasir minimal 6 karakter.' }, 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { role: 'user', owner_id: ownerId },
      });

      if (createError || !created.user) {
        const msg = createError?.message || 'Gagal membuat akun kasir.';
        const lower = msg.toLowerCase();
        if (lower.includes('already') || lower.includes('exists') || lower.includes('registered')) {
          return jsonResponse({ error: 'Email kasir sudah digunakan di sistem.' }, 409);
        }
        return jsonResponse({ error: msg }, 400);
      }

      const cashierId = created.user.id;
      const { data: inserted, error: insertError } = await adminClient
        .from('store_cashiers')
        .insert({
          id: cashierId,
          owner_id: ownerId,
          email,
          name,
          is_active: true,
        })
        .select('id, owner_id, email, name, is_active, created_at')
        .single();

      if (insertError || !inserted) {
        await adminClient.auth.admin.deleteUser(cashierId);
        return jsonResponse(
          { error: insertError?.message || 'Gagal menyimpan profil kasir ke database.' },
          500
        );
      }

      return jsonResponse({
        cashier: {
          id: inserted.id,
          ownerId: inserted.owner_id,
          email: inserted.email,
          name: inserted.name,
          isActive: inserted.is_active,
          createdAt: inserted.created_at,
        },
      });
    }

    if (action === 'toggle_cashier') {
      const cashierId = typeof payload.cashierId === 'string' ? payload.cashierId.trim() : '';
      const isActive = Boolean(payload.isActive);
      if (!cashierId) {
        return jsonResponse({ error: 'ID kasir wajib disertakan.' }, 400);
      }

      const { data: target, error: findErr } = await adminClient
        .from('store_cashiers')
        .select('id, owner_id')
        .eq('id', cashierId)
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (findErr || !target) {
        return jsonResponse({ error: 'Akun kasir tidak ditemukan pada toko Anda.' }, 404);
      }

      const { error: banErr } = await adminClient.auth.admin.updateUserById(cashierId, {
        ban_duration: isActive ? 'none' : '876000h',
      });
      if (banErr) {
        return jsonResponse({ error: banErr.message }, 500);
      }

      const { error: updErr } = await adminClient
        .from('store_cashiers')
        .update({ is_active: isActive })
        .eq('id', cashierId)
        .eq('owner_id', ownerId);

      if (updErr) {
        return jsonResponse({ error: updErr.message }, 500);
      }

      return jsonResponse({ success: true, isActive });
    }

    if (action === 'update_cashier') {
      const cashierId = typeof payload.cashierId === 'string' ? payload.cashierId.trim() : '';
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      const password = typeof payload.password === 'string' ? payload.password : '';
      if (!cashierId) {
        return jsonResponse({ error: 'ID kasir wajib disertakan.' }, 400);
      }
      if (!name && !password) {
        return jsonResponse({ error: 'Isi nama baru atau kata sandi baru.' }, 400);
      }
      if (password && password.length < 6) {
        return jsonResponse({ error: 'Kata sandi baru minimal 6 karakter.' }, 400);
      }

      const { data: target, error: findErr } = await adminClient
        .from('store_cashiers')
        .select('id, owner_id')
        .eq('id', cashierId)
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (findErr || !target) {
        return jsonResponse({ error: 'Akun kasir tidak ditemukan pada toko Anda.' }, 404);
      }

      const authPatch: Record<string, unknown> = {};
      if (password) authPatch.password = password;
      if (name) authPatch.user_metadata = { name };

      const { error: authUpdErr } = await adminClient.auth.admin.updateUserById(
        cashierId,
        authPatch
      );
      if (authUpdErr) {
        return jsonResponse({ error: authUpdErr.message }, 500);
      }

      if (name) {
        const { error: dbUpdErr } = await adminClient
          .from('store_cashiers')
          .update({ name })
          .eq('id', cashierId)
          .eq('owner_id', ownerId);
        if (dbUpdErr) {
          return jsonResponse({ error: dbUpdErr.message }, 500);
        }
      }

      return jsonResponse({ success: true });
    }

    if (action === 'delete_cashier') {
      const cashierId = typeof payload.cashierId === 'string' ? payload.cashierId.trim() : '';
      if (!cashierId) {
        return jsonResponse({ error: 'ID kasir wajib disertakan.' }, 400);
      }

      const { data: target, error: findErr } = await adminClient
        .from('store_cashiers')
        .select('id, owner_id')
        .eq('id', cashierId)
        .eq('owner_id', ownerId)
        .maybeSingle();

      if (findErr || !target) {
        return jsonResponse({ error: 'Akun kasir tidak ditemukan pada toko Anda.' }, 404);
      }

      const { error: delErr } = await adminClient.auth.admin.deleteUser(cashierId);
      if (delErr) {
        return jsonResponse({ error: delErr.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Aksi tidak dikenal.' }, 400);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan internal pada server.' },
      500
    );
  }
});
