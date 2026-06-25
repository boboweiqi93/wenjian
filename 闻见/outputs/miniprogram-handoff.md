# 磐磐私教学院 - 网站-小程序对接文档

## 1. API 基础信息

- **API 根地址**: `https://YOUR_APP_DOMAIN.com/sb-api`（⚠️ 需替换为实际 Meoo Cloud 访问域名）
- **接口版本前缀**: `/functions/v1`（Edge Functions）+ Supabase REST API（`/rest/v1`）
- **认证方式**: Bearer Token（Supabase JWT）
- **Token 获取方式**: 
  - 微信登录：调用 `POST /functions/v1/wx-mp-login` 返回 access_token
  - 账号密码登录：调用 Supabase Auth `signInWithPassword` 返回 session
- **Anon Key**（公开密钥，用于匿名请求和 apikey header）:
  ```
  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2NjUyNjQ1LCJleHAiOjEzMjg3MjkyNjQ1fQ.-pfX-MBmKf62jnDjxGFhjwbsMjOuDQGGfn8VYGmcQoc
  ```

> **架构说明**：本项目后端基于 Meoo Cloud（Supabase），不是传统 REST API。数据查询通过 Supabase JS SDK 直接操作数据库（RLS 控制权限），自定义逻辑通过 Edge Functions 实现。小程序端推荐使用 `@supabase/supabase-js` SDK。

---

## 2. 用户体系对接

### 2.1 微信一键登录（主要方式）

- **URL**: `POST /functions/v1/wx-mp-login`
- **JWT 验证**: ❌ 关闭（登录前无 token）
- **请求参数**:
  ```json
  {
    "code": "wx.login() 返回的临时登录凭证"
  }
  ```
- **响应结构（成功 200）**:
  ```json
  {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "openid": "oXXXX",
      "unionid": "oYYYY"
    }
  }
  ```
- **响应结构（失败 400/500）**:
  ```json
  {
    "error": "错误描述",
    "errcode": 40029
  }
  ```
- **登录后处理**: 用返回的 `access_token` + `refresh_token` 调用 `supabase.auth.setSession()` 建立会话

### 2.2 账号密码登录（备选方式）

- **方式**: Supabase Auth SDK
  ```typescript
  await supabase.auth.signInWithPassword({
    email: `${username}@meoo.local`,  // 用户名自动拼接 @meoo.local
    password: '用户密码'
  });
  ```
- **响应**: 标准 Supabase AuthResponse，包含 `session.access_token`、`user.id` 等

### 2.3 注册新账号

- **方式**: Supabase Auth SDK
  ```typescript
  await supabase.auth.signUp({
    email: `${username}@meoo.local`,
    password: '用户密码',
    options: { data: { username } }
  });
  ```
- **说明**: 注册后自动触发数据库触发器创建 profiles 记录

### 2.4 获取当前用户信息

- **方式**: Supabase SDK
  ```typescript
  // 获取 session
  const { data: { session } } = await supabase.auth.getSession();
  
  // 获取 profiles 表中的详细信息
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  ```
- **profiles 表结构**:
  | 字段 | 类型 | 说明 |
  |------|------|------|
  | id | UUID | 用户 ID（关联 auth.users） |
  | username | TEXT | 用户名（账号密码登录写入） |
  | openid | TEXT | 微信 openid（微信登录写入） |
  | unionid | TEXT | 微信 unionid |
  | nickname | TEXT | 昵称 |
  | avatar_url | TEXT | 头像 URL |
  | created_at | TIMESTAMP | 创建时间 |

- **展示规范**: 昵称兜底 `nickname || username || '微信用户'`，**禁止展示** email 和 openid

### 2.5 解绑/退出登录

- **方式**: `await supabase.auth.signOut()`

### 2.6 账号绑定说明

