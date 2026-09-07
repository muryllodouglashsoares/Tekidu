import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // PWA (instalação + Service Worker). Estratégia deliberadamente
    // conservadora para uma plataforma acadêmica conectada ao Firebase:
    // ver comentários dentro de `workbox` abaixo — só assets estáticos
    // (build do próprio app) recebem cache; Firestore/Auth NUNCA
    // passam pelo Service Worker (network-only, controlado pelo SDK
    // do Firebase, que já tem sua própria política de cache/offline).
    VitePWA({
      // "injectManifest" daria controle total de um SW customizado,
      // mas para o caso da Tekidu (cache só de estáticos + SW de
      // update-on-reload) o "generateSW" do Workbox já resolve com
      // muito menos código para manter — ver ETAPA 2 do prompt
      // ("não implemente manualmente um Service Worker complexo se o
      // plugin resolver adequadamente o problema").
      strategies: "generateSW",
      // registerType "prompt": o novo SW fica em estado "waiting" até
      // o usuário confirmar a atualização (ver PWAUpdatePrompt) — nunca
      // ativa sozinho enquanto o usuário está no meio de um cadastro de
      // aluno ou lançamento de notas (ETAPA 14/15 do prompt).
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "Tekidu — Gestão Escolar",
        short_name: "Tekidu",
        description: "Plataforma de gestão e acompanhamento acadêmico.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        // Mesmas cores da identidade visual atual (ver src/index.css
        // --tk-ink-700 e --tk-paper) — nada inventado.
        theme_color: "#3B5FCF",
        background_color: "#F3F5F9",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icons/icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Só os arquivos gerados pelo build (HTML/CSS/JS/ícones/fontes
        // locais) entram no precache — nunca dados do Firebase.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        // Chunk único acima do limite padrão (ver aviso do build sobre
        // o bundle principal) — sem isso o Workbox ignora o precache
        // desse arquivo silenciosamente.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Nunca cair no fallback de SPA para chamadas de API/Firebase.
        navigateFallbackDenylist: [/^\/__/, /firestore\.googleapis\.com/, /identitytoolkit/],
        runtimeCaching: [
          {
            // Fontes do Google Fonts (CSS): stale-while-revalidate é
            // seguro aqui — não é dado acadêmico, só tipografia.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // IMPORTANTE (ETAPA 5 do prompt): nenhuma entrada aqui cobre
          // firestore.googleapis.com, identitytoolkit.googleapis.com ou
          // qualquer domínio do Firebase — essas requisições passam
          // direto pela rede, controladas pelo próprio SDK do Firebase,
          // nunca pelo Service Worker. Isso evita notas/frequência
          // desatualizadas sendo servidas do cache como se fossem
          // dados atuais.
        ],
        // Evita que o SW antigo continue servindo um index.html que
        // referencia chunks já removidos de um deploy anterior (ver
        // ETAPA 14) — sempre busca o HTML mais recente na rede quando
        // possível, caindo pro cache só se estiver offline de verdade.
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
      },
      devOptions: {
        // SW habilitado em `npm run dev` só para permitir testar o
        // fluxo de instalação/offline localmente (ETAPA 25) — usa
        // 'module' para não exigir um build de produção antes.
        enabled: true,
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
