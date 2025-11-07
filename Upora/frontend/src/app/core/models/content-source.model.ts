export interface ContentSource {
  id: string;
  tenantId: string;
  type: 'url' | 'pdf' | 'image' | 'api' | 'text';
  sourceUrl?: string;
  filePath?: string;
  title?: string;
  summary?: string;
  fullText?: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: {
    topics?: string[];
    keywords?: string[];
    fileSize?: number;
    mimeType?: string;
    pageCount?: number;
    extractedDate?: string;
    [key: string]: any;
  };
  weaviateId?: string;
  createdBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt?: string;
  approvedAt?: string;
  updatedAt?: string;
  creator?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  lessonCount?: number;
  lessons?: Array<{
    id: string;
    title: string;
  }>;
}

export interface SearchResult {
  id: string;
  contentSourceId: string;
  title: string;
  summary: string;
  topics: string[];
  keywords: string[];
  sourceUrl?: string;
  relevanceScore: number;
  distance: number;
  contentSource?: ContentSource;
}

export interface LessonDataLink {
  id: string;
  lessonId: string;
  contentSourceId: string;
  relevanceScore: number;
  useInContext: boolean;
  linkedAt: string;
}

