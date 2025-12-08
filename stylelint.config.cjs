module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-prettier', // evita conflictos con Prettier
  ],
  rules: {
    // reglas que puedes ajustar a tu gusto
    'color-hex-case': 'lower',
    'block-no-empty': true,
  },
  ignoreFiles: ['dist/**/*', 'build/**/*'],
};
