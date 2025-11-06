import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class ContentValidationService {
  private apiUrl = `${environment.apiUrl}/lesson-editor`;

  constructor(private http: HttpClient) {}

  /**
   * Validate content for a specific interaction type
   */
  validateContentForInteraction(
    lessonId: string,
    contentId: string,
    interactionType: string
  ): Observable<ValidationResult> {
    return this.http.get<ValidationResult>(
      `${this.apiUrl}/lessons/${lessonId}/validate-content/${contentId}?interactionType=${interactionType}`
    );
  }

  /**
   * Get all available interaction types
   */
  getInteractionTypes(): Observable<InteractionType[]> {
    return this.http.get<InteractionType[]>(`${this.apiUrl}/interaction-types`);
  }

  /**
   * Add a new interaction type
   */
  addInteractionType(interactionType: InteractionType): Observable<any> {
    return this.http.post(`${this.apiUrl}/interaction-types`, interactionType);
  }

  /**
   * Remove an interaction type
   */
  removeInteractionType(interactionTypeId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/interaction-types/${interactionTypeId}`);
  }

  /**
   * Get accepted content types for an interaction
   */
  getAcceptedContentTypes(interactionTypeId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/interaction-types/${interactionTypeId}/accepted-content-types`);
  }

  /**
   * Validate content structure locally (client-side validation)
   */
  validateContentStructure(
    content: any,
    interactionType: InteractionType
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if content type is accepted
    if (!interactionType.acceptedContentTypes.includes(content.type)) {
      errors.push({
        field: 'type',
        message: `Content type '${content.type}' is not accepted by interaction '${interactionType.name}'`,
        code: 'INVALID_CONTENT_TYPE',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // Find validation rules for this content type
    const validationRule = interactionType.validationRules.find(
      rule => rule.contentType === content.type
    );

    if (!validationRule) {
      errors.push({
        field: 'type',
        message: `No validation rules found for content type '${content.type}'`,
        code: 'NO_VALIDATION_RULES',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate required fields
    for (const requiredField of validationRule.required) {
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
    for (const fieldRule of validationRule.fieldRules) {
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
}
