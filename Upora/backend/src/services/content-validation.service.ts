import { Injectable } from '@nestjs/common';

export interface InteractionType {
  id: string;
  name: string;
  description: string;
  acceptedContentTypes: string[];
  validationRules: ContentValidationRule[];
}

export interface ContentValidationRule {
  contentType: string;
  required: string[];
  optional: string[];
  fieldRules: FieldValidationRule[];
}

export interface FieldValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

@Injectable()
export class ContentValidationService {
  private interactionTypes: Map<string, InteractionType> = new Map();
  private contentTypeSchemas: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultInteractionTypes();
  }

  /**
   * Initialize default interaction types
   */
  private initializeDefaultInteractionTypes(): void {
    // Quiz Interaction
    this.addInteractionType({
      id: 'quiz_interaction',
      name: 'Interactive Quiz',
      description: 'Multiple choice, true/false, and fill-in-the-blank questions',
      acceptedContentTypes: ['quiz', 'qa_pairs'],
      validationRules: [
        {
          contentType: 'quiz',
          required: ['questions', 'totalPoints', 'passingScore'],
          optional: ['timeLimit'],
          fieldRules: [
            {
              field: 'questions',
              type: 'array',
              required: true,
              minLength: 1
            },
            {
              field: 'totalPoints',
              type: 'number',
              required: true
            },
            {
              field: 'passingScore',
              type: 'number',
              required: true
            }
          ]
        },
        {
          contentType: 'qa_pairs',
          required: ['questions'],
          optional: [],
          fieldRules: [
            {
              field: 'questions',
              type: 'array',
              required: true,
              minLength: 1
            }
          ]
        }
      ]
    });

    // Code Editor Interaction
    this.addInteractionType({
      id: 'code_editor',
      name: 'Interactive Code Editor',
      description: 'Code editing with syntax highlighting and testing',
      acceptedContentTypes: ['exercises', 'code_examples'],
      validationRules: [
        {
          contentType: 'exercises',
          required: ['problems'],
          optional: [],
          fieldRules: [
            {
              field: 'problems',
              type: 'array',
              required: true,
              minLength: 1
            },
            {
              field: 'problems[].solution',
              type: 'string',
              required: true,
              minLength: 1
            }
          ]
        },
        {
          contentType: 'code_examples',
          required: ['examples'],
          optional: [],
          fieldRules: [
            {
              field: 'examples',
              type: 'array',
              required: true,
              minLength: 1
            },
            {
              field: 'examples[].code',
              type: 'string',
              required: true,
              minLength: 1
            }
          ]
        }
      ]
    });

    // Summary Display Interaction
    this.addInteractionType({
      id: 'summary_display',
      name: 'Summary Display',
      description: 'Display text summaries with key points',
      acceptedContentTypes: ['summary'],
      validationRules: [
        {
          contentType: 'summary',
          required: ['text', 'keyPoints'],
          optional: ['wordCount', 'readingTime'],
          fieldRules: [
            {
              field: 'text',
              type: 'string',
              required: true,
              minLength: 10
            },
            {
              field: 'keyPoints',
              type: 'array',
              required: true,
              minLength: 1
            }
          ]
        }
      ]
    });

    // Facts Display Interaction
    this.addInteractionType({
      id: 'facts_display',
      name: 'Facts Display',
      description: 'Display categorized facts and information',
      acceptedContentTypes: ['facts'],
      validationRules: [
        {
          contentType: 'facts',
          required: ['items'],
          optional: [],
          fieldRules: [
            {
              field: 'items',
              type: 'array',
              required: true,
              minLength: 1
            },
            {
              field: 'items[].fact',
              type: 'string',
              required: true,
              minLength: 5
            }
          ]
        }
      ]
    });
  }

  /**
   * Add a new interaction type
   */
  addInteractionType(interactionType: InteractionType): void {
    this.interactionTypes.set(interactionType.id, interactionType);
  }

  /**
   * Remove an interaction type
   */
  removeInteractionType(interactionTypeId: string): void {
    this.interactionTypes.delete(interactionTypeId);
  }

  /**
   * Get all interaction types
   */
  getAllInteractionTypes(): InteractionType[] {
    return Array.from(this.interactionTypes.values());
  }

  /**
   * Get interaction type by ID
   */
  getInteractionType(interactionTypeId: string): InteractionType | null {
    return this.interactionTypes.get(interactionTypeId) || null;
  }

  /**
   * Validate content for a specific interaction type
   */
  validateContentForInteraction(
    content: any,
    interactionTypeId: string
  ): ValidationResult {
    const interactionType = this.getInteractionType(interactionTypeId);
    
    if (!interactionType) {
      return {
        isValid: false,
        errors: [{
          field: 'interactionType',
          message: `Interaction type '${interactionTypeId}' not found`,
          code: 'INTERACTION_TYPE_NOT_FOUND',
          severity: 'error'
        }],
        warnings: []
      };
    }

    // Check if content type is accepted
    if (!interactionType.acceptedContentTypes.includes(content.type)) {
      return {
        isValid: false,
        errors: [{
          field: 'type',
          message: `Content type '${content.type}' is not accepted by interaction '${interactionType.name}'. Accepted types: ${interactionType.acceptedContentTypes.join(', ')}`,
          code: 'INVALID_CONTENT_TYPE',
          severity: 'error'
        }],
        warnings: []
      };
    }

    // Find validation rules for this content type
    const validationRule = interactionType.validationRules.find(
      rule => rule.contentType === content.type
    );

    if (!validationRule) {
      return {
        isValid: false,
        errors: [{
          field: 'type',
          message: `No validation rules found for content type '${content.type}'`,
          code: 'NO_VALIDATION_RULES',
          severity: 'error'
        }],
        warnings: []
      };
    }

    // Validate the content
    return this.validateContentAgainstRules(content, validationRule);
  }

  /**
   * Validate content against specific rules
   */
  private validateContentAgainstRules(
    content: any,
    rules: ContentValidationRule
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    for (const requiredField of rules.required) {
      if (!this.hasField(content, requiredField)) {
        errors.push({
          field: requiredField,
          message: `Required field '${requiredField}' is missing`,
          code: 'REQUIRED_FIELD_MISSING',
          severity: 'error'
        });
      }
    }

    // Validate field rules
    for (const fieldRule of rules.fieldRules) {
      const fieldValue = this.getFieldValue(content, fieldRule.field);
      
      if (fieldRule.required && (fieldValue === undefined || fieldValue === null)) {
        errors.push({
          field: fieldRule.field,
          message: `Required field '${fieldRule.field}' is missing`,
          code: 'REQUIRED_FIELD_MISSING',
          severity: 'error'
        });
        continue;
      }

      if (fieldValue !== undefined && fieldValue !== null) {
        const fieldValidation = this.validateField(fieldValue, fieldRule);
        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single field
   */
  private validateField(
    value: any,
    rule: FieldValidationRule
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Type validation
    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push({
        field: rule.field,
        message: `Field '${rule.field}' must be a string`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else if (rule.type === 'number' && typeof value !== 'number') {
      errors.push({
        field: rule.field,
        message: `Field '${rule.field}' must be a number`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({
        field: rule.field,
        message: `Field '${rule.field}' must be a boolean`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else if (rule.type === 'array' && !Array.isArray(value)) {
      errors.push({
        field: rule.field,
        message: `Field '${rule.field}' must be an array`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push({
        field: rule.field,
        message: `Field '${rule.field}' must be an object`,
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }

    // Length validation for strings and arrays
    if ((rule.type === 'string' || rule.type === 'array') && typeof value === rule.type) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `Field '${rule.field}' must have at least ${rule.minLength} items`,
          code: 'MIN_LENGTH_VIOLATION',
          severity: 'error'
        });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        warnings.push({
          field: rule.field,
          message: `Field '${rule.field}' has more than ${rule.maxLength} items`,
          code: 'MAX_LENGTH_WARNING'
        });
      }
    }

    // Pattern validation for strings
    if (rule.type === 'string' && typeof value === 'string' && rule.pattern) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: rule.field,
          message: `Field '${rule.field}' does not match required pattern`,
          code: 'PATTERN_VIOLATION',
          severity: 'error'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Check if content has a specific field
   */
  private hasField(content: any, fieldPath: string): boolean {
    return this.getFieldValue(content, fieldPath) !== undefined;
  }

  /**
   * Get field value using dot notation
   */
  private getFieldValue(content: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current = content;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      if (part.includes('[') && part.includes(']')) {
        // Handle array access like 'items[0]'
        const fieldName = part.substring(0, part.indexOf('['));
        const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')));
        
        if (current[fieldName] && Array.isArray(current[fieldName])) {
          current = current[fieldName][index];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Get all accepted content types for an interaction
   */
  getAcceptedContentTypes(interactionTypeId: string): string[] {
    const interactionType = this.getInteractionType(interactionTypeId);
    return interactionType ? interactionType.acceptedContentTypes : [];
  }

  /**
   * Get validation rules for a content type and interaction
   */
  getValidationRules(interactionTypeId: string, contentType: string): ContentValidationRule | null {
    const interactionType = this.getInteractionType(interactionTypeId);
    if (!interactionType) return null;
    
    return interactionType.validationRules.find(rule => rule.contentType === contentType) || null;
  }
}


