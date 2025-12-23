/**
 * Story 2.9: APP Library Controller
 * Provides REST API for satellite application library
 */

import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { AppLibraryService } from './app-library.service';
import type { AppLibraryEntry } from '@cdm/types';

@Controller('app-library')
export class AppLibraryController {
  constructor(private readonly appLibraryService: AppLibraryService) {}

  /**
   * GET /api/app-library
   * Search/list applications
   *
   * @param q - Optional search query
   * @returns Array of matching applications
   */
  @Get()
  search(@Query('q') q?: string): AppLibraryEntry[] {
    return this.appLibraryService.search(q);
  }

  /**
   * GET /api/app-library/categories
   * Get all unique categories
   */
  @Get('categories')
  getCategories(): string[] {
    return this.appLibraryService.getCategories();
  }

  /**
   * GET /api/app-library/:id
   * Get application by ID
   */
  @Get(':id')
  getById(@Param('id') id: string): AppLibraryEntry {
    const app = this.appLibraryService.findById(id);
    if (!app) {
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }
    return app;
  }
}
