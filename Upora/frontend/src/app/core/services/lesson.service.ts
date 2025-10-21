import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Lesson, Category, HubLesson, Course, SelectedItem } from '../models/lesson.model';
import { CATEGORIES } from '../data/lessons.data';
import { MOCK_HUB_LESSONS, MOCK_COURSES } from '../data/hub.data';
import { SAMPLE_LESSON } from '../data/lesson-builder.data';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

// Backend API response interfaces (matches NestJS camelCase response)
interface BackendLesson {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string; // NestJS returns camelCase
  category: string;
  difficulty: string;
  durationMinutes: number; // NestJS returns camelCase
  data: any;
  status: 'pending' | 'approved' | 'rejected';
  views: number; // NestJS returns views not view_count
  completionRate: number; // NestJS returns camelCase
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  // State subjects
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private myListSubject = new BehaviorSubject<Lesson[]>([]);
  private currentPageSubject = new BehaviorSubject<string>('home');
  private searchQuerySubject = new BehaviorSubject<string>('');
  private searchResultsSubject = new BehaviorSubject<Lesson[]>([]);
  private activeLessonSubject = new BehaviorSubject<Lesson | null>(null);
  private overviewLessonSubject = new BehaviorSubject<Lesson | null>(null);
  private coursesSubject = new BehaviorSubject<Course[]>(MOCK_COURSES);
  private hubLessonsSubject = new BehaviorSubject<HubLesson[]>(MOCK_HUB_LESSONS);
  private activeCourseSubject = new BehaviorSubject<Course | null>(null);
  private lessonBuilderSubPageSubject = new BehaviorSubject<'hub' | 'builder'>('hub');
  private currentLessonSubject = new BehaviorSubject<Lesson>(SAMPLE_LESSON);
  private selectedItemSubject = new BehaviorSubject<SelectedItem>({ type: 'lesson', id: SAMPLE_LESSON.id });
  private scrollPositionSubject = new BehaviorSubject<number>(0);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Observables
  categories$ = this.categoriesSubject.asObservable();
  myList$ = this.myListSubject.asObservable();
  currentPage$ = this.currentPageSubject.asObservable();
  searchQuery$ = this.searchQuerySubject.asObservable();
  searchResults$ = this.searchResultsSubject.asObservable();
  activeLesson$ = this.activeLessonSubject.asObservable();
  overviewLesson$ = this.overviewLessonSubject.asObservable();
  courses$ = this.coursesSubject.asObservable();
  hubLessons$ = this.hubLessonsSubject.asObservable();
  activeCourse$ = this.activeCourseSubject.asObservable();
  lessonBuilderSubPage$ = this.lessonBuilderSubPageSubject.asObservable();
  currentLesson$ = this.currentLessonSubject.asObservable();
  selectedItem$ = this.selectedItemSubject.asObservable();
  scrollPosition$ = this.scrollPositionSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadMyListFromStorage();
    this.setupSearchSubscription();
    
