import { defineConfig } from 'vitepress'

// Internal engineering reports (design drafts, CI/budget post-mortems,
// benchmark records) live in docs/ next to the user guides but are not part
// of the published site: they are linked from the repo, not from the sidebar.
const internalReports = [
  'filter-ci.md',
  'filter-compositing-draft.md',
  'filter-native-fastpath.md',
  'filter-overbudget.md',
  'filter-performance.md'
]

// Raw evidence folders carry their own READMEs with repo-relative links;
// they are repo content, not site pages.
const evidenceReadmes = ['**/assets/filter-compositing/**/README.md']

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "html2canvas-pro",
  base: "/html2canvas-pro/",
  description: "Next generation JavaScript screenshots Tool",
  srcExclude: [...internalReports.map((file) => `**/${file}`), ...evidenceReadmes],
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
