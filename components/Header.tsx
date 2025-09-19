import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon, UserCircleIcon, CloseIcon, MenuIcon } from './Icon';

interface HeaderProps {
  currentPage: string;
  onNavClick: (page: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavClick, searchQuery, setSearchQuery }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const handleNav = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSearchOpen) {
      handleCloseSearch();
    }
    setIsMobileMenuOpen(false); // Close mobile menu on nav click
    onNavClick(page);
    window.scrollTo(0, 0);
  };

  const handleSearchToggle = () => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const navLinkClasses = (page: string) => 
    `font-semibold transition-colors ${currentPage === page ? 'text-white' : 'text-brand-gray hover:text-white'}`;
  
  const mobileNavLinkClasses = (page: string) => 
    `block w-full text-left p-3 text-lg rounded-md ${currentPage === page ? 'bg-brand-red text-white' : 'text-brand-light-gray hover:bg-gray-700'}`;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isScrolled || isSearchOpen || isMobileMenuOpen ? 'bg-brand-black' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center space-x-4 md:space-x-8">
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
                {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-red tracking-wider cursor-pointer" onClick={handleNav('home')}>
              Upora
            </h1>
            <nav className="hidden md:flex items-center space-x-4">
              <button onClick={handleNav('home')} className={navLinkClasses('home')}>Home</button>
              <button onClick={handleNav('categories')} className={navLinkClasses('categories')}>Categories</button>
              <button onClick={handleNav('my-list')} className={navLinkClasses('my-list')}>My List</button>
              <button onClick={handleNav('lesson-builder')} className={navLinkClasses('lesson-builder')}>Lesson-builder</button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {isSearchOpen ? (
              <div className="flex items-center space-x-2 animate-fade-in">
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
                <button onClick={handleNav('profile')}>
                  <UserCircleIcon className={`h-8 w-8 transition-colors ${currentPage === 'profile' ? 'text-blue-400' : 'text-blue-500 hover:text-blue-400'}`} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-brand-black/95 absolute top-16 left-0 right-0 p-4 border-t border-gray-800">
          <nav className="flex flex-col space-y-2">
            <button onClick={handleNav('home')} className={mobileNavLinkClasses('home')}>Home</button>
            <button onClick={handleNav('categories')} className={mobileNavLinkClasses('categories')}>Categories</button>
            <button onClick={handleNav('my-list')} className={mobileNavLinkClasses('my-list')}>My List</button>
            <button onClick={handleNav('lesson-builder')} className={mobileNavLinkClasses('lesson-builder')}>Lesson-builder</button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;