# 文章详情页布局规范文档

## 概述

本文档定义文章详情页与课程详情页统一的布局规范，确保两个页面在信息架构和视觉呈现上保持高度一致。

## 布局结构对比

### 课程详情页 (CourseDetail) 布局特点

```
┌─────────────────────────────────────────────────────────────┐
│  返回按钮                                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  封面图 (可选) + 标题 + 作者 + 元信息                  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  课程简介 (独立区块)                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │              │  │                                     │ │
│  │  侧边栏      │  │  主内容区                            │ │
│  │  (目录导航)  │  │  (章节内容/详情)                      │ │
│  │  w-72        │  │  max-w-4xl                          │ │
│  │              │  │                                     │ │
│  └──────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 文章详情页 (ArticleDetail) 布局特点

```
├─────────────────────────────────────────────────────────────┤
│  返回按钮                                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  标题 + 作者 + 日期 + 积分 + 标签                     │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  文章摘要 (独立区块)                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │              │  │                                     │ │
│  │  侧边栏      │  │  主内容区                            │ │
│  │  (目录导航)  │  │  (正文内容)                          │ │
│  │  w-72        │  │  max-w-4xl                          │ │
│  │              │  │                                     │ │
│  └──────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 关键尺寸参数

### 容器尺寸

| 元素 | 尺寸 | 说明 |
|------|------|------|
| 页面最大宽度 | `max-w-6xl` (72rem / 1152px) | 与课程详情页一致 |
| 主内容区最大宽度 | `max-w-4xl` (56rem / 896px) | 正文阅读最佳宽度 |
| 侧边栏宽度 | `w-72` (18rem / 288px) | 固定宽度，不随内容变化 |
| 主内容区与侧边栏间距 | `gap-8` (2rem / 32px) | 统一间距 |

### 间距系统

| 元素 | 间距类 | 数值 |
|------|--------|------|
| 页面内边距 (移动端) | `px-4 py-6` | 1rem / 1.5rem |
| 页面内边距 (桌面端) | `px-8 py-12` | 2rem / 3rem |
| 区块间距 | `mb-10 lg:mb-12` | 2.5rem / 3rem |
| 标题下方间距 | `mb-4` | 1rem |
| 元信息下方间距 | `mb-6` | 1.5rem |

### 排版比例

| 元素 | 移动端 | 平板端 | 桌面端 | 字重 | 行高 |
|------|--------|--------|--------|------|------|
| 页面标题 | `text-2xl` | `text-3xl` | `text-4xl` | `font-medium` | `leading-tight` |
| 区块标题 | `text-xl` | - | - | `font-serif` | - |
| 正文内容 | - | - | - | `font-light` | `leading-[1.9]` |
| 元信息 | `text-sm` | - | - | `font-light` | - |
| 标签文字 | `text-xs` | - | - | - | - |

## 响应式断点规则

### 断点定义

| 断点 | 宽度 | 布局变化 |
|------|------|----------|
| 默认 (移动) | < 640px | 侧边栏隐藏，显示浮动目录按钮 |
| sm | ≥ 640px | 增加水平内边距 |
| lg | ≥ 1024px | 显示侧边栏，主内容区右移 |

### 响应式行为

```css
/* 移动端 (< 1024px) */
- 侧边栏隐藏 (hidden lg:block)
- 显示浮动目录按钮 (fixed bottom-20 right-4)
- 点击按钮弹出底部抽屉式目录

/* 桌面端 (≥ 1024px) */
- 侧边栏显示 (lg:block w-72)
- 侧边栏固定定位 (sticky top-24)
- 主内容区与侧边栏并排
```

## 组件样式规范

### 1. 标题区域

```tsx
// 统一结构
<div className="flex flex-col gap-6">
  <div className="flex-1">
    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-[var(--color-text-primary)] mb-4 leading-tight tracking-wide">
      {title}
    </h1>
    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-6">
      {/* 元信息：作者、日期、积分等 */}
    </div>
    {/* 标签区域 */}
  </div>
</div>
```

### 2. 信息卡片区块

```tsx
// 摘要/简介区块
<div className="mb-10 lg:mb-12">
  <h2 className="font-serif text-xl text-[var(--color-text-primary)] mb-4">区块标题</h2>
  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6">
    <p className="text-[var(--color-text-primary)] font-light leading-[1.9] text-justify tracking-wide">
      {content}
    </p>
  </div>
</div>
```

### 3. 侧边栏目录

```tsx
// 桌面端侧边栏
<aside className="hidden lg:block w-72 flex-shrink-0">
  <div className="sticky top-24">
    <div className="mb-6 pb-4 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
      <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
        目录
      </h3>
    </div>
    <nav className="space-y-1">
      {/* 目录项 */}
    </nav>
  </div>
</aside>
```

### 4. 主内容区

```tsx
// 主内容容器
<main className="flex-1 min-w-0" ref={contentRef}>
  <div className="max-w-4xl">
    {/* 内容 */}
  </div>
</main>
```

### 5. 移动端目录抽屉

```tsx
// 底部抽屉式目录 (仅移动端)
<div className="fixed bottom-0 left-0 right-0 h-[70vh] bg-[var(--color-bg-secondary)] z-[85] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] lg:hidden">
  {/* 目录内容 */}
</div>
```

### 6. 浮动操作按钮

```tsx
// 目录触发按钮 (仅移动端)
<button className="fixed bottom-20 right-4 z-[75] w-14 h-14 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 lg:hidden">
  <List className="w-6 h-6" />
</button>
```

## 颜色变量

使用 CSS 变量确保主题一致性：

| 变量名 | 用途 |
|--------|------|
| `--color-bg-primary` | 页面背景色 |
| `--color-bg-secondary` | 卡片/区块背景色 |
| `--color-text-primary` | 主要文字颜色 |
| `--color-text-secondary` | 次要文字颜色 |
| `--color-border` | 边框颜色 |
| `--color-accent` | 强调色/主色调 |

## 交互规范

### 悬停状态

```css
/* 按钮悬停 */
hover:opacity-90
hover:bg-[var(--color-bg-secondary)]
hover:text-[var(--color-text-primary)]

/* 卡片悬停 */
hover:shadow-md
hover:-translate-y-0.5
transition-all duration-200
```

### 过渡动画

```css
/* 目录展开 */
transition: transform 0.2s ease

/* 按钮缩放 */
hover:scale-105
active:scale-95
transition-all duration-200
```

## 文件变更记录

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/pages/ArticleDetail.tsx` | 重写 | 完全对齐课程详情页布局 |

## 关键改进点

1. **布局结构统一**：采用与课程详情页相同的 `flex gap-8` 双栏布局
2. **侧边栏宽度统一**：从 `w-56` 改为 `w-72`，与课程详情页一致
3. **间距系统统一**：使用 `mb-10 lg:mb-12` 等统一间距
4. **标题样式统一**：采用相同的响应式标题大小和字重
5. **区块卡片统一**：摘要区块使用与课程简介相同的卡片样式
6. **目录交互统一**：桌面端侧边栏目录样式与课程章节导航一致
7. **移动端体验统一**：底部抽屉式目录与课程移动端目录一致
8. **元信息展示统一**：作者、日期等元信息使用相同的图标+文字组合
