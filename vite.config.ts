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
      // WEB PUSH (Firebase Cloud Messaging): "generateSW" (Workbox
      // automático) não permite injetar o código de mensageria em
      // segundo plano (`onBackgroundMessage`) nem o `notificationclick`
      // customizado que o Push exige — e registrar um SEGUNDO Service
      // Worker (`firebase-messaging-sw.js`) no mesmo escopo ("/") não é
      // seguro: o navegador permite só UM SW ativo por escopo, então os
      // dois entrariam em conflito/substituiriam um ao outro (ver
      // ETAPA 22 do prompt de Push: "nunca registrar dois Service
      // Workers conflitantes para o mesmo escopo").
      //
      // Por isso trocamos para "injectManifest": mantemos o MESMO
      // Service Worker único (`src/sw.ts`), agora escrito à mão, que
      // faz as duas coisas — precache/PWA (via `workbox-precaching`,
      // reproduzindo o que o "generateSW" fazia) E Web Push/FCM. O
      // manifesto de precache continua gerado automaticamente pelo
      // Workbox no build (`self.__WB_MANIFEST` é substituído pelo
      // plugin); só o CÓDIGO do SW passou a ser explícito.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        // Mesmo motivo do "generateSW" anterior: só assets do próprio
        // build entram no precache, nunca dados do Firebase.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
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
      // NOTA: com "injectManifest" a chave `workbox` (runtimeCaching,
      // navigateFallbackDenylist, cleanupOutdatedCaches, skipWaiting,
      // clientsClaim) deixa de ser lida pelo plugin — ela só se aplica
      // à estratégia "generateSW". O comportamento equivalente a cada
      // uma dessas opções foi reproduzido manualmente dentro de
      // `src/sw.ts` (ver comentários lá), então nada do que já
      // funcionava foi perdido, só passou a ser código explícito.
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
