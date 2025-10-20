import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Category } from '../models/lesson.model';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  constructor() {
    console.log('Gemini service initialized (disabled - using static data only)');
  }

  fetchLessonData(): Observable<Category[]> {
    // Always return empty - we use static data from CATEGORIES constant
    console.log('Gemini API disabled - using static lesson data');
    return of([]);
  }
}