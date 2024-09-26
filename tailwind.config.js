/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        slideUpAndFade: {
          from: { opacity: 0, transform: 'translateY(120%)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeOut: {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
      },
      animation: {
        slideUpAndFade: 'slideUpAndFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        fadeOut: 'fadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addComponents }) {
      addComponents({
        '.btn-blobsey': {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          width: '6em',
          padding: '0.25em',
          cursor: 'pointer',
          color: 'rgb(255, 255, 255)',
          borderRadius: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'transparent',
          outline: 'none',
          height: '2rem',
          lineHeight: '1.25rem',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
          },
          '&:focus': {
            color: 'rgba(255, 255, 255, 1)',
            outline: '1px solid rgba(255, 255, 255, .75)',
            outlineOffset: '-1px',
          },
          '&:disabled': {
            color: 'rgba(255, 255, 255, 0.5)',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            cursor: 'default',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      })
    },
  ],
}

