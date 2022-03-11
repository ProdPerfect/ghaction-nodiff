module.exports = {
  extends: [
    'eslint:recommended',

    // @see https://github.com/getify/eslint-plugin-proper-ternary
    "plugin:@getify/proper-ternary/getify-says",
    // @se https://github.com/getify/eslint-plugin-proper-arrows
    "plugin:@getify/proper-arrows/getify-says",
  ],

  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 8,
  },

  env: {
    browser: true,
    node: true,
    es6: true,
  },

  rules: {
    // NOTE(dabrady) Double-equals has its place: triple-equals should not be the only comparator.
    eqeqeq: 'off',
    // NOTE(dabrady) Fallthrough is one of the main reasons to _use_ `switch` statements. Let it be.
    noFallthrough: 'off',
  }
};
