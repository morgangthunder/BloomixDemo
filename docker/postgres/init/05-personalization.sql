-- Phase 2: User Personalisation & Curated Lists
-- Tables for onboarding preferences and personalization options

-- =====================================================
-- USER PERSONALIZATION
-- =====================================================
CREATE TABLE user_personalization (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    age_range VARCHAR(20),           -- e.g. '18-24', '25-34', '35-44', 'prefer_not'
    gender VARCHAR(50),              -- e.g. 'male', 'female', 'non_binary', 'prefer_not'
    favourite_tv_movies TEXT[] DEFAULT '{}',   -- IDs/slugs from curated list
    hobbies_interests TEXT[] DEFAULT '{}',     -- IDs from curated list
    learning_areas TEXT[] DEFAULT '{}',        -- e.g. 'languages', 'science', 'history'
    onboarding_completed_at TIMESTAMP,
    skipped_onboarding BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_personalization_user_id ON user_personalization(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_personalization_updated_at BEFORE UPDATE ON user_personalization
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERSONALIZATION OPTIONS (Curated Lists)
-- =====================================================
CREATE TABLE personalization_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL UNIQUE,  -- 'tv_movies', 'hobbies', 'learning_areas'
    options JSONB NOT NULL DEFAULT '[]',   -- [{id: "slug", label: "Display Name"}, ...]
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_personalization_options_updated_at BEFORE UPDATE ON personalization_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED: Curated Lists
-- =====================================================

-- TV/Movies (~28 popular titles, incl. classics like Breaking Bad, Sopranos)
INSERT INTO personalization_options (category, options) VALUES
('tv_movies', '[
  {"id": "breaking_bad", "label": "Breaking Bad"},
  {"id": "the_sopranos", "label": "The Sopranos"},
  {"id": "game_of_thrones", "label": "Game of Thrones"},
  {"id": "the_office", "label": "The Office"},
  {"id": "friends", "label": "Friends"},
  {"id": "stranger_things", "label": "Stranger Things"},
  {"id": "seinfeld", "label": "Seinfeld"},
  {"id": "succession", "label": "Succession"},
  {"id": "lotr", "label": "Lord of the Rings"},
  {"id": "harry_potter", "label": "Harry Potter"},
  {"id": "marvel", "label": "Marvel Cinematic Universe"},
  {"id": "star_wars", "label": "Star Wars"},
  {"id": "squid_game", "label": "Squid Game"},
  {"id": "dark", "label": "Dark"},
  {"id": "black_mirror", "label": "Black Mirror"},
  {"id": "the_bear", "label": "The Bear"},
  {"id": "ted_lasso", "label": "Ted Lasso"},
  {"id": "the_crown", "label": "The Crown"},
  {"id": "last_of_us", "label": "The Last of Us"},
  {"id": "documentaries", "label": "Documentaries"},
  {"id": "sci_fi", "label": "Sci-Fi"},
  {"id": "fantasy", "label": "Fantasy"},
  {"id": "comedy", "label": "Comedy"},
  {"id": "drama", "label": "Drama"},
  {"id": "thriller", "label": "Thriller"},
  {"id": "action", "label": "Action"}
]'::jsonb);

-- Hobbies/Interests (~32 items, incl. Football)
INSERT INTO personalization_options (category, options) VALUES
('hobbies', '[
  {"id": "football", "label": "Football"},
  {"id": "gaming", "label": "Gaming"},
  {"id": "sports", "label": "Sports"},
  {"id": "music", "label": "Music"},
  {"id": "art", "label": "Art"},
  {"id": "coding", "label": "Coding"},
  {"id": "nature", "label": "Nature"},
  {"id": "reading", "label": "Reading"},
  {"id": "movies", "label": "Movies"},
  {"id": "photography", "label": "Photography"},
  {"id": "cooking", "label": "Cooking"},
  {"id": "travel", "label": "Travel"},
  {"id": "fitness", "label": "Fitness"},
  {"id": "hiking", "label": "Hiking"},
  {"id": "cycling", "label": "Cycling"},
  {"id": "running", "label": "Running"},
  {"id": "swimming", "label": "Swimming"},
  {"id": "chess", "label": "Chess"},
  {"id": "board_games", "label": "Board Games"},
  {"id": "drawing", "label": "Drawing"},
  {"id": "gardening", "label": "Gardening"},
  {"id": "meditation", "label": "Meditation"},
  {"id": "podcasts", "label": "Podcasts"},
  {"id": "writing", "label": "Writing"},
  {"id": "dancing", "label": "Dancing"},
  {"id": "playing_instruments", "label": "Playing Instruments"},
  {"id": "design", "label": "Design"},
  {"id": "history", "label": "History"},
  {"id": "science", "label": "Science"},
  {"id": "technology", "label": "Technology"}
]'::jsonb);

-- Learning Areas (~20 categories)
INSERT INTO personalization_options (category, options) VALUES
('learning_areas', '[
  {"id": "languages", "label": "Languages"},
  {"id": "science", "label": "Science"},
  {"id": "history", "label": "History"},
  {"id": "maths", "label": "Maths"},
  {"id": "arts", "label": "Arts"},
  {"id": "technology", "label": "Technology"},
  {"id": "business", "label": "Business"},
  {"id": "programming", "label": "Programming"},
  {"id": "data_science", "label": "Data Science"},
  {"id": "ai_ml", "label": "AI & Machine Learning"},
  {"id": "biology", "label": "Biology"},
  {"id": "chemistry", "label": "Chemistry"},
  {"id": "physics", "label": "Physics"},
  {"id": "economics", "label": "Economics"},
  {"id": "psychology", "label": "Psychology"},
  {"id": "philosophy", "label": "Philosophy"},
  {"id": "literature", "label": "Literature"},
  {"id": "geography", "label": "Geography"},
  {"id": "health", "label": "Health & Wellness"},
  {"id": "finance", "label": "Finance"}
]'::jsonb);

GRANT ALL PRIVILEGES ON TABLE user_personalization TO upora_user;
GRANT ALL PRIVILEGES ON TABLE personalization_options TO upora_user;
