import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon, UserCircleIcon, CloseIcon } from './Icon';

interface HeaderProps {
  setCurrentPage: (page: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setCurrentPage, searchQuery, setSearchQuery }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleNavClick = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSearchOpen) {
      handleCloseSearch();
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isScrolled || isSearchOpen ? 'bg-brand-black' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl md:text-3xl font-bold text-brand-red tracking-wider cursor-pointer" onClick={handleNavClick('home')}>
              Bloomix
            </h1>
            <nav className="hidden md:flex items-center space-x-4">
              <button onClick={handleNavClick('home')} className="text-white font-semibold hover:text-brand-gray transition-colors">Home</button>
              <button onClick={handleNavClick('categories')} className="text-white font-semibold hover:text-brand-gray transition-colors">Categories</button>
              <button onClick={handleNavClick('my-list')} className="text-white font-semibold hover:text-brand-gray transition-colors">My List</button>
              <button onClick={handleNavClick('lesson-builder')} className="text-white font-semibold hover:text-brand-gray transition-colors">Lesson-builder</button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {isSearchOpen ? (
              <div className="flex items-center space-x-2">
                <SearchIcon className="h-5 w-5 text-white" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Titles, descriptions"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-b border-white text-white focus:outline-none w-32 sm:w-48 transition-all"
                />
                <button onClick={handleCloseSearch} className="text-white hover:text-brand-gray transition-colors">
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={handleSearchToggle} className="text-white hover:text-brand-gray transition-colors">
                  <SearchIcon className="h-6 w-6" />
                </button>
                <button className="text-white hover:text-brand-gray transition-colors">
                  <BellIcon className="h-6 w-6" />
                </button>
                <button>
                  <UserCircleIcon className="h-8 w-8 text-blue-500" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;