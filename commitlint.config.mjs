/* eslint-disable import/no-anonymous-default-export */
export default {extends: ['@commitlint/config-conventional'], rules: {'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert', 'wip']], 'header-max-length': [2, 'always', 1000],}};
