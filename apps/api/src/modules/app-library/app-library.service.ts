/**
 * Story 2.9: APP Library Service
 * Provides search and retrieval of satellite applications from mock data
 */

import { Injectable } from '@nestjs/common';
import type { AppLibraryEntry } from '@cdm/types';
import { SATELLITE_APPS } from './mock-data';

@Injectable()
export class AppLibraryService {
  private readonly apps: AppLibraryEntry[] = SATELLITE_APPS;

  /**
   * Search applications by query
   * Matches against name, category, or description
   */
  search(query?: string): AppLibraryEntry[] {
    if (!query?.trim()) {
      return this.apps;
    }

    const lower = query.toLowerCase();
    return this.apps.filter(
      (app) =>
        app.name.toLowerCase().includes(lower) ||
        app.category.toLowerCase().includes(lower) ||
        app.description?.toLowerCase().includes(lower)
    );
  }

  /**
   * Find application by ID
   */
  findById(id: string): AppLibraryEntry | undefined {
    return this.apps.find((app) => app.id === id);
  }

  /**
   * Get all applications
   */
  findAll(): AppLibraryEntry[] {
    return this.apps;
  }

  /**
   * Get applications by category
   */
  findByCategory(category: string): AppLibraryEntry[] {
    const lower = category.toLowerCase();
    return this.apps.filter((app) => app.category.toLowerCase() === lower);
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const categories = new Set(this.apps.map((app) => app.category));
    return Array.from(categories);
  }
}
