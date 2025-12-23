import baseConfig from '@cdm/config/eslint';

export default [
    ...baseConfig,
    {
        ignores: ['dist/**', 'prisma/generated/**'],
    },
];
