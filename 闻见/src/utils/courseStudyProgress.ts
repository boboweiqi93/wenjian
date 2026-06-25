export interface StudyUnitLike {
  id: string;
  audio_url?: string | null;
  content?: string | null;
}

export interface CourseStudyProgress {
  audioCompletedSectionIds: string[];
  textCompletedSectionIds: string[];
  lastTextSectionId: string | null;
  updatedAt: number | null;
}

interface CourseStudyProgressStore {
  courses: Record<string, CourseStudyProgress>;
}

export interface CourseStudyProgressStats {
  audioCompletedCount: number;
  audioTotalCount: number;
  audioPercent: number;
  textCompletedCount: number;
  textTotalCount: number;
  textPercent: number;
  overallCompletedCount: number;
  overallTotalCount: number;
  overallPercent: number;
}

const COURSE_STUDY_PROGRESS_KEY = 'wenjian-course-study-progress-v1';

const emptyCourseProgress = (): CourseStudyProgress => ({
  audioCompletedSectionIds: [],
  textCompletedSectionIds: [],
  lastTextSectionId: null,
  updatedAt: null,
});

const readStudyProgressStore = (): CourseStudyProgressStore => {
  if (typeof window === 'undefined') {
    return { courses: {} };
  }

  try {
    const raw = window.localStorage.getItem(COURSE_STUDY_PROGRESS_KEY);
    if (!raw) {
      return { courses: {} };
    }

    const parsed = JSON.parse(raw) as CourseStudyProgressStore;
    return {
      courses: parsed.courses || {},
    };
  } catch {
    return { courses: {} };
  }
};

const writeStudyProgressStore = (store: CourseStudyProgressStore) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(COURSE_STUDY_PROGRESS_KEY, JSON.stringify(store));
  } catch {
    // ignore storage write failures
  }
};

const uniqueIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const updateCourseProgress = (
  courseId: string,
  updater: (current: CourseStudyProgress) => CourseStudyProgress
) => {
  if (!courseId) return emptyCourseProgress();

  const store = readStudyProgressStore();
  const current = store.courses[courseId] || emptyCourseProgress();
  const next = updater(current);

  store.courses[courseId] = {
    ...next,
    audioCompletedSectionIds: uniqueIds(next.audioCompletedSectionIds),
    textCompletedSectionIds: uniqueIds(next.textCompletedSectionIds),
    updatedAt: Date.now(),
  };

  writeStudyProgressStore(store);
  return store.courses[courseId];
};

export const hasTextContent = (content?: string | null) => Boolean(content && content.trim());

export const hasAudioContent = (audioUrl?: string | null) => Boolean(audioUrl);

export const getCourseStudyProgress = (courseId: string): CourseStudyProgress => {
  if (!courseId) {
    return emptyCourseProgress();
  }

  return readStudyProgressStore().courses[courseId] || emptyCourseProgress();
};

export const markAudioSectionCompleted = (courseId: string, sectionId: string) => updateCourseProgress(courseId, (current) => ({
  ...current,
  audioCompletedSectionIds: [...current.audioCompletedSectionIds, sectionId],
}));

export const markTextSectionCompleted = (courseId: string, sectionId: string) => updateCourseProgress(courseId, (current) => ({
  ...current,
  textCompletedSectionIds: [...current.textCompletedSectionIds, sectionId],
  lastTextSectionId: sectionId,
}));

export const setLastTextSection = (courseId: string, sectionId: string) => updateCourseProgress(courseId, (current) => ({
  ...current,
  lastTextSectionId: sectionId,
}));

export const getCourseStudyProgressStats = (
  courseId: string,
  sections: StudyUnitLike[]
): CourseStudyProgressStats => {
  const progress = getCourseStudyProgress(courseId);
  const audioSections = sections.filter((section) => hasAudioContent(section.audio_url));
  const textSections = sections.filter((section) => hasTextContent(section.content));
  const audioCompletedCount = audioSections.filter((section) => progress.audioCompletedSectionIds.includes(section.id)).length;
  const textCompletedCount = textSections.filter((section) => progress.textCompletedSectionIds.includes(section.id)).length;
  const audioTotalCount = audioSections.length;
  const textTotalCount = textSections.length;
  const overallCompletedCount = audioCompletedCount + textCompletedCount;
  const overallTotalCount = audioTotalCount + textTotalCount;

  return {
    audioCompletedCount,
    audioTotalCount,
    audioPercent: audioTotalCount > 0 ? Math.round((audioCompletedCount / audioTotalCount) * 100) : 0,
    textCompletedCount,
    textTotalCount,
    textPercent: textTotalCount > 0 ? Math.round((textCompletedCount / textTotalCount) * 100) : 0,
    overallCompletedCount,
    overallTotalCount,
    overallPercent: overallTotalCount > 0 ? Math.round((overallCompletedCount / overallTotalCount) * 100) : 0,
  };
};
