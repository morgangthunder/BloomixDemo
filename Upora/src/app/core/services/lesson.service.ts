import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Lesson, Category, HubLesson, Course, SelectedItem } from '../models/lesson.model';
import { CATEGORIES } from '../data/lessons.data';
import { MOCK_HUB_LESSONS, MOCK_COURSES } from '../data/hub.data';
import { SAMPLE_LESSON } from '../data/lesson-builder.data';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  // State subjects
  private categoriesSubject = new BehaviorSubject<Category[]>(CATEGORIES);
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

  constructor() {
    this.loadMyListFromStorage();
    this.setupSearchSubscription();
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

  // Get featured lesson (The Art of Storytelling - id: 4)
  getFeaturedLesson(): Lesson | null {
    const allLessons = this.categoriesSubject.value.flatMap(cat => cat.lessons);
    return allLessons.find(l => l.id === 4) || allLessons[0] || null;
  }
}