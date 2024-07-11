import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "html2canvas-pro",
  base: "/html2canvas-pro/",
  description: "Next generation JavaScript screenshots Tool",
  head: [
    ['link', { rel: 'icon', href: '/html2canvas-pro/favicon.ico' }]
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'About', link: '/about' },
          { text: 'Why html2canvas-pro', link: '/why' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Features', link: '/features' },
          { text: 'Proxy', link: '/proxy' },
          { text: 'Faq', link: '/faq' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yorickshan/html2canvas-pro' }
    ],

    logo: '/logo.png',
  }
})
