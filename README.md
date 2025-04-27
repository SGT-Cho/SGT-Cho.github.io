# Minjae Cho's Blog

Personal blog and portfolio for Minjae Cho (조민제), Junior A.I. Engineer.

## Build & Deploy

1. **Update posts:**  
   Run `python3 build_posts.py` before each commit to update `posts.json` for the homepage and RSS.

2. **Deploy:**  
   Push to your `main` branch on GitHub.  
   GitHub Pages will serve the site from `/`.

3. **No Jekyll:**  
   The `.nojekyll` file disables Jekyll processing.

## Local Preview

Open `index.html` in your browser, or use a static server:

```sh
python3 -m http.server
```