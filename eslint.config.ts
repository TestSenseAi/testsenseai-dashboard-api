export default {
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      extends: ['plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
      rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
      pragma: 'React',
      pragmaFrag: 'React.Fragment',
      runtime: 'automatic',
    },
  },
};
