# Ticket Store

Make a ticket for every film you watch, and keep them all in one place.

Live at **https://ticket-store.netlify.app**

- Search TMDB to fill in the film and pick a poster. The site's key lives in Netlify as the environment variable `TMDB_KEY` and is used by `netlify/functions/tmdb.mjs`, so it never appears in the page
- Six styles: Classic, Poster, Minimal, Carnival, Midnight, Gala
- A back side with your rating, note and Letterboxd name
- Download the front, the back, or a 1080×1920 story image
- Saved tickets live in **My tickets** in your browser

Made by [davudiswatchin](https://letterboxd.com/davudiswatchin/).

Film data and posters from [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
