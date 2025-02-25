import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import dts from "vite-plugin-dts"
import path from 'node:path'


// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, './lib/index.ts'),
            name: "hi-design",
            fileName: format => `index.${format}.js`
        },
        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM'
                }
            }
        },
        sourcemap: "inline",
        watch: {}
    },
    plugins: [
        react(),
        dts({
            rollupTypes: true,
            tsconfigPath: path.resolve(__dirname, './tsconfig.app.json')
        })
    ]
})
