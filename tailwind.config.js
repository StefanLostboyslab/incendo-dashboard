/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                tron: {
                    bg: '#050a14', // Very dark blue/black
                    panel: 'rgba(12, 24, 40, 0.7)', // Glass panel
                    cyan: '#00f3ff', // Main neon cyan
                    cyanHover: '#00c7d1',
                    border: '#1a3a5f',
                    text: '#e2e8f0',
                    muted: '#94a3b8',
                    success: '#00ffa3', // Neon green
                    error: '#ff0055', // Neon red/pink
                }
            },
            fontFamily: {
                orbitron: ['"Orbitron"', 'sans-serif'], // We might need to import this or use a system equivalent for now
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                'neon-cyan': '0 0 5px #00f3ff, 0 0 10px #00f3ff33',
                'neon-green': '0 0 5px #00ffa3, 0 0 10px #00ffa333',
            }
        },
    },
    plugins: [],
}
