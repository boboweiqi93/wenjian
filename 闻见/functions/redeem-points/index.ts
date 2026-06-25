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

    // 查询邀请码（显式选择 course_ids 字段）
    const { data: invitation, error: inviteError } = await supabase
      .from('invitation_codes')
      .select('id, code, course_id, course_ids, is_used, used_by, expires_at')
      .eq('code', code.toUpperCase())
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: '邀请码不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查是否已使用
    if (invitation.is_used) {
      return new Response(
        JSON.stringify({ error: '邀请码已被使用' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查是否过期
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: '邀请码已过期' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取课程ID列表（优先使用 course_ids 数组）
    let courseIds: string[] = [];
    if (invitation.course_ids && Array.isArray(invitation.course_ids) && invitation.course_ids.length > 0) {
      courseIds = invitation.course_ids.filter((id: any) => id && typeof id === 'string');
    } else if (invitation.course_id) {
      courseIds = [invitation.course_id];
    }

    if (courseIds.length === 0) {
      return new Response(
        JSON.stringify({ error: '邀请码未关联任何课程' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查用户是否已存在这些课程（避免重复开通）
    const { data: existingCourses } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', userId)
      .in('course_id', courseIds);
    
    const existingCourseIds = new Set(existingCourses?.map((c: any) => c.course_id) || []);
    const newCourseIds = courseIds.filter(id => !existingCourseIds.has(id));
    const skippedCourseIds = courseIds.filter(id => existingCourseIds.has(id));

    // 开通新课程
    if (newCourseIds.length > 0) {
      const userCoursesData = newCourseIds.map((courseId: string) => ({
        user_id: userId,
        course_id: courseId,
        points_spent: 0,
        created_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('user_courses')
        .insert(userCoursesData);

      if (insertError) {
        console.error('开通课程失败:', insertError);
        return new Response(
          JSON.stringify({ error: '开通课程失败: ' + insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 更新邀请码状态（标记为已使用）
    const { error: updateError } = await supabase
      .from('invitation_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('更新邀请码状态失败:', updateError);
    }

    // 获取开通的课程信息
    const { data: coursesData } = await supabase
      .from('courses')
      .select('title')
      .in('id', courseIds);

    return new Response(
      JSON.stringify({
        success: true,
        message: '课程开通成功',
        courses_count: courseIds.length,
        new_courses_count: newCourseIds.length,
        skipped_courses_count: skippedCourseIds.length,
        courses: coursesData?.map((c: { title: string }) => c.title) || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('兑换异常:', error);
    return new Response(
      JSON.stringify({ error: '兑换失败: ' + (error.message || '未知错误') }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
