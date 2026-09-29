---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "html2canvas-pro"
  text: "Screenshots with JavaScript"
  tagline: A fork of niklasvh/html2canvas with modern CSS support, better fidelity, and an actively maintained codebase.
  image:
    src: /logo.png
    alt: html2canvas-pro
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Why html2canvas-pro?
      link: /why
    - theme: alt
      text: View on Github
      link: https://github.com/yorickshan/html2canvas-pro

features:
  - icon: 🎨
    title: Modern CSS
    details: "oklch()/lab() colors, clip-path, writing-mode, mix-blend-mode, object-fit, background-clip: text, and more."
  - icon: 🖼️
    title: Faithful Rendering
    details: "Inset & transformed box-shadows, border-image, filters with correct layer opacity, and image smoothing control."
  - icon: 🛡️
    title: Built for Production
    details: "Input validation (XSS/SSRF), AbortSignal cancellation, onError hooks, and performance monitoring out of the box."
---
