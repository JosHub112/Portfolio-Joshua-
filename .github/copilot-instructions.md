# Portfolio Website - AI Agent Instructions

## Project Overview
This is a simple portfolio website with a three-file structure: HTML markup, CSS styling, and JavaScript interactivity. The project is in early development with minimal content.

**Key Files:**
- [index.html](../../index.html) - Main entry point; contains semantic HTML structure
- [HomePage.css](../../HomePage.CSS) - Styling layer for all pages
- [HomePage.Java](../../HomePage.Java) - Client-side interactivity (note: despite `.Java` extension, this should contain JavaScript)

## Architecture & Component Boundaries

### Frontend Structure
- **Single-page layout**: Currently uses one HTML file with semantic sections (`<h1>`, `<p>`)
- **Separation of concerns**: HTML (markup) → CSS (presentation) → JavaScript (behavior)
- **No build process**: Direct file serving; CSS/JS included via `<link>` and `<script>` tags

### Expansion Points
When scaling, maintain this structure:
- Add semantic HTML sections (e.g., `<header>`, `<main>`, `<footer>`, `<section class="project">`)
- Keep CSS modular with component-based class names
- Use vanilla JavaScript with event delegation for dynamic content

## Critical Patterns & Conventions

### HTML
- Use semantic HTML5 elements (`<header>`, `<nav>`, `<section>`, `<footer>`, `<article>`)
- Keep markup minimal; avoid presentational divs
- Link external CSS and JS at the end of `<body>` for performance

### CSS
- Use class-based selectors (avoid element selectors for styling)
- Follow BEM naming: `.component__element--modifier` (e.g., `.project__title--featured`)
- Mobile-first approach: base styles for mobile, then media queries for larger screens

### JavaScript (HomePage.Java → should be HomePage.js)
- Use vanilla JavaScript (no framework dependencies)
- Write modular functions with clear responsibilities
- Use event delegation for dynamic DOM manipulation
- Avoid inline event handlers in HTML

## File Naming Note
⚠️ **Important**: `HomePage.Java` should be `HomePage.js` for correct syntax highlighting and tooling support. JavaScript file extensions should be `.js`, not `.Java`.

## Common Development Tasks

- **Adding portfolio projects**: Insert new `<section class="project">` blocks in index.html with project details, link to HomePage.css for styling
- **Styling updates**: Edit HomePage.css directly; use developer tools to verify responsive breakpoints
- **JavaScript enhancements**: Add functions to HomePage.js for user interactions (e.g., project filtering, smooth scrolling, form validation)

## Next Steps for New Contributors
1. Rename `HomePage.Java` → `HomePage.js`
2. Add basic semantic HTML structure (header with nav, main content areas, footer)
3. Implement responsive CSS grid/flexbox layout
4. Add JavaScript functionality (e.g., smooth scroll, project modal interactions)
