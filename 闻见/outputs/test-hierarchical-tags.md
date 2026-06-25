# 多级标签 API 调试代码

## 1. 获取所有标签（含层级）

```bash
curl -X GET \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb"
```

## 2. 只获取一级标签

```bash
curl -X GET \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags&level=1" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb"
```

## 3. 只获取二级标签

```bash
curl -X GET \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags&level=2" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb"
```

## 4. 获取指定父标签下的二级标签

```bash
# 替换 PARENT_ID 为实际的一级标签 ID
curl -X GET \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags&parent_id=PARENT_ID" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb"
```

## 5. 创建一级标签

```bash
curl -X POST \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb" \
  -H "Content-Type: application/json" \
  -d '{"name": "技术"}'
```

## 6. 创建二级标签

```bash
# 替换 PARENT_ID 为实际的一级标签 ID
curl -X POST \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=tags" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb" \
  -H "Content-Type: application/json" \
  -d '{"name": "React", "parent_id": "PARENT_ID"}'
```

## 7. 测试创建文章带二级标签

```bash
curl -X POST \
  "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload?type=articles" \
  -H "x-api-key: pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试文章",
    "content": "文章内容",
    "author_id": "作者UUID",
    "tags": ["二级标签ID1", "二级标签ID2"]
  }'
```

## 8. 完整测试脚本（PowerShell）

```powershell
$apiKey = "pk_live_86d5d2ba07333a5fcbfa446d5ae5b063341883b009e5a0dc87b6463308251adb"
$baseUrl = "https://wenjian.meoo.fun/sb-api/functions/v1/content-upload"

# 1. 获取所有标签
Write-Host "=== 获取所有标签 ===" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl?type=tags" -Headers @{"x-api-key"=$apiKey}

# 2. 获取一级标签
Write-Host "`n=== 获取一级标签 ===" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl?type=tags&level=1" -Headers @{"x-api-key"=$apiKey}

# 3. 创建一级标签
Write-Host "`n=== 创建一级标签 ===" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl?type=tags" -Method POST -Headers @{"x-api-key"=$apiKey; "Content-Type"="application/json"} -Body '{"name": "技术"}'

# 4. 创建二级标签（需要替换 parent_id）
Write-Host "`n=== 创建二级标签 ===" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl?type=tags" -Method POST -Headers @{"x-api-key"=$apiKey; "Content-Type"="application/json"} -Body '{"name": "React", "parent_id": "PARENT_ID"}'
```

## 预期响应格式

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "标签名",
      "parent_id": null  // 一级标签为 null，二级标签为父标签 ID
    }
  ]
}
```
