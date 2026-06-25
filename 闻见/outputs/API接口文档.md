# 闻见平台 Edge Function API 接口文档

> 更新日期：2026-06-10
> Base URL：`{SUPABASE_URL}/functions/v1/`

---

## 认证方式

### Session Token 认证（用户端接口）

适用于 `redeem-membership`、`purchase-membership`、`redeem-points` 三个用户端接口。

**Token 生成规则：**
```
payload = { userId: string, expiresAt: number }  // expiresAt 为毫秒时间戳
token = base64(JSON.stringify(payload))
Header: Authorization: Bearer {token}
```

**前端工具函数：**
```typescript
import { getAuthHeaders } from '../contexts/AuthContext';
// 返回 { 'Content-Type': 'application/json', 'Authorization': 'Bearer xxx' }
```

**服务端验证流程：**
1. 解析 Authorization header 中的 Bearer token
2. Base64 解码获取 `{ userId, expiresAt }`
3. 检查 `expiresAt > Date.now()`
4. 查询数据库确认用户存在

### API Key 认证（管理端接口）

适用于 `content-upload` 管理接口。

```
Header: X-API-Key: {api_key}
```

API Key 存储在 `api_keys` 表中，需 `is_active = true`。

### 无认证（公开接口）

适用于 `image-proxy`、`wx-mp-login`。

---

## 接口列表

| 接口 | 方法 | 认证方式 | 说明 |
|------|------|---------|------|
| redeem-membership | POST | Session Token | 会员邀请码兑换 |
| purchase-membership | POST | Session Token | 积分购买会员 |
| redeem-points | POST | Session Token | 课程邀请码兑换 |
| content-upload | GET/POST/PUT/DELETE | API Key | 内容管理（文章/课程/标签/作者） |
| image-proxy | GET | 无 | 图片代理（域名白名单） |
| wx-mp-login | POST | 无 | 微信小程序登录 |

---

## 1. redeem-membership — 会员邀请码兑换

**POST** `/functions/v1/redeem-membership`

使用会员邀请码为用户开通会员权益。

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | `Bearer {session_token}` |
| Content-Type | 是 | `application/json` |

### 请求体

