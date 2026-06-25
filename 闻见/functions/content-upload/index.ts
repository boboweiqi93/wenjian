import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

async function validateApiKey(supabase: any, key: string): Promise<boolean> {
  const { data } = await supabase
    .from('api_keys')
    .select('is_active')
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

async function resolveCourseIdsByNames(supabase: any, names: string[]): Promise<string[]> {
  if (!names || names.length === 0) return [];
  const { data, error } = await supabase
    .from('courses')
    .select('id, title')
    .in('title', names);
  if (error) throw error;
  const foundNames = new Set(data?.map((c: any) => c.title) || []);
  const notFound = names.filter(n => !foundNames.has(n));
  if (notFound.length > 0) {
    throw new Error(`课程不存在: ${notFound.join(', ')}`);
  }
  return data?.map((c: any) => c.id) || [];
}

async function handleArticleUpload(supabase: any, body: any) {
  const courseIds = await resolveCourseIdsByNames(supabase, body.manual_recommended_courses || []);
  const { data, error } = await supabase.from('articles').insert({
    title: body.title,
    content: body.content,
    author: body.author,
    author_id: body.author_id,
    summary: body.summary,
    tags: body.tags,
    cover_url: body.cover_url,
    audio_url: body.audio_url,
    points_required: body.points_required || 0,
    is_published: body.is_published ?? true,
    is_recommended: body.is_recommended ?? false,
    manual_recommended_courses: courseIds
  }).select('id, title, created_at').single();

  if (error) throw error;
  return { success: true, data };
}

async function handleCourseUpload(supabase: any, body: any) {
  const { data: course, error: courseError } = await supabase.from('courses').insert({
    title: body.title,
    short_name: body.short_name,
    description: body.description,
    content: body.content,
    author_name: body.author_name,
    author_id: body.author_id,
    author_bio: body.author_bio,
    cover: body.cover,
    audio_url: body.audio_url,
    category: body.category,
    tags: body.tags,
    points_price: body.points_price || 0,
    purchase_url: body.purchase_url,
    status: body.status || 'updating',
    has_preview: body.has_preview ?? true,
    is_published: body.is_published ?? true,
    is_recommended: body.is_recommended ?? false
  }).select('id').single();

  if (courseError) throw courseError;

  let chapterCount = 0;
  let sectionCount = 0;

  for (const chapter of body.chapters || []) {
    const { data: chapterData, error: chapterError } = await supabase.from('chapters').insert({
      course_id: course.id,
      title: chapter.title,
      sort_order: chapter.sort_order || ++chapterCount,
      is_published: true
    }).select('id').single();

    if (chapterError) throw chapterError;
    chapterCount++;

    for (const section of chapter.sections || []) {
      const { error: sectionError } = await supabase.from('sections').insert({
        chapter_id: chapterData.id,
        title: section.title,
        content: section.content,
        is_preview: section.is_preview ?? false,
        audio_url: section.audio_url,
        sort_order: ++sectionCount
      });

      if (sectionError) throw sectionError;
      sectionCount++;
    }
  }

  return {
    success: true,
    data: {
      id: course.id,
      title: body.title,
      chapter_count: chapterCount,
      section_count: sectionCount
    }
  };
}

async function handleBatchArticles(supabase: any, body: any) {
  const results = [];
  for (const article of body.articles || []) {
    try {
      const result = await handleArticleUpload(supabase, article);
      results.push({ ...result.data, status: 'success' });
    } catch (error: any) {
      results.push({ title: article.title, status: 'failed', error: error.message });
    }
  }
  return {
    success: true,
    data: {
      total: body.articles?.length || 0,
      success: results.filter((r: any) => r.status === 'success').length,
      failed: results.filter((r: any) => r.status === 'failed').length,
      results
    }
  };
}

async function handleBatchCourses(supabase: any, body: any) {
  const results = [];
  for (const course of body.courses || []) {
    try {
      const result = await handleCourseUpload(supabase, course);
      results.push({ ...result.data, status: 'success' });
    } catch (error: any) {
      results.push({ title: course.title, status: 'failed', error: error.message });
    }
  }
  return {
    success: true,
    data: {
      total: body.courses?.length || 0,
      success: results.filter((r: any) => r.status === 'success').length,
      failed: results.filter((r: any) => r.status === 'failed').length,
      results
    }
  };
}

async function handleGetTags(supabase: any, query: URLSearchParams) {
  const level = query.get('level');
  const parentId = query.get('parent_id');

  let queryBuilder = supabase.from('tags').select('id, name, parent_id').order('name');

  if (level === '1') {
    queryBuilder = queryBuilder.is('parent_id', null);
  } else if (level === '2') {
    queryBuilder = queryBuilder.not('parent_id', 'is', null);
  } else if (parentId) {
    queryBuilder = queryBuilder.eq('parent_id', parentId);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;
  return { success: true, data };
}

async function handleCreateTag(supabase: any, body: any) {
  const { data, error } = await supabase.from('tags').insert({
    name: body.name,
    parent_id: body.parent_id || null
  }).select('id, name, parent_id').single();
  if (error) throw error;
  return { success: true, data };
}

async function handleUpdateTag(supabase: any, body: any) {
  const { data, error } = await supabase.from('tags')
    .update({
      name: body.name,
      parent_id: body.parentid || body.parent_id || null
    })
    .eq('id', body.id)
    .select('id, name, parent_id')
    .single();
  if (error) throw error;
  return { success: true, data };
}

async function handleGetAuthors(supabase: any) {
  const { data, error } = await supabase.from('authors').select('id, name, bio').order('name');
  if (error) throw error;
  return { success: true, data };
}

async function handleUpdateArticle(supabase: any, body: any) {
  const courseIds = await resolveCourseIdsByNames(supabase, body.manual_recommended_courses || []);
  const { data, error } = await supabase.from('articles')
    .update({
      title: body.title,
      content: body.content,
      author: body.author,
      author_id: body.author_id,
      summary: body.summary,
      tags: body.tags,
      cover_url: body.cover_url,
      audio_url: body.audio_url,
      points_required: body.points_required,
      is_published: body.is_published,
      is_recommended: body.is_recommended,
      manual_recommended_courses: courseIds,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.id)
    .select('id, title, updated_at')
    .single();
  if (error) throw error;
  return { success: true, data };
}

async function handleDeleteArticle(supabase: any, body: any) {
  const { error } = await supabase.from('articles').delete().eq('id', body.id);
  if (error) throw error;
  return { success: true, message: '文章已删除' };
}

async function handleDeleteCourse(supabase: any, body: any) {
  const { error } = await supabase.from('courses').delete().eq('id', body.id);
  if (error) throw error;
  return { success: true, message: '课程已删除' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');

    console.log('Request URL:', req.url);
    console.log('Pathname:', pathname);
    console.log('Method:', req.method);

    if (!apiKey || !await validateApiKey(supabase, apiKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const queryType = url.searchParams.get('type');
    let result;

    if (queryType === 'articles' && req.method === 'POST') {
      const body = await req.json();
      result = await handleArticleUpload(supabase, body);
    } else if (queryType === 'courses' && req.method === 'POST') {
      const body = await req.json();
      result = await handleCourseUpload(supabase, body);
    } else if (queryType === 'articles-batch' && req.method === 'POST') {
      const body = await req.json();
      result = await handleBatchArticles(supabase, body);
    } else if (queryType === 'courses-batch' && req.method === 'POST') {
      const body = await req.json();
      result = await handleBatchCourses(supabase, body);
    } else if (queryType === 'tags' && req.method === 'GET') {
      result = await handleGetTags(supabase, url.searchParams);
    } else if (queryType === 'tags' && req.method === 'POST') {
      const body = await req.json();
      result = await handleCreateTag(supabase, body);
    } else if (queryType === 'tags' && req.method === 'PUT') {
      const body = await req.json();
      result = await handleUpdateTag(supabase, body);
    } else if (queryType === 'authors' && req.method === 'GET') {
      result = await handleGetAuthors(supabase);
    } else if (queryType === 'articles' && req.method === 'PUT') {
      const body = await req.json();
      result = await handleUpdateArticle(supabase, body);
    } else if (queryType === 'articles' && req.method === 'DELETE') {
      const body = await req.json();
      result = await handleDeleteArticle(supabase, body);
    } else if (queryType === 'courses' && req.method === 'DELETE') {
      const body = await req.json();
      result = await handleDeleteCourse(supabase, body);
    } else {
      return new Response(JSON.stringify({ error: 'Not Found', pathname, queryType }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
