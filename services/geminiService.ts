
import { GoogleGenAI, Type } from "@google/genai";
import type { Category } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.INTEGER, description: "A unique integer ID for the lesson." },
    title: { type: Type.STRING, description: "A concise and engaging title for the lesson." },
    description: { type: Type.STRING, description: "A brief, one or two-sentence summary of the lesson." },
    thumbnailUrl: { type: Type.STRING, description: "A placeholder image URL from picsum.photos with a unique seed, e.g., 'https://picsum.photos/400/225?random=1'." }
  },
  required: ["id", "title", "description", "thumbnailUrl"]
};

const categorySchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the educational category." },
    lessons: {
      type: Type.ARRAY,
      description: "A list of 8 lesson objects within this category.",
      items: lessonSchema,
    }
  },
  required: ["name", "lessons"]
};

const schema = {
  type: Type.ARRAY,
  description: "An array of 5 distinct educational lesson categories.",
  items: categorySchema
};

export const fetchLessonData = async (): Promise<Category[]> => {
  const prompt = `
    Generate a list of 5 diverse and engaging educational lesson categories suitable for a learning platform with a Netflix-style UI.
    For each category, provide exactly 8 lesson objects.
    Each lesson object must include a unique integer id, a captivating title, a short 1-2 sentence description, and a unique placeholder image URL from picsum.photos in the format 'https://picsum.photos/400/225?random=N', where N is a unique integer for every single lesson across all categories.
    Ensure the categories are distinct and cover a range of topics. Example categories could be 'The Secrets of the Cosmos', 'Mastering Digital Photography', 'The Art of Storytelling', 'Financial Literacy for All', and 'Introduction to Python Programming'.
    Return the data strictly as a JSON array matching the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        console.error("Gemini API returned an empty response text.");
        return [];
    }
    
    const parsedData: Category[] = JSON.parse(jsonText);
    return parsedData;

  } catch (error) {
    console.error("Error fetching or parsing data from Gemini API:", error);
    throw new Error("Failed to communicate with the AI model.");
  }
};
