/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  transform: {
    "^.+\\.[tj]s$": "ts-jest",
  },
  globals: {
    "ts-jest": {
      tsconfig: {
        allowJs: true,
      },
    },
  },
  moduleNameMapper: {
    "d3-color": "<rootDir>/node_modules/d3-color/dist/d3-color.min.js",
    "d3-interpolate":
      "<rootDir>/node_modules/d3-interpolate/dist/d3-interpolate.min.js",
    "d3-scale-chromatic":
      "<rootDir>/node_modules/d3-scale-chromatic/dist/d3-scale-chromatic.min.js",
  },
};
