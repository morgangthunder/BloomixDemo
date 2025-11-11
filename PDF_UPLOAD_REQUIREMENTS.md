# PDF Upload Implementation Requirements

**Status:** Deferred for post-MVP  
**Priority:** Medium  
**Estimated Effort:** 2-3 days

---

## Overview

Implement PDF upload with page preview, selection, and size validation to support lesson content creation from PDF documents.

---

## Key Features

### 1. PDF Preview & Page Selection

**User Flow:**
1. User selects PDF file (or provides URL)
2. PDF renders with thumbnails of all pages
3. User can:
   - Select "All Pages"
   - Enter page ranges (e.g., "1-5, 10, 15-20")
   - Click individual page thumbnails to toggle selection
4. Selected pages are highlighted
5. Token count is estimated and displayed

**UI Components:**
- PDF thumbnail grid (responsive, 4-6 per row on desktop, 2-3 on mobile)
- Page range input field with validation
- "Select All" / "Deselect All" buttons
- Token estimate display with warning indicators

### 2. Size Validation

**Grok 3 Mini Limits:**
- **Max Context Window:** 128,000 tokens
- **Safe Limit (with headroom for response):** 100,000 tokens
- **Typical Token-to-Word Ratio:** ~1.3 tokens per word
- **Estimated Pages:** ~200 pages of standard text (assuming ~500 words/page)

**Validation Rules:**
| Metric | Limit | Action if Exceeded |
|--------|-------|-------------------|
| File Size | 50 MB | Block upload, show error |
| Estimated Tokens | 100,000 | Disable "All Pages", require page selection |
| Selected Tokens | 100,000 | Show error, prevent submission |

**Token Estimation:**
```typescript
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

function estimatePageTokens(pageCount: number, avgWordsPerPage: number = 500): number {
  const totalWords = pageCount * avgWordsPerPage;
  return Math.ceil(totalWords * 1.3); // 1.3 tokens per word
}
```

### 3. Text Extraction

**Approach:**
- Use **PDF.js** (Mozilla's library) for client-side rendering and text extraction
- Extract text from selected pages only
- Preserve layout and structure where possible
- Handle scanned PDFs (OCR) via backend (Tesseract.js or AWS Textract)

**Installation:**
```bash
npm install pdfjs-dist
```

**Basic Usage:**
```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.js';

async function loadPDF(file: File): Promise<PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

async function extractTextFromPage(page: PDFPageProxy): Promise<string> {
  const textContent = await page.getTextContent();
  return textContent.items.map((item: any) => item.str).join(' ');
}

async function renderPageThumbnail(page: PDFPageProxy, canvas: HTMLCanvasElement) {
  const viewport = page.getViewport({ scale: 0.2 }); // Thumbnail scale
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({ canvasContext: context, viewport }).promise;
}
```

---

## Implementation Breakdown

### Phase 1: Basic Upload & Preview (Day 1)
- [x] File input validation (type, size)
- [ ] Load PDF with PDF.js
- [ ] Display page count
- [ ] Show first page thumbnail as preview
- [ ] Extract text from all pages (background)

### Phase 2: Page Selection UI (Day 2)
- [ ] Render thumbnails for all pages (lazy-load)
- [ ] Implement page range input parser (e.g., "1-5, 10, 15-20")
- [ ] Add click-to-toggle selection on thumbnails
- [ ] Highlight selected pages
- [ ] Show selected page count and estimated tokens

### Phase 3: Validation & Processing (Day 3)
- [ ] Real-time token estimation
- [ ] Enforce 100k token limit with warnings
- [ ] Disable "All Pages" if exceeds limit
- [ ] Extract text from selected pages only
- [ ] Send extracted text to backend for processing
- [ ] Progress indicator for large PDFs

### Phase 4: Advanced Features (Post-MVP)
- [ ] OCR for scanned PDFs (backend integration)
- [ ] PDF metadata extraction (title, author, keywords)
- [ ] Table of contents auto-detection
- [ ] Image extraction from PDFs
- [ ] Multi-language support

---

## Technical Stack

**Frontend:**
- **PDF.js** (v3.11+): PDF rendering and text extraction
- **Angular Canvas Directive**: For thumbnail rendering
- **Virtual Scrolling** (CDK): For large PDFs with many pages

**Backend:**
- **AWS S3**: PDF file storage
- **AWS Textract** (optional): OCR for scanned PDFs
- **Grok API**: Content analysis after text extraction

---

## User Stories

1. **As a lesson builder**, I want to upload a PDF and select specific pages so that I can process only relevant content.
2. **As a lesson builder**, I want to see token estimates before processing so that I can stay within limits.
3. **As a lesson builder**, I want to preview PDF pages as thumbnails so that I can visually identify which pages to include.
4. **As a lesson builder**, I want to enter page ranges (e.g., "1-5, 10") so that I can quickly select non-contiguous pages.

---

## Alternative: Simple Page Range Input (MVP Fallback)

If full PDF.js integration is too complex for MVP, use this simpler approach:

**UI:**
```
[Upload PDF File]
📄 filename.pdf (15 MB, 45 pages)

Page Selection:
( ) All Pages (estimated 35,000 tokens)
( ) Page Range: [1-10, 15, 20-25]

[Extract & Process]
```

**Pros:**
- Much simpler to implement
- No PDF.js dependency
- Lighter frontend

**Cons:**
- No visual preview
- User must know page numbers in advance
- Less intuitive

---

## Next Steps

1. Install PDF.js: `npm install pdfjs-dist`
2. Add PDF.js worker to `assets/` folder
3. Create `PdfViewerComponent` with thumbnail grid
4. Integrate with `AddPdfModalComponent`
5. Test with various PDFs (small, large, scanned)
6. Add E2E tests for page selection and token validation

---

## Notes

- **Defer for Post-MVP**: Focus on text content upload for initial E2E testing
- **Estimated Timeline**: 2-3 days for full implementation
- **Risk**: PDF.js bundle size (~1.5 MB) - may need lazy loading
- **Alternative**: Backend-only PDF processing (simpler but slower UX)

