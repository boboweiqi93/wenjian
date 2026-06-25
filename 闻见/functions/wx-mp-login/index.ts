import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wxAppId = Deno.env.get('WX_APP_ID');
    const wxAppSecret = Deno.env.get('WX_APP_SECRET');

    if (!wxAppId || !wxAppSecret) {
      return new Response(
        JSON.stringify({ error: 'WX_APP_ID or WX_APP_SECRET not configured. Please configure in Meoo Cloud dashboard.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call WeChat API to exchange code for openid/session_key
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${wxAppId}&secret=${wxAppSecret}&js_code=${code}&grant_type=authorization_code`
    );
    const wxData = await wxRes.json();

    if (wxData.errcode) {
      return new Response(
        JSON.stringify({ error: `WeChat API error: ${wxData.errmsg}`, errcode: wxData.errcode }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { openid, unionid, session_key } = wxData;

    if (!openid) {
      return new Response(
        JSON.stringify({ error: 'Failed to get openid from WeChat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if user with this openid already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('openid', openid)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      // User already exists, sign in
      userId = existingProfile.id;
    } else {
      // Create new user via Supabase Auth
      const virtualEmail = `${openid}@wx.local`;
      const randomPassword = crypto.randomUUID();

      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: virtualEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          provider: 'wechat_miniprogram',
          openid,
          unionid: unionid || null,
        },
      });

      if (signUpError) {
        // User might already exist in auth.users but not in profiles
        // Try to find by email
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.users?.find((u) => u.email === virtualEmail);

        if (existingUser) {
          userId = existingUser.id;
          // Ensure profile exists
          await supabaseAdmin.from('profiles').upsert(
            { id: userId, openid, unionid: unionid || null },
            { onConflict: 'id' }
          );
        } else {
          return new Response(
            JSON.stringify({ error: `Failed to create user: ${signUpError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        userId = signUpData.user!.id;
      }
    }

    // Generate a session for the user using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${openid}@wx.local`,
    });

    if (linkError || !linkData) {
      // Fallback: use signInWithPassword approach
      // Since we created the user with a random password, we need another approach
      // Use the service role to create a custom token
      return new Response(
        JSON.stringify({
          error: 'Failed to generate session',
          detail: linkError?.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the magic link to get tokens
    const tokenHash = new URL(linkData.properties.action_link).searchParams.get('token');
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: tokenHash!,
      type: 'magiclink',
    });

    if (verifyError || !verifyData.session || !verifyData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify session', detail: verifyError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        expires_in: verifyData.session.expires_in,
        user: {
          id: verifyData.user.id,
          openid,
          unionid: unionid || null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
