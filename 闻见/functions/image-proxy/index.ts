// 图片代理服务 - 解决沙盒环境跨域限制
// 通过 Edge Function 代理外部图片请求

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    // 验证 URL 是否允许
    const allowedDomains = [
      'pub-f16297951496430387b3905998167966.r2.dev',
      'r2.dev',
    ];
    
    const targetUrl = new URL(imageUrl);
    const isAllowed = allowedDomains.some(domain => 
      targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return new Response('Domain not allowed', { status: 403 });
    }

    // 获取图片
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*,*/*',
      },
    });

    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status });
    }

    // 获取图片数据
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // 返回图片，添加 CORS 头
    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400', // 缓存1天
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
