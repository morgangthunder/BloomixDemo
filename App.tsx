
import React, { useState, useEffect } from 'react';
import type { Category, Lesson } from './types';
import { CATEGORIES } from './data/lessons';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import CategoryCarousel from './components/CategoryCarousel';
import CategoriesPage from './components/CategoriesPage';
import MyListPage from './components/MyListPage';
import SearchPage from './components/SearchPage';
import LessonBuilderPage from './components/LessonBuilderPage';
import LessonViewPage from './components/LessonViewPage';


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

  const handleStartLesson = (lesson: Lesson) => {
    if (lesson.stages && lesson.stages.length > 0) {
      setActiveLesson(lesson);
      setCurrentPage('lessonView');
    } else {
      // Maybe show a "coming soon" message for lessons without content
      alert("This lesson content is not available yet.");
    }
  };

  const handleExitLessonView = () => {
    setActiveLesson(null);
    setCurrentPage('home');
  }

  const isInMyList = (lessonId: number): boolean => {
    return myList.some(item => item.id === lessonId);
  };

  const renderPage = () => {
    const props = {
      categories,
      myList,
      onToggleMyList: handleToggleMyList,
      isInMyList,
      onStartLesson: handleStartLesson
    };
    
    switch (currentPage) {
      case 'lessonView':
         return activeLesson ? <LessonViewPage lesson={activeLesson} onExit={handleExitLessonView} /> : <p>Loading lesson...</p>;
      case 'search':
        return <SearchPage lessons={searchResults} searchQuery={searchQuery} onToggleMyList={handleToggleMyList} isInMyList={isInMyList} onStartLesson={handleStartLesson} />;
      case 'categories':
        return <CategoriesPage {...props} />;
      case 'my-list':
        return <MyListPage lessons={myList} onToggleMyList={handleToggleMyList} isInMyList={isInMyList} onStartLesson={handleStartLesson}/>;
      case 'lesson-builder':
        return <LessonBuilderPage />;
      case 'home':
      default:
        return (
          <>
            {featuredLesson && <HeroSection lesson={featuredLesson} onToggleMyList={handleToggleMyList} isInMyList={isInMyList(featuredLesson.id)} onStartLesson={handleStartLesson} />}
            <div className="py-4 md:py-8 lg:py-12 space-y-8 md:space-y-12 lg:space-y-16">
              {categories.map((category) => (
                <CategoryCarousel key={category.name} category={category} onToggleMyList={handleToggleMyList} isInMyList={isInMyList} onStartLesson={handleStartLesson} />
              ))}
            </div>
          </>
        );
    }
  };

  return (
    <div className="bg-brand-black min-h-screen text-brand-light-gray font-sans">
      {currentPage !== 'lessonView' && (
        <Header 
          setCurrentPage={setCurrentPage} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}
      <main className="overflow-x-hidden">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;