微信登录和账号密码登录通过 profiles 表的 `openid` 和 `username` 字段关联同一用户。绑定流程：
1. 用户微信登录 → 检查 profiles 中是否有该 openid
2. 若无 → 提示输入已有用户名密码 → 调用 signInWithPassword 验证 → 更新 profiles 写入 openid
3. 若已有 → 直接返回 session

---

## 3. 核心业务接口

> 以下接口均通过 Supabase JS SDK 直接查询数据库，RLS 策略自动控制权限。

### 3.1 课程列表

```typescript
const { data: courses } = await supabase
  .from('courses')
  .select('*')
  .eq('is_published', true)
  .order('sort_order', { ascending: true });
```

**courses 表关键字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 课程 ID |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| cover | TEXT | 封面图 URL |
| author_name | TEXT | 作者名 |
| category | TEXT | 分类 |
| tags | TEXT[] | 标签数组 |
| points_price | INTEGER | 积分价格（0=免费） |
| is_published | BOOLEAN | 是否发布 |
| is_recommended | BOOLEAN | 是否推荐 |
| has_preview | BOOLEAN | 是否有试听 |
| students_count | INTEGER | 学员数 |
| audio_url | TEXT | 课程音频 URL |

### 3.2 课程详情 + 章节列表

```typescript
// 课程详情
const { data: course } = await supabase
  .from('courses')
  .select('*')
  .eq('id', courseId)
  .single();

// 章节列表
const { data: chapters } = await supabase
  .from('chapters')
  .select('*')
  .eq('course_id', courseId)
  .eq('is_published', true)
  .order('sort_order');

// 小节列表（含音频）
const { data: sections } = await supabase
  .from('sections')
  .select('*')
  .eq('chapter_id', chapterId)
  .eq('is_published', true)
  .order('sort_order');
```

**sections 表关键字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 小节 ID |
| chapter_id | UUID | 所属章节 |
| title | TEXT | 标题 |
| content | TEXT | Markdown 内容 |
| audio_url | TEXT | 音频 URL |
| audio_duration | INTEGER | 时长（秒） |
| is_preview | BOOLEAN | 是否试听（未解锁课程仅可播放此标记的小节） |

### 3.3 文章列表 / 详情

```typescript
// 列表
const { data: articles } = await supabase
  .from('articles')
  .select('*')
  .eq('is_published', true)
  .order('created_at', { ascending: false });

// 详情
const { data: article } = await supabase
  .from('articles')
  .select('*')
  .eq('id', articleId)
  .single();
```

### 3.4 内容权限校验

```typescript
async function checkCourseAccess(userId: string, courseId: string) {
  // 1. 检查是否已购买
  const { data: purchase } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (purchase) return { unlocked: true, source: 'purchase' };

  // 2. 检查是否免费
  const { data: course } = await supabase
    .from('courses')
    .select('points_price')
    .eq('id', courseId)
    .single();
  if (course?.points_price === 0) return { unlocked: true, source: 'free' };

  // 3. 未解锁
  return { unlocked: false, price: course?.points_price };
}
```

- **已解锁**: 正常显示内容
- **未解锁**: 封面模糊 + 锁定图标 + "XX 迹解锁"提示
- **点击未解锁**: Toast "请在网站端使用积分解锁"（小程序内不做支付）
- **音频权限**: 未解锁课程仅可播放 `is_preview=true` 的试听小节

### 3.5 学习进度

```typescript
// 读取进度
const { data: progress } = await supabase
  .from('user_section_progress')
  .select('*')
  .eq('user_id', userId)
  .eq('section_id', sectionId)
  .maybeSingle();

// 更新进度
await supabase.from('user_section_progress').upsert({
  user_id: userId,
  course_id: courseId,
  section_id: sectionId,
  last_position: currentPosition,
  read_duration: duration,
  completed_at: isComplete ? new Date().toISOString() : null,
});
```

### 3.6 积分充值码兑换

