import type { Category, Lesson } from '../types';

export const CATEGORIES: Category[] = [
  {
    name: 'Popular',
    lessons: [
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 1, title: 'Introduction to Python', description: 'Master the basics of Python programming in this beginner-friendly course.', thumbnailUrl: 'https://picsum.photos/400/225?random=1', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 2, title: 'Digital Photography Essentials', description: 'Learn to capture stunning photos by understanding your camera and composition.', thumbnailUrl: 'https://picsum.photos/400/225?random=2', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 3, title: 'Financial Literacy 101', description: 'Gain control of your finances with essential lessons on budgeting and saving.', thumbnailUrl: 'https://picsum.photos/400/225?random=3', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 4, title: 'The Art of Storytelling', description: 'Craft compelling narratives that captivate and engage your audience.', thumbnailUrl: 'https://picsum.photos/400/225?random=4', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 5, title: 'Web Development Fundamentals', description: 'Build your first website using HTML, CSS, and JavaScript.', thumbnailUrl: 'https://picsum.photos/400/225?random=5', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 6, title: 'Graphic Design Basics', description: 'Discover the principles of design and create stunning visuals with Canva.', thumbnailUrl: 'https://picsum.photos/400/225?random=6', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 7, title: 'Spanish for Beginners', description: 'Start your journey to fluency with practical and conversational Spanish lessons.', thumbnailUrl: 'https://picsum.photos/400/225?random=7', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 8, title: 'Creative Writing Workshop', description: 'Unleash your inner author and learn the techniques of creative writing.', thumbnailUrl: 'https://picsum.photos/400/225?random=8', stages: [] },
    ]
  },
  {
    name: 'Languages',
    lessons: [
      { 
        id: 9, 
        title: 'Conversational French', 
        description: 'Learn key phrases and cultural nuances to navigate French conversations.', 
        thumbnailUrl: 'https://picsum.photos/400/225?random=9',
        stages: [
          {
            id: 101,
            title: 'Bonjour! Basic Greetings',
            // FIX: Added required 'type' property.
            // FIX: Replaced deprecated 'Launch' stage type with 'Trigger'.
            type: 'Trigger',
            viewed: true,
            passed: false,
            subStages: [
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1011, type: 'Ignite', title: 'Meet & Greet', interactionType: 'Video', duration: 3, content: { type: 'video', url: 'https://example.com/video1.mp4' }, completed: true, script: [] },
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1012, type: 'Evoke', title: 'Common Phrases', interactionType: 'Memory Prompt Card', duration: 5, content: { type: 'interactive' }, completed: true, script: [] },
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1013, type: 'Tease', title: 'Pronunciation Guide', interactionType: 'Flashcard Drill', duration: 7, content: { type: 'text', text: 'Detailed guide on French vowels.' }, completed: false, script: [] },
            ]
          },
          {
            id: 102,
            title: 'Au Café: Ordering Coffee',
            // FIX: Added required 'type' property.
            type: 'Absorb',
            viewed: false,
            passed: false,
            subStages: [
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1021, type: 'Present', title: 'At the Cafe', interactionType: 'Animated Explainer Video', duration: 5, content: { type: 'video', url: 'https://example.com/video2.mp4' }, completed: false, script: [] },
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1022, type: 'Articulate', title: 'Menu Vocabulary', interactionType: 'Concept Map Builder', duration: 8, content: { type: 'interactive' }, completed: false, script: [] },
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1023, type: 'Tie', title: 'How to Order', interactionType: 'Analogy Matching Game', duration: 6, content: { type: 'text', text: 'Step-by-step guide to ordering.' }, completed: false, script: [] },
            ]
          },
           {
            id: 103,
            title: 'Directions & Getting Around',
            // FIX: Added required 'type' property.
            // FIX: Replaced deprecated 'Refine' stage type with 'Cultivate'.
            type: 'Cultivate',
            viewed: false,
            passed: false,
            subStages: [
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1031, type: 'Practice', title: 'Lost in Paris', interactionType: 'Flashcard Drill', duration: 5, content: { type: 'video', url: 'https://example.com/video3.mp4' }, completed: false, script: [] },
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1032, type: 'Adapt', title: 'Directional Phrases', interactionType: 'Role-Play Simulator', duration: 10, content: { type: 'interactive' }, completed: false, script: [] },
              // FIX: Added missing properties 'interactionType', 'duration' and corrected 'type' to satisfy the SubStage type.
