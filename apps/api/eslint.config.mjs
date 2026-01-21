import baseConfig from '@cdm/config/eslint';

export default [
    ...baseConfig,
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    /**
     * Story 10.3: ESLint 规则收紧 (从 Story 7.1 迁移后升级)
     * Prohibit direct prisma imports in Services and Controllers.
     * Data access should go through Repository classes.
     *
     * Allowed locations:
     * - *.repository.ts files
     * - Database package internals
     *
     * Exceptions (with targeted eslint-disable comments):
     * - demo-seed.service.ts: Demo/seed 脚本允许直接使用 prisma
     * - subscriptions.service.ts: 临时例外，Story 10.7 插件化后删除
     */
    {
        files: ['**/*.service.ts', '**/*.controller.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
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
