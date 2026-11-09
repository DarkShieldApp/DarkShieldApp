import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'DarkShield',
    description: 'Extensión de DarkShield en desarrollo.',
  },
  webExt: {
    disabled: true,
  },
});
