# Content Upload API 文档

## 基础信息

- **基础 URL**: `https://wenjian.meoo.fun/sb-api/functions/v1/content-upload`
- **认证方式**: Header `x-api-key`
- **API Key**: `pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb`

## 端点列表

所有端点通过 `type` 查询参数区分：

| 端点 | 方法 | type 参数 | 说明 |
|------|------|-----------|------|
| 创建文章 | POST | `articles` | 创建单篇文章 |
| 创建课程 | POST | `courses` | 创建单个课程 |
| 批量创建文章 | POST | `articles-batch` | 批量创建多篇文章 |
| 批量创建课程 | POST | `courses-batch` | 批量创建多个课程 |
| 获取标签列表 | GET | `tags` | 获取所有标签 |
| 获取作者列表 | GET | `authors` | 获取所有作者 |

---

## 1. 创建文章

**POST** `?type=articles`

### 请求体
```json
{
  "title": "文章标题",
  "content": "文章内容（Markdown格式）",
  "author_id": "作者UUID",
  "author": "作者名称",
  "summary": "文章摘要",
  "tags": ["标签1", "标签2"],
  "cover_url": "封面图片URL",
  "audio_url": "音频URL",
  "points_required": 0,
  "is_published": true,
  "is_recommended": false,
  "manual_recommended_courses": ["课程UUID1", "课程UUID2"]
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "文章UUID",
    "title": "文章标题",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 2. 创建课程

**POST** `?type=courses`

### 请求体
```json
{
  "title": "课程标题",
  "short_name": "短名称",
  "description": "课程描述",
  "content": "课程内容（Markdown）",
  "author_name": "作者名",
  "author_id": "作者UUID",
  "author_bio": "作者简介",
  "cover": "封面URL",
  "audio_url": "音频URL",
  "category": "分类",
  "tags": ["标签1", "标签2"],
  "points_price": 100,
  "purchase_url": "购买链接",
  "status": "updating",
  "has_preview": true,
  "is_published": true,
  "is_recommended": false,
  "chapters": [
    {
      "title": "章节标题",
      "sort_order": 1,
      "sections": [
        {
          "title": "小节标题",
          "content": "内容",
          "is_preview": true,
          "audio_url": "音频URL",
          "sort_order": 1
        }
      ]
    }
  ]
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "课程UUID",
    "title": "课程标题",
    "chapter_count": 5,
    "section_count": 20
  }
}
```

---

## 3. 批量创建文章

**POST** `?type=articles-batch`

### 请求体
```json
{
  "articles": [
    { "title": "文章1", "content": "内容1", "author_id": "作者UUID" },
    { "title": "文章2", "content": "内容2", "author_id": "作者UUID" }
  ]
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "total": 2,
    "success": 2,
    "failed": 0,
    "results": [
      { "id": "UUID", "title": "文章1", "status": "success" },
      { "id": "UUID", "title": "文章2", "status": "success" }
    ]
  }
}
```

---

## 4. 批量创建课程

**POST** `?type=courses-batch`

### 请求体
```json
{
  "courses": [
    { "title": "课程1", "description": "描述1", "author_id": "作者UUID" },
    { "title": "课程2", "description": "描述2", "author_id": "作者UUID" }
  ]
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "total": 2,
    "success": 2,
    "failed": 0,
    "results": [
      { "id": "UUID", "title": "课程1", "status": "success" },
      { "id": "UUID", "title": "课程2", "status": "success" }
    ]
  }
}
```

---

## 5. 获取标签列表

**GET** `?type=tags`

### 响应
```json
{
  "success": true,
  "data": [
    { "id": "UUID", "name": "标签名" }
  ]
}
```

---

## 6. 获取作者列表

**GET** `?type=authors`

### 响应
```json
{
  "success": true,
  "data": [
    { "id": "UUID", "name": "作者名", "bio": "作者简介" }
  ]
}
```

---

## 错误响应

**401 Unauthorized**:
```json
{ "error": "Unauthorized" }
```

**404 Not Found**:
```json
{ "error": "Not Found" }
```

**500 Internal Server Error**:
```json
{ "error": "错误信息" }
```

---

## 完整调用示例

```bash
# 创建文章
curl -X POST \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=articles" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文章",
    "content": "文章内容",
    "author_id": "作者UUID"
  }'

# 获取标签列表
curl -X GET \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb"
```
