import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 查询会员邀请码
    const { data: membershipCode, error: codeError } = await supabase
      .from('membership_codes')
      .select('id, code, plan_id, is_used, expires_at')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (codeError || !membershipCode) {
      return new Response(
        JSON.stringify({ error: '邀请码不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (membershipCode.is_used) {
      return new Response(
        JSON.stringify({ error: '邀请码已被使用' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (membershipCode.expires_at && new Date(membershipCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: '邀请码已过期' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 查询套餐信息
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, tier, duration_days')
      .eq('id', membershipCode.plan_id)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: '关联套餐不存在' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 计算到期时间
    let expiresAt: string | null = null;
    if (plan.duration_days != null) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + plan.duration_days);
      expiresAt = expiry.toISOString();
    }

    // 检查用户是否已有同等级或更高等级的有效会员
    const { data: existingMemberships } = await supabase
      .from('user_memberships')
      .select('id, tier, expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    // 如果已有创始会员（永久），不允许降级
    const hasFounder = existingMemberships?.some(
      (m: any) => m.tier === 'founder' && m.is_active
    );
    if (hasFounder && plan.tier !== 'founder') {
      return new Response(
        JSON.stringify({ error: '您已是创始会员，无需开通此套餐' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 插入会员记录
    const { data: membership, error: insertError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        tier: plan.tier,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        source: 'invite_code',
        source_code_id: membershipCode.id,
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (insertError || !membership) {
      console.error('创建会员记录失败:', insertError);
      return new Response(
        JSON.stringify({ error: '开通会员失败: ' + (insertError?.message || '未知错误') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 标记邀请码为已使用
    await supabase
      .from('membership_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', membershipCode.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: '会员开通成功',
        tier: plan.tier,
        plan_name: plan.name,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('兑换异常:', error);
    return new Response(
      JSON.stringify({ error: '兑换失败: ' + message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
