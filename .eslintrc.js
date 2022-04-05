module.exports = {
  extends: [
    'eslint:recommended',

    // @see https://github.com/getify/eslint-plugin-proper-ternary
    "plugin:@getify/proper-ternary/getify-says",
  ],

  overrides: [
    {
      files: ['*.js'],
      // NOTE(dabrady) Jest takes advantage of some ES6 syntax which I usually avoid in order to provide some nice,
      // concise test semantics, so I'm excluding them from certain rule enforcement.
      excludedFiles: 'tests/**/*.js',
      extends: [
        // @see https://github.com/getify/eslint-plugin-proper-arrows
        "plugin:@getify/proper-arrows/getify-says"
      ]
    }
  ],

  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },

  env: {
    browser: true,
    node: true,
    es6: true
    ,
  },

  rules: {
    // NOTE(dabrady) Double-equals has its place: triple-equals should not be the only comparator.
    eqeqeq: 'off',
    // NOTE(dabrady) Fallthrough is one of the main reasons to _use_ `switch` statements. Let it be.
    noFallthrough: 'off',
  }
};
