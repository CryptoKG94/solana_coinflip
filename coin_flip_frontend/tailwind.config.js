module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      container: {
        padding: "1rem",
        center: true,
        screens: {
          lg: "1140px",
          xl: "1140px",
          "2xl": "1300px",
        },
      },
      fontFamily: {
        sans: ["Nunito", " sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#643ADA",
          400: "#322E52",
          500: "#574CA3",
        },
        secondary: {
          DEFAULT: "#FF2AAA",
        },
      },
    },
  },
  plugins: [],
};
