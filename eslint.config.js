import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'dist-gas/**/*', 'node_modules/**/*', 'src/**/*', 'server.ts', 'api/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