- **URL**: `POST /functions/v1/redeem-points`
- **JWT 验证**: ❌ 关闭
- **请求**: `{ "code": "充值码" }`
- **说明**: 小程序端可调用此接口兑换积分

---

## 4. 特殊说明

### CORS / 域名白名单
- 小程序端需在微信公众平台「开发管理 → 服务器域名」中配置 request 合法域名
- 域名格式：`https://YOUR_APP_DOMAIN.com`（与 API 根地址一致）
- 图片/音频资源如使用 CDN，也需添加到 downloadFile 合法域名

### 接口频率限制
- Supabase 默认限制每次查询 1000 行，大数据集需分页（`.range(from, to)`）
- Edge Functions 无硬性频率限制，但建议合理控制请求频率

### 音频后台播放
- 需在 `app.json` 中声明 `"requiredBackgroundModes": ["audio"]`
- 使用 `Taro.createInnerAudioContext()` 并设置 `obeyMuteSwitch: false`

### 小程序审核注意
- **禁止**在小程序内提供支付入口（会被拒审）
- 锁定提示文案统一为"请在网站端解锁"
- 确保隐私协议已配置

### 包体积
- 主包上限 2MB，建议分包：主包放登录+首页，子包放详情+播放器

### Markdown 渲染
- 推荐使用 `mp-html` 组件：`npm install mp-html`

---

## 5. TypeScript 类型定义

可直接复制到 `src/types/database.ts`：

```typescript
export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  author_name: string | null;
  author_bio: string | null;
  author_id: string | null;
  category: string | null;
  tags: string[] | null;
  points_price: number | null;
  is_published: boolean | null;
  is_recommended: boolean | null;
  has_preview: boolean | null;
  students_count: number | null;
  status: string | null;
  short_name: string | null;
  audio_url: string | null;
  purchase_url: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  sort_order: number | null;
  is_published: boolean | null;
  created_at: string | null;
}

export interface Section {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  is_preview: boolean | null;
  is_published: boolean | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  author_id: string | null;
  summary: string | null;
  cover_url: string | null;
  tags: string[] | null;
  points_required: number | null;
  is_published: boolean | null;
  is_recommended: boolean | null;
  audio_url: string | null;
  audio_duration: number | null;
  created_at: string | null;
}

export interface Profile {
  id: string;
  username: string | null;
  openid: string | null;
  unionid: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  points_spent: number;
  created_at: string | null;
}

export interface UserSectionProgress {
  id: string;
  user_id: string;
  course_id: string;
  section_id: string;
  completed_at: string | null;
  last_position: number | null;
  read_duration: number | null;
}

export interface Author {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

export interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
}
```

---

## 6. Supabase 客户端初始化（Taro 适配）

```typescript
// src/supabase/client.ts
import Taro from '@tarojs/taro';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_APP_DOMAIN.com/sb-api'; // ⚠️ 替换
const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2NjUyNjQ1LCJleHAiOjEzMjg3MjkyNjQ1fQ.-pfX-MBmKf62jnDjxGFhjwbsMjOuDQGGfn8VYGmcQoc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: {
      getItem: (key) => Taro.getStorageSync(key),
      setItem: (key, value) => Taro.setStorageSync(key, value),
      removeItem: (key) => Taro.removeStorageSync(key),
    },
  },
});

export function getSupabaseUrl() { return SUPABASE_URL; }
export const supabaseAnonKey = SUPABASE_ANON_KEY;
```

---

## 7. Edge Functions 完整列表

| 函数名 | JWT 验证 | 用途 |
|--------|---------|------|
| `wx-mp-login` | ❌ | 微信登录 |
| `redeem-points` | ❌ | 积分充值码兑换 |
| `content-upload` | ✅ | 内容上传（管理端） |
| `podcast-generator` | ❌ | 播客生成 |
| `tts` | ❌ | 文字转语音 |
| `ai-chat` | ✅ | AI 对话 |
