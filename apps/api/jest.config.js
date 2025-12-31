module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@cdm/plugin-mindmap-core/server$':
      '<rootDir>/../../../packages/plugins/plugin-mindmap-core/src/server',
    '^@cdm/plugin-workflow-approval/server$':
      '<rootDir>/../../../packages/plugins/plugin-workflow-approval/src/server',
    '^@cdm/plugin-comments/server$':
      '<rootDir>/../../../packages/plugins/plugin-comments/src/server',
  },
};
