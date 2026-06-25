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
    const { userId, planId } = await req.json();

    if (!userId || !planId) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 查询套餐信息
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, tier, points_price, duration_days, is_active')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: '套餐不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan.is_active) {
      return new Response(
        JSON.stringify({ error: '该套餐已下架' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 查询用户积分
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, points')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPoints = user.points || 0;
    if (userPoints < plan.points_price) {
      return new Response(
        JSON.stringify({
          error: '积分不足',
          required: plan.points_price,
          current: userPoints,
        }),
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

    // 扣除积分
    const { error: deductError } = await supabase
      .from('users')
      .update({ points: userPoints - plan.points_price })
      .eq('id', userId);

    if (deductError) {
      console.error('扣除积分失败:', deductError);
      return new Response(
        JSON.stringify({ error: '扣除积分失败: ' + deductError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        source: 'purchase',
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (insertError || !membership) {
      // 回滚积分
      await supabase
        .from('users')
        .update({ points: userPoints })
        .eq('id', userId);

      console.error('创建会员记录失败:', insertError);
      return new Response(
        JSON.stringify({ error: '开通会员失败: ' + (insertError?.message || '未知错误') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '会员开通成功',
        tier: plan.tier,
        plan_name: plan.name,
        points_spent: plan.points_price,
        remaining_points: userPoints - plan.points_price,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('购买异常:', error);
    return new Response(
      JSON.stringify({ error: '购买失败: ' + message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