```json
{
  "code": "ABCD1234"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 会员邀请码（自动转大写） |

### 成功响应 `200`

```json
{
  "success": true,
  "message": "会员开通成功",
  "tier": "yearly",
  "plan_name": "年卡会员",
  "expires_at": "2027-06-07T10:00:00.000Z"
}
```

### 错误响应

| Status | error | 说明 |
|--------|-------|------|
| 400 | 缺少必要参数 | code 为空 |
| 400 | 邀请码已被使用 | 该码已兑换过 |
| 400 | 邀请码已过期 | 超过 expires_at |
| 400 | 关联套餐不存在 | plan_id 无效 |
| 400 | 您已是创始会员，无需开通此套餐 | 已有更高等级会员 |
| 401 | 缺少认证信息 | 未传 Authorization |
| 401 | 认证已过期 | session 过期 |
| 401 | 用户不存在 | userId 无效 |
| 404 | 邀请码不存在 | code 查不到 |
| 500 | 开通会员失败 | 数据库写入异常 |

---

## 2. purchase-membership — 积分购买会员

**POST** `/functions/v1/purchase-membership`

使用用户积分购买会员套餐。

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | `Bearer {session_token}` |
| Content-Type | 是 | `application/json` |

### 请求体

```json
{
  "planId": "9d9be9c3-9939-473b-bdfe-10cb2d1d821c"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| planId | string | 是 | membership_plans 表 ID |

### 成功响应 `200`

```json
{
  "success": true,
  "message": "会员开通成功",
  "tier": "yearly",
  "plan_name": "年卡会员",
  "points_spent": 980,
  "remaining_points": 20,
  "expires_at": "2027-06-07T10:00:00.000Z"
}
```

### 错误响应

| Status | error | 说明 |
|--------|-------|------|
| 400 | 缺少必要参数 | planId 为空 |
| 400 | 该套餐已下架 | is_active = false |
| 400 | 积分不足 | 附带 required / current 字段 |
| 401 | 缺少认证信息 / 认证已过期 / 用户不存在 | 同 redeem-membership |
| 404 | 套餐不存在 | planId 查不到 |
| 500 | 扣除积分失败 / 开通会员失败 | 数据库异常（积分会自动回滚） |

---

## 3. redeem-points — 课程邀请码兑换

**POST** `/functions/v1/redeem-points`

使用课程邀请码为用户开通课程权限。支持单课程和多课程邀请码。

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| Authorization | 是 | `Bearer {session_token}` |
| Content-Type | 是 | `application/json` |

### 请求体

```json
{
  "code": "XYZW5678"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 课程邀请码（自动转大写） |

### 成功响应 `200`

```json
{
  "success": true,
  "message": "课程开通成功",
  "courses_count": 3,
  "new_courses_count": 2,
  "skipped_courses_count": 1,
  "courses": ["课程A", "课程B", "课程C"]
}
```

### 错误响应

| Status | error | 说明 |
|--------|-------|------|
| 400 | 缺少必要参数 | code 为空 |
| 400 | 邀请码已被使用 | is_used = true |
| 400 | 邀请码已过期 | 超过 expires_at |
| 400 | 邀请码未关联任何课程 | course_ids 和 course_id 均为空 |
| 401 | 缺少认证信息 / 认证已过期 / 用户不存在 | 同上 |
| 404 | 邀请码不存在 | code 查不到 |
| 500 | 开通课程失败 | 数据库写入异常 |

---

## 4. content-upload — 内容管理接口

**Base:** `/functions/v1/content-upload`

通过 `?type=` 参数区分操作类型，所有请求需携带 API Key。

### 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| X-API-Key | 是 | 有效的 API Key |
| Content-Type | 是（POST/PUT/DELETE） | `application/json` |

### 4.1 上传文章

**POST** `?type=articles`

```json
{
  "title": "文章标题",
  "content": "Markdown 内容",
  "author": "作者名",
  "author_id": "uuid",
  "summary": "摘要",
  "tags": ["tag1", "tag2"],
  "cover_url": "https://...",
  "audio_url": "https://...",
  "points_required": 0,
  "is_published": true,
  "is_recommended": false,
  "manual_recommended_courses": ["课程名称A"]
}
```

### 4.2 上传课程（含章节和小节）

**POST** `?type=courses`

```json
{
  "title": "课程标题",
  "short_name": "简称",
  "description": "描述",
  "content": "课程内容",
  "author_name": "作者",
  "author_id": "uuid",
  "category": "分类",
  "tags": ["tag1"],
  "points_price": 100,
  "status": "updating",
  "is_published": true,
  "chapters": [
    {
      "title": "第一章",
      "sort_order": 1,
      "sections": [
        { "title": "1.1 概述", "content": "...", "is_preview": true }
      ]
    }
  ]
}
```

### 4.3 批量上传

- **POST** `?type=articles-batch` — body: `{ articles: [...] }`
- **POST** `?type=courses-batch` — body: `{ courses: [...] }`

### 4.4 标签管理

- **GET** `?type=tags&level=1` — 获取一级标签
- **GET** `?type=tags&parent_id={id}` — 获取子标签
- **POST** `?type=tags` — 创建标签 `{ name, parent_id? }`
- **PUT** `?type=tags` — 更新标签 `{ id, name, parent_id? }`

### 4.5 作者管理

- **GET** `?type=authors` — 获取所有作者

### 4.6 查询列表

- **GET** `?type=articles` — 获取所有文章列表（返回 `id, title, cover_url, audio_url`）
- **GET** `?type=courses` — 获取所有课程列表（含嵌套 chapters → sections，每级包含 `audio_url`）

#### GET articles 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "文章标题",
      "cover_url": "https://...",
      "audio_url": "https://..."
    }
  ]
}
```

#### GET courses 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "课程标题",
      "cover_url": "https://...",
      "audio_url": "https://...",
      "chapters": [
        {
          "id": "uuid",
          "title": "第一章",
          "sort_order": 1,
          "sections": [
            {
              "id": "uuid",
              "title": "1.1 概述",
              "audio_url": "https://...",
              "sort_order": 1
            }
          ]
        }
      ]
    }
  ]
}
```

### 4.7 更新（部分更新）

所有 PUT 接口均支持**部分更新**：只需传入要修改的字段 + `id`，未传字段不会被清空。

- **PUT** `?type=articles` — 部分更新文章

```json
{
  "id": "uuid",
  "cover_url": "https://new-cdn.example.com/img.png",
  "audio_url": "https://new-cdn.example.com/audio.wav"
}
```

- **PUT** `?type=courses` — 部分更新课程（支持嵌套章节/小节更新）

```json
{
  "id": "uuid",
  "cover_url": "https://new-cdn.example.com/cover.png",
  "chapters": [
    {
      "id": "chapter-uuid",
      "sections": [
        {
          "id": "section-uuid",
          "audio_url": "https://new-cdn.example.com/audio.wav"
        }
      ]
    }
  ]
}
```

> 课程更新响应：`{ success: true, data: { id, updated_sections: N } }`

- **PUT** `?type=tags` — 更新标签 `{ id, name, parent_id? }`

### 4.8 删除

- **DELETE** `?type=articles` — 删除文章 `{ id }`
- **DELETE** `?type=courses` — 删除课程 `{ id }`

### 错误响应

| Status | error | 说明 |
|--------|-------|------|
| 401 | Unauthorized | API Key 无效或未提供 |
| 404 | Not Found | type 或 method 不匹配 |
| 500 | 具体错误信息 | 数据库操作异常 |

---

## 5. image-proxy — 图片代理

**GET** `/functions/v1/image-proxy?url={encoded_image_url}`

代理外部图片请求，解决跨域问题。

### 查询参数

| 参数 | 必填 | 说明 |
|------|------|------|
| url | 是 | 目标图片 URL（需 URL encode） |

### 安全限制

仅允许以下域名：
- `pub-f16297951496430387b3905998167966.r2.dev`
- `*.r2.dev`
- 环境变量 `QINIU_CDN_DOMAINS` 中配置的七牛云 CDN 域名（多个用逗号分隔）

> 部署后需通过 `meoo-cli cloud set-secret --name QINIU_CDN_DOMAINS` 配置七牛 CDN 域名。

### 响应

- **200** — 返回图片二进制数据，Content-Type 与源一致，缓存 24 小时
- **400** — Missing url parameter
- **403** — Domain not allowed
- **500** — Internal server error

---

## 6. wx-mp-login — 微信小程序登录

**POST** `/functions/v1/wx-mp-login`

通过微信 js_code 换取平台 session。

### 请求体

```json
{
  "code": "微信 wx.login() 返回的 js_code"
}
```

### 成功响应 `200`

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "openid": "wx_openid",
    "unionid": "wx_unionid"
  }
}
```

### 环境变量依赖

| 变量 | 说明 |
|------|------|
| WX_APP_ID | 微信小程序 AppID |
| WX_APP_SECRET | 微信小程序 AppSecret |

### 错误响应

| Status | error | 说明 |
|--------|-------|------|
| 400 | Missing required field: code | 未传 code |
| 400 | WeChat API error: ... | 微信接口返回错误 |
| 400 | Failed to get openid | 微信未返回 openid |
| 500 | WX_APP_ID or WX_APP_SECRET not configured | 环境变量缺失 |
| 500 | Failed to create user / generate session / verify session | 内部异常 |

---

## 附录：当前会员套餐价格

| 套餐 | tier | 价格（元） | 积分价 | 有效期 |
|------|------|-----------|--------|--------|
| 年卡会员 | yearly | 980 | 980 迹 | 365 天 |
| 创始会员 | founder | 2980 | 2980 迹 | 永久 |
