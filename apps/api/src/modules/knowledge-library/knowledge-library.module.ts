/**
 * Story 2.8: Mock Knowledge Library Module
 * Provides mock knowledge resource data for Task node knowledge linking
 */
import { Module } from '@nestjs/common';
import { KnowledgeLibraryController } from './knowledge-library.controller';

@Module({
    controllers: [KnowledgeLibraryController],
    providers: [],
    exports: [],
})
export class KnowledgeLibraryModule { }