    // Load lessons from API if not using mock data
    if (!environment.enableMockData) {
      this.loadLessonsFromAPI();
    } else {
      // Use mock data
      this.categoriesSubject.next(CATEGORIES);
    }
  }

  /**
   * Load lessons from backend API
   */
  private loadLessonsFromAPI() {
    console.log('[LessonService] 🚀 Starting API call to load lessons...');
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.apiService.get<BackendLesson[]>('/lessons', { status: 'approved' })
      .pipe(
        tap(backendLessons => {
          console.log('[LessonService] ✅ API Response received:', backendLessons);
          console.log('[LessonService] 🖼️ First lesson thumbnailUrl:', backendLessons[0]?.thumbnailUrl);
          console.log('[LessonService] 🖼️ First lesson category:', backendLessons[0]?.category);
        }),
        map(backendLessons => this.transformBackendLessons(backendLessons)),
        tap(lessons => {
          console.log('[LessonService] ✅ Lessons transformed:', lessons.length);
          const categories = this.organizeLessonsByCategory(lessons);
          console.log('[LessonService] ✅ Categories organized:', categories.length, categories.map(c => c.name));
          this.categoriesSubject.next(categories);
          this.loadingSubject.next(false);
          console.log('[LessonService] ✅ Lessons loaded successfully from API!');
        }),
        catchError(error => {
          console.error('❌ [LessonService] Error loading lessons from API:', error);
          console.warn('⚠️ [LessonService] Falling back to mock data');
          this.errorSubject.next('Failed to load lessons. Using fallback data.');
          // Fallback to mock data on error
          this.categoriesSubject.next(CATEGORIES);
          this.loadingSubject.next(false);
          return of([]);
        })
      )
      .subscribe({
        next: () => console.log('[LessonService] 🎉 Subscribe completed'),
        error: (err) => console.error('[LessonService] ❌ Subscribe error:', err)
      });
  }

  /**
   * Transform backend lesson format to frontend format
   */
  private transformBackendLessons(backendLessons: BackendLesson[]): Lesson[] {
    console.log('[LessonService] Transforming lessons from backend:', backendLessons.length);
    
    const transformed = backendLessons.map((bl, index) => {
      const lesson = {
        id: parseInt(bl.id.split('-')[0], 16) % 10000 || index + 1, // Convert UUID to number for now
        title: bl.title,
        description: bl.description || '',
        image: bl.thumbnailUrl || 'https://picsum.photos/400/200', // Fixed: use camelCase
        thumbnailUrl: bl.thumbnailUrl || 'https://picsum.photos/400/200', // Fixed: use camelCase
        category: bl.category || 'Other',
        rating: bl.completionRate || 0, // Fixed: use camelCase
        duration: `${bl.durationMinutes || 30} min`, // Fixed: use camelCase
        difficulty: (bl.difficulty || 'Beginner') as 'Beginner' | 'Intermediate' | 'Advanced',
        tags: bl.tags || [],
        views: bl.views || 0, // Fixed: use views not view_count
        stages: bl.data?.stages || [],
      };
      
      console.log(`[LessonService] Transformed: ${lesson.title} (image: ${lesson.image?.substring(0, 50)}...)`);
      return lesson;
    });
    
    return transformed;
  }

  /**
   * Organize lessons by category
   */
  private organizeLessonsByCategory(lessons: Lesson[]): Category[] {
    const categoryMap = new Map<string, Lesson[]>();

    lessons.forEach(lesson => {
      const category = lesson.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(lesson);
    });

    return Array.from(categoryMap.entries()).map(([name, lessons]) => ({
      name,
      lessons,
    }));
  }

  /**
   * Refresh lessons from API
   */
  refreshLessons() {
    if (!environment.enableMockData) {
      this.loadLessonsFromAPI();
    }
  }

  // Scroll management
  updateScrollPosition(scrollTop: number) {
    this.scrollPositionSubject.next(scrollTop);
  }

  // Page navigation
  setCurrentPage(page: string) {
    this.currentPageSubject.next(page);
  }

  // Search functionality
  setSearchQuery(query: string) {
    this.searchQuerySubject.next(query);
  }

  private setupSearchSubscription() {
    this.searchQuery$.subscribe(query => {
      if (query.trim() === '') {
        this.searchResultsSubject.next([]);
        if (this.currentPageSubject.value === 'search') {
          this.setCurrentPage('home');
        }
        return;
      }

      const allLessons = this.categoriesSubject.value.flatMap(cat => cat.lessons);
      const filteredLessons = allLessons.filter(lesson =>
        lesson.title.toLowerCase().includes(query.toLowerCase()) ||
        lesson.description.toLowerCase().includes(query.toLowerCase())
      );
      this.searchResultsSubject.next(filteredLessons);
      if (this.currentPageSubject.value !== 'search') {
        this.setCurrentPage('search');
      }
    });
  }

  // My List functionality
  toggleMyList(lesson: Lesson) {
    const currentList = this.myListSubject.value;
    const isInList = currentList.some(item => item.id === lesson.id);
    
    if (isInList) {
      const newList = currentList.filter(item => item.id !== lesson.id);
      this.myListSubject.next(newList);
    } else {
      this.myListSubject.next([...currentList, lesson]);
    }
    
    this.saveMyListToStorage();
  }

  isInMyList(lessonId: number): boolean {
    return this.myListSubject.value.some(item => item.id === lessonId);
  }

  private loadMyListFromStorage() {
    try {
      const stored = localStorage.getItem('myList');
      if (stored) {
        this.myListSubject.next(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading myList from localStorage:', error);
    }
  }

  private saveMyListToStorage() {
    try {
      localStorage.setItem('myList', JSON.stringify(this.myListSubject.value));
    } catch (error) {
      console.error('Error saving myList to localStorage:', error);
    }
  }

  // Lesson viewing
  showOverview(lesson: Lesson) {
    this.overviewLessonSubject.next(lesson);
    this.setCurrentPage('lessonOverview');
  }

  startLessonFromOverview() {
    const frenchLesson = this.categoriesSubject.value
      .flatMap(c => c.lessons)
      .find(l => l.id === 9);
    
    if (frenchLesson && frenchLesson.stages && frenchLesson.stages.length > 0) {
      this.activeLessonSubject.next(frenchLesson);
      this.setCurrentPage('lessonView');
    } else {
      alert("Conversational French lesson content is not available yet.");
    }
  }

  exitLessonView() {
    this.activeLessonSubject.next(null);
    this.setCurrentPage('home');
  }

  exitOverview() {
    this.overviewLessonSubject.next(null);
    this.setCurrentPage('home');
  }

  // Lesson Builder
  setLessonBuilderSubPage(subPage: 'hub' | 'builder') {
    this.lessonBuilderSubPageSubject.next(subPage);
  }

  enterBuilder() {
    this.setCurrentPage('lesson-builder');
    this.setLessonBuilderSubPage('builder');
  }

  exitBuilder() {
    this.setLessonBuilderSubPage('hub');
  }

  exitBuilderHub() {
    this.setCurrentPage('home');
  }

  // Course management
  viewCourse(course: Course) {
    this.activeCourseSubject.next(course);
    this.setCurrentPage('courseDetails');
  }

  assignLessonToCourse(lessonId: number, courseId: number) {
    const currentLessons = this.hubLessonsSubject.value;
    const updatedLessons = currentLessons.map(lesson =>
      lesson.id === lessonId ? { ...lesson, courseId: courseId } : lesson
    );
    this.hubLessonsSubject.next(updatedLessons);
  }

  exitCourseDetails() {
    this.activeCourseSubject.next(null);
    this.setCurrentPage('lesson-builder');
    this.setLessonBuilderSubPage('hub');
  }

  // Profile
  exitProfile() {
    this.setCurrentPage('home');
  }

  // Lesson Builder specific
  updateCurrentLesson(lesson: Lesson) {
    this.currentLessonSubject.next(lesson);
  }

  setSelectedItem(item: SelectedItem) {
    this.selectedItemSubject.next(item);
  }

  // Get featured lesson - pick the first approved lesson or one with highest rating
  getFeaturedLesson(): Lesson | null {
    const allLessons = this.categoriesSubject.value.flatMap(cat => cat.lessons);
    
    if (allLessons.length === 0) {
      return null;
    }
    
    // Try to find a lesson with highest rating
    const sortedByRating = [...allLessons].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // Return first lesson with rating, or just first lesson
    return sortedByRating.find(l => (l.rating || 0) > 0) || allLessons[0];
  }
}