// FIX: Added missing 'script' property.
              { id: 1033, type: 'Challenge', title: 'Using a Metro Map', interactionType: 'Brainstorm Board', duration: 8, content: { type: 'text', text: 'How to read the Paris Metro map.' }, completed: false, script: [] },
            ]
          }
        ]
      },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 10, title: 'Japanese Hiragana & Katakana', description: 'Master the foundational writing systems of the Japanese language.', thumbnailUrl: 'https://picsum.photos/400/225?random=10', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 11, title: 'German Grammar Essentials', description: 'Understand the core grammatical structures of the German language.', thumbnailUrl: 'https://picsum.photos/400/225?random=11', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 12, title: 'Mandarin Chinese Tones', description: 'Learn to distinguish and pronounce the four main tones in Mandarin.', thumbnailUrl: 'https://picsum.photos/400/225?random=12', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 13, title: 'Italian for Travelers', description: 'Essential vocabulary and phrases for your next trip to Italy.', thumbnailUrl: 'https://picsum.photos/400/225?random=13', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 14, title: 'American Sign Language (ASL) Basics', description: 'Learn the alphabet and basic signs for everyday communication.', thumbnailUrl: 'https://picsum.photos/400/225?random=14', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 15, title: 'Korean Hangul Alphabet', description: 'Learn the simple and logical Korean alphabet in just a few lessons.', thumbnailUrl: 'https://picsum.photos/400/225?random=15', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 16, title: 'Portuguese Pronunciation Guide', description: 'Perfect your accent and sound like a native Portuguese speaker.', thumbnailUrl: 'https://picsum.photos/400/225?random=16', stages: [] },
    ]
  },
  {
    name: 'Writing',
    lessons: [
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 17, title: 'Mastering the Essay', description: 'Structure, write, and edit powerful academic essays.', thumbnailUrl: 'https://picsum.photos/400/225?random=17', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 18, title: 'Copywriting for Marketers', description: 'Write persuasive copy that converts readers into customers.', thumbnailUrl: 'https://picsum.photos/400/225?random=18', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 19, title: 'Poetry: Finding Your Voice', description: 'Explore different poetic forms and develop your unique style.', thumbnailUrl: 'https://picsum.photos/400/225?random=19', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 20, title: 'Business Writing & Communication', description: 'Compose professional emails, reports, and presentations.', thumbnailUrl: 'https://picsum.photos/400/225?random=20', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 21, title: 'Fiction: Building Worlds', description: 'Learn the art of world-building for your fantasy or sci-fi novel.', thumbnailUrl: 'https://picsum.photos/400/225?random=21', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 22, title: 'Technical Writing Simplified', description: 'Communicate complex information clearly and concisely.', thumbnailUrl: 'https://picsum.photos/400/225?random=22', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 23, title: 'Journaling for Clarity', description: 'Use journaling as a tool for self-reflection and personal growth.', thumbnailUrl: 'https://picsum.photos/400/225?random=23', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 24, title: 'Editing and Proofreading', description: 'Polish your writing to perfection by catching common errors.', thumbnailUrl: 'https://picsum.photos/400/225?random=24', stages: [] },
    ]
  },
  {
    name: 'Coding',
    lessons: [
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 25, title: 'JavaScript for Beginners', description: 'Learn the language of the web and build interactive websites.', thumbnailUrl: 'https://picsum.photos/400/225?random=25', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 26, title: 'React: Build Modern UIs', description: 'Create dynamic user interfaces with the popular React library.', thumbnailUrl: 'https://picsum.photos/400/225?random=26', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 27, title: 'Data Structures in Python', description: 'Understand fundamental data structures like arrays, lists, and maps.', thumbnailUrl: 'https://picsum.photos/400/225?random=27', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 28, title: 'Introduction to SQL', description: 'Learn to manage and query databases using the SQL language.', thumbnailUrl: 'https://picsum.photos/400/225?random=28', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 29, title: 'Git & GitHub Crash Course', description: 'Master version control to collaborate effectively on code.', thumbnailUrl: 'https://picsum.photos/400/225?random=29', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 30, title: 'CSS Flexbox & Grid', description: 'Create complex and responsive web layouts with modern CSS.', thumbnailUrl: 'https://picsum.photos/400/225?random=30', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 31, title: 'API Basics with Node.js', description: 'Build your first backend API using Node.js and Express.', thumbnailUrl: 'https://picsum.photos/400/225?random=31', stages: [] },
      // FIX: Added missing 'stages' property to satisfy the Lesson type.
      { id: 32, title: 'Tailwind CSS From Scratch', description: 'A utility-first approach to rapidly building modern websites.', thumbnailUrl: 'https://picsum.photos/400/225?random=32', stages: [] },
    ]
  },
];