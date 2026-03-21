module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'IBM Plex Sans KR'", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 80px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};
