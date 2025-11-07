import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';

export interface ContentSummaryData {
  contentSourceId: string;
  tenantId: string;
  summary: string;
  fullText?: string;
  topics?: string[];
  keywords?: string[];
  type: string;
  status: string;
  title?: string;
  sourceUrl?: string;
  contentCategory?: 'source_content' | 'processed_content'; // NEW: Distinguish content types
  videoId?: string; // NEW: For YouTube videos
  channel?: string; // NEW: For YouTube channel
  transcript?: string; // NEW: For video transcripts
}

export interface SemanticSearchQuery {
  query: string;
  tenantId: string;
  limit?: number;
  offset?: number;
  filters?: {
    type?: string;
    status?: string;
    linkedToLesson?: string;
  };
}

export interface SemanticSearchResult {
  id: string;
  contentSourceId: string;
  summary: string;
  fullText?: string;
  topics: string[];
  keywords: string[];
  title: string;
  sourceUrl?: string;
  contentCategory?: 'source_content' | 'processed_content';
  videoId?: string;
  channel?: string;
  transcript?: string;
  relevanceScore: number;
  distance: number;
}

/**
 * Weaviate Service - Vector database client for semantic search
 */
@Injectable()
export class WeaviateService implements OnModuleInit {
  private logger = new Logger('WeaviateService');
  private client: WeaviateClient;
  private readonly className = 'ContentSummary';
  private isInitialized = false;

  constructor() {
    // Initialize Weaviate client
    const host = process.env.WEAVIATE_HOST || 'localhost';
    const port = process.env.WEAVIATE_PORT || '8080';
    const scheme = process.env.WEAVIATE_SCHEME || 'http';

    this.logger.log(`Connecting to Weaviate at ${scheme}://${host}:${port}`);

    this.client = weaviate.client({
      scheme: scheme,
      host: `${host}:${port}`,
    });
  }

  async onModuleInit() {
    try {
      await this.initializeSchema();
      this.isInitialized = true;
      this.logger.log('✅ Weaviate initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Weaviate:', error.message);
      this.logger.warn('⚠️ Weaviate operations will be disabled');
    }
  }

