import React, { useState, useEffect } from 'react';
import type { Category, Lesson, Course, HubLesson } from './types';
import { CATEGORIES } from './data/lessons';
import { MOCK_COURSES, MOCK_HUB_LESSONS } from './data/hubData';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CategoryCarousel from './components/CategoryCarousel';
import CategoriesPage from './components/CategoriesPage';
import MyListPage from './components/MyListPage';
import SearchPage from './components/SearchPage';
import LessonBuilderPage from './components/LessonBuilderPage';
import LessonViewPage from './components/LessonViewPage';
import ProfilePage from './components/ProfilePage';
import LessonBuilderHubPage from './components/LessonBuilderHubPage';
import LessonOverviewPage from './components/LessonOverviewPage';
import CourseDetailsPage from './components/CourseDetailsPage';


const App: React.FC = () => {
  const [categories] = useState<Category[]>(CATEGORIES);
  const [featuredLesson, setFeaturedLesson] = useState<Lesson | null>(() => {
    const allLessons = CATEGORIES.flatMap(cat => cat.lessons);
    if (allLessons.length > 0) {
      const randomIndex = Math.floor(Math.random() * allLessons.length);
      return allLessons[randomIndex];
    }
    return null;
  });

  const [currentPage, setCurrentPage] = useState('home');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [overviewLesson, setOverviewLesson] = useState<Lesson | null>(null);
  const [lessonBuilderSubPage, setLessonBuilderSubPage] = useState<'hub' | 'builder'>('hub');
  
  // State for Hub and Course pages
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [hubLessons, setHubLessons] = useState<HubLesson[]>(MOCK_HUB_LESSONS);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);


  const [myList, setMyList] = useState<Lesson[]>(() => {
    try {
      const item = window.localStorage.getItem('myList');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Lesson[]>([]);

  useEffect(() => {
    try {
      window.localStorage.setItem('myList', JSON.stringify(myList));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [myList]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      if (currentPage === 'search') {
        setCurrentPage('home');
      }
      return;
    }

    const allLessons = categories.flatMap(cat => cat.lessons);
    const filteredLessons = allLessons.filter(lesson =>
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filteredLessons);
    if(currentPage !== 'search') {
      setCurrentPage('search');
    }
  }, [searchQuery, categories, currentPage]);


  const handleToggleMyList = (lesson: Lesson) => {
    setMyList(prevList => {
      const isInList = prevList.some(item => item.id === lesson.id);
      if (isInList) {
        return prevList.filter(item => item.id !== lesson.id);
      } else {
        return [...prevList, lesson];
      }
    });
  };

  const handleShowOverview = (lesson: Lesson) => {
    setOverviewLesson(lesson);
    setCurrentPage('lessonOverview');
  };
  
  const handleStartLessonFromOverview = () => {
    // Per demo request, all "Start Lesson" buttons link to Conversational French
    const frenchLesson = CATEGORIES.flatMap(c => c.lessons).find(l => l.id === 9);
    if (frenchLesson && frenchLesson.stages && frenchLesson.stages.length > 0) {
      setActiveLesson(frenchLesson);
      setCurrentPage('lessonView');
    } else {
      alert("Conversational French lesson content is not available yet.");
    }
  };

  const handleExitLessonView = () => {
    setActiveLesson(null);
    setCurrentPage('home');
  }
  
  const handleExitOverview = () => {
    setOverviewLesson(null);
    setCurrentPage('home');
  }
  
  const handleNavClick = (page: string) => {
    if (page === 'lesson-builder') {
      setLessonBuilderSubPage('hub');
    }
    setCurrentPage(page);
  };

  const handleEnterBuilder = () => {
    setCurrentPage('lesson-builder');
    setLessonBuilderSubPage('builder');
  };
  
  const handleExitBuilder = () => {
    setLessonBuilderSubPage('hub');
  };

  const handleExitBuilderHub = () => {
    setCurrentPage('home');
  };
  
  const handleExitProfile = () => {
    setCurrentPage('home');
  };

  const handleViewCourse = (course: Course) => {
    setActiveCourse(course);
    setCurrentPage('courseDetails');
  };

  const handleAssignLessonToCourse = (lessonId: number, courseId: number) => {
    setHubLessons(prevLessons =>
      prevLessons.map(lesson =>
        lesson.id === lessonId ? { ...lesson, courseId: courseId } : lesson
      )
    );
  };

  const handleExitCourseDetails = () => {
    setActiveCourse(null);
    setCurrentPage('lesson-builder');
    setLessonBuilderSubPage('hub');
  };

  const isInMyList = (lessonId: number): boolean => {
    return myList.some(item => item.id === lessonId);
  };

  const renderPage = () => {
    const props = {
      categories,
      myList,
      onToggleMyList: handleToggleMyList,
      isInMyList,
      onViewLesson: handleShowOverview,
    };
    
    switch (currentPage) {
      case 'lessonOverview':
        return overviewLesson ? <LessonOverviewPage 
          lesson={overviewLesson} 
          onExit={handleExitOverview} 
          onStartLesson={handleStartLessonFromOverview}
          onToggleMyList={() => handleToggleMyList(overviewLesson)}
          isInMyList={isInMyList(overviewLesson.id)}
        /> : <p>Loading lesson overview...</p>;
      case 'lessonView':
         return activeLesson ? <LessonViewPage lesson={activeLesson} onExit={handleExitLessonView} /> : <p>Loading lesson...</p>;
      case 'search':
        return <SearchPage lessons={searchResults} searchQuery={searchQuery} onToggleMyList={handleToggleMyList} isInMyList={isInMyList} onViewLesson={handleShowOverview} />;
      case 'categories':
        return <CategoriesPage {...props} />;
      case 'my-list':
        return <MyListPage lessons={myList} onToggleMyList={handleToggleMyList} isInMyList={isInMyList} onViewLesson={handleShowOverview}/>;
      case 'lesson-builder':
        if (lessonBuilderSubPage === 'hub') {
          return <LessonBuilderHubPage 
            onExit={handleExitBuilderHub} 
            onEnterBuilder={handleEnterBuilder}
            courses={courses}
            lessons={hubLessons}
            onViewCourse={handleViewCourse}
            onAssignLesson={handleAssignLessonToCourse}
          />;
        }
        return <LessonBuilderPage onExit={handleExitBuilder} />;
      case 'courseDetails':
        return activeCourse ? <CourseDetailsPage
            course={activeCourse}
            lessons={hubLessons.filter(l => l.courseId === activeCourse.id)}
            onExit={handleExitCourseDetails}
            onEnterBuilder={handleEnterBuilder}
        /> : <p>Loading course...</p>;
      case 'profile':
        return <ProfilePage onExit={handleExitProfile} />;
      case 'home':
      default:
        return (
          <>
            {featuredLesson && <HeroSection lesson={featuredLesson} onToggleMyList={handleToggleMyList} isInMyList={isInMyList(featuredLesson.id)} onViewLesson={handleShowOverview} />}
            <div className="py-4 md:py-8 lg:py-12 space-y-8 md:space-y-12 lg:space-y-16">
              {categories.map((category) => (
                <CategoryCarousel key={category.name} category={category} onToggleMyList={handleToggleMyList} isInMyList={isInMyList} onViewLesson={handleShowOverview} />
              ))}
            </div>
          </>
        );
    }
  };

  const renderHeader = () => {
    const nonHeaderPages = ['lessonView', 'lesson-builder', 'lessonOverview', 'courseDetails'];
    if (nonHeaderPages.includes(currentPage)) {
      return null;
    }
    return (
      <Header 
        currentPage={currentPage}
        onNavClick={handleNavClick}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    );
  }

  return (
    <div className="bg-brand-black min-h-screen text-brand-light-gray font-sans">
      {renderHeader()}
      <main className="overflow-x-hidden">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;