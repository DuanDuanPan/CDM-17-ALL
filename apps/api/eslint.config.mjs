import baseConfig from '@cdm/config/eslint';

export default [
    ...baseConfig,
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    /**
     * Story 7.1: Backend Repository Pattern Refactor
     * Prohibit direct prisma imports in Services and Controllers.
     * Data access should go through Repository classes.
     *
     * Allowed locations:
     * - *.repository.ts files
     * - Database package internals
     *
     * Note: Set to "warn" during migration, change to "error" after validation
     */
    {
        files: ['**/*.service.ts', '**/*.controller.ts'],
        rules: {
            'no-restricted-imports': [
                'warn',
                {
                    paths: [
                        {
                            name: '@cdm/database',
                            importNames: ['prisma'],
                            message:
                                'Direct prisma import is prohibited in Services/Controllers. Use Repository pattern instead.',
                        },
                    ],
                },
            ],
        },
    },
];