  /**
   * Initialize Weaviate schema if it doesn't exist
   */
  private async initializeSchema() {
    try {
      // Check if class already exists
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some(c => c.class === this.className);

      if (!classExists) {
        this.logger.log(`Creating Weaviate class: ${this.className}`);

        const classObj = {
          class: this.className,
          description: 'Content summaries for semantic search',
          vectorizer: 'none', // We'll add embeddings later or use text2vec module
          properties: [
            {
              name: 'contentSourceId',
              dataType: ['text'],
              description: 'PostgreSQL content source UUID',
            },
            {
              name: 'tenantId',
              dataType: ['text'],
              description: 'Tenant UUID for multi-tenancy',
            },
            {
              name: 'summary',
              dataType: ['text'],
              description: 'Content summary for semantic search',
            },
            {
              name: 'fullText',
              dataType: ['text'],
              description: 'Full extracted text content',
            },
            {
              name: 'topics',
              dataType: ['text[]'],
              description: 'Extracted topics/categories',
            },
            {
              name: 'keywords',
              dataType: ['text[]'],
              description: 'Extracted keywords',
            },
            {
              name: 'type',
              dataType: ['text'],
              description: 'Content type: url, pdf, image, etc.',
            },
            {
              name: 'status',
              dataType: ['text'],
              description: 'Approval status: pending, approved, rejected',
            },
            {
              name: 'title',
              dataType: ['text'],
              description: 'Content title',
            },
            {
              name: 'sourceUrl',
              dataType: ['text'],
              description: 'Original URL if applicable',
            },
            {
              name: 'contentCategory',
              dataType: ['text'],
              description: 'Category: source_content or processed_content',
            },
            {
              name: 'videoId',
              dataType: ['text'],
              description: 'YouTube video ID if applicable',
            },
            {
              name: 'channel',
              dataType: ['text'],
              description: 'YouTube channel name if applicable',
            },
            {
              name: 'transcript',
              dataType: ['text'],
              description: 'Video transcript or extracted text',
            },
          ],
        };

        await this.client.schema.classCreator().withClass(classObj).do();
        this.logger.log(`✅ Created Weaviate class: ${this.className}`);
      } else {
        this.logger.log(`✅ Weaviate class ${this.className} already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize schema: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index content in Weaviate
   */
  async indexContent(data: ContentSummaryData): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Weaviate is not initialized');
    }

    try {
      this.logger.log(`Indexing content: ${data.contentSourceId}`);

      const result = await this.client.data
        .creator()
        .withClassName(this.className)
        .withProperties({
          contentSourceId: data.contentSourceId,
          tenantId: data.tenantId,
          summary: data.summary || '',
          fullText: data.fullText || '',
          topics: data.topics || [],
          keywords: data.keywords || [],
          type: data.type,
          status: data.status,
          title: data.title || '',
          sourceUrl: data.sourceUrl || '',
          contentCategory: data.contentCategory || 'source_content',
          videoId: data.videoId || '',
          channel: data.channel || '',
          transcript: data.transcript || '',
        })
        .do();

      const weaviateId = result.id || '';
      this.logger.log(`✅ Indexed content with Weaviate ID: ${weaviateId}`);
      return weaviateId;
    } catch (error) {
      this.logger.error(`Failed to index content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update indexed content
   */
  async updateContent(weaviateId: string, data: Partial<ContentSummaryData>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Weaviate is not initialized');
    }

    try {
      this.logger.log(`Updating Weaviate object: ${weaviateId}`);

      await this.client.data
        .updater()
        .withId(weaviateId)
        .withClassName(this.className)
        .withProperties(data)
        .do();

      this.logger.log(`✅ Updated Weaviate object: ${weaviateId}`);
    } catch (error) {
      this.logger.error(`Failed to update content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete content from Weaviate
   */
  async deleteContent(weaviateId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Weaviate is not initialized');
    }

    try {
      this.logger.log(`Deleting Weaviate object: ${weaviateId}`);

      await this.client.data
        .deleter()
        .withId(weaviateId)
        .withClassName(this.className)
        .do();

      this.logger.log(`✅ Deleted Weaviate object: ${weaviateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Semantic search using BM25 keyword search (MVP - no vectors needed)
   * TODO: Upgrade to vector search in Phase 6 when OpenAI vectorizer is enabled
   */
  async semanticSearch(searchQuery: SemanticSearchQuery): Promise<SemanticSearchResult[]> {
    if (!this.isInitialized) {
      this.logger.warn('Weaviate not initialized, returning empty results');
      return [];
    }

    try {
      this.logger.log(`BM25 keyword search: "${searchQuery.query}" for tenant ${searchQuery.tenantId}`);

      // Build where filters
      const whereFilters: any[] = [
        {
          path: ['tenantId'],
          operator: 'Equal',
          valueText: searchQuery.tenantId,
        }
      ];

      // Add status filter (only approved by default)
      if (!searchQuery.filters?.status) {
        whereFilters.push({
          path: ['status'],
          operator: 'Equal',
          valueText: 'approved',
        });
      }

      // Add type filter if specified
      if (searchQuery.filters?.type) {
        whereFilters.push({
          path: ['type'],
          operator: 'Equal',
          valueText: searchQuery.filters.type,
        });
      }

      // Use BM25 keyword search (works without vectors)
      // Now searches across ALL fields including transcript, channel, etc.
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('contentSourceId tenantId summary fullText topics keywords type status title sourceUrl contentCategory videoId channel transcript _additional { score }')
        .withBm25({ 
          query: searchQuery.query,
          properties: ['summary', 'fullText', 'title', 'keywords', 'topics', 'transcript', 'channel']
        })
        .withWhere({
          operator: 'And',
          operands: whereFilters,
        })
        .withLimit(searchQuery.limit || 10)
        .withOffset(searchQuery.offset || 0)
        .do();

      const items = result.data?.Get?.[this.className] || [];

      const searchResults: SemanticSearchResult[] = items.map((item: any) => ({
        id: item.contentSourceId,
        contentSourceId: item.contentSourceId,
        summary: item.summary,
        fullText: item.fullText,
        topics: item.topics || [],
        keywords: item.keywords || [],
        title: item.title,
        sourceUrl: item.sourceUrl,
        contentCategory: item.contentCategory || 'source_content',
        videoId: item.videoId,
        channel: item.channel,
        transcript: item.transcript,
        distance: 0,
        relevanceScore: item._additional?.score || 0, // BM25 score (higher is better)
      }));

      this.logger.log(`✅ Found ${searchResults.length} results`);
      return searchResults;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get content linked to a specific lesson
   */
  async getLinkedContent(lessonId: string, tenantId: string): Promise<SemanticSearchResult[]> {
    // This will be implemented when we have lesson-content links
    // For now, return empty array
    return [];
  }

  /**
   * Check if Weaviate is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.misc.liveChecker().do();
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get Weaviate meta information
   */
  async getMeta() {
    try {
      return await this.client.misc.metaGetter().do();
    } catch (error) {
      this.logger.error(`Failed to get meta: ${error.message}`);
      return null;
    }
  }
}

