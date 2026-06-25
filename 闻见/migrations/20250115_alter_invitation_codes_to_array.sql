-- ============================================
-- 修改 invitation_codes 表，支持多套课程
-- ============================================

-- 1. 添加新列 course_ids（数组类型）
ALTER TABLE invitation_codes ADD COLUMN IF NOT EXISTS course_ids UUID[];

-- 2. 将现有 course_id 数据迁移到 course_ids 数组
UPDATE invitation_codes 
SET course_ids = ARRAY[course_id] 
WHERE course_id IS NOT NULL AND course_ids IS NULL;

-- 3. 添加 course_ids 的 GIN 索引（用于数组查询）
CREATE INDEX IF NOT EXISTS idx_invitation_codes_course_ids 
ON invitation_codes USING GIN(course_ids);

-- 4. 添加注释说明
COMMENT ON COLUMN invitation_codes.course_ids IS '关联的课程ID数组，支持多套课程';
COMMENT ON COLUMN invitation_codes.course_id IS '单课程ID（保留用于兼容旧数据）';
