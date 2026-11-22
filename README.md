# Ticket Store

Make a ticket for every film you watch, and keep them all in one place.

Live at **https://ticket-store.netlify.app**

- Search TMDB to fill in the film and pick a poster. The site's key lives in Netlify as the environment variable `TMDB_KEY` and is used by `netlify/functions/tmdb.mjs`, so it never appears in the page
- Eighteen styles: Classic, Poster, Minimal, Carnival, Midnight, Gala; tickets from around the world (Tokyo, Bombay, Kino, Boarding pass, Receipt, Istanbul); and Polaroid, Film strip, VHS, Pop art, Festival and Bauhaus
- A back side with your rating, note and Letterboxd name
- Download the front, the back, or a 1080×1920 story image
- Stickers you can drag, turn and resize on either side
- Share links: `/t/…` shows a picture of the ticket in chat apps (`share-page.mjs`, `share-image.mjs`) and opens it for anyone (`share.mjs`)
- Public walls at `/@username`, switched on in account settings (`profile.mjs`)
- Account settings: profile picture (photo, cinema avatar or initials), change password (logs out other devices), delete account
- Accounts with username + password (`netlify/functions/auth.mjs`, `tickets.mjs`): log in and **My tickets** follows you to every device. Passwords are stored as salted PBKDF2 hashes. Without an account, tickets stay in the browser
- 14 website themes in a dropdown (Classic and Film looks)
- Moderation for the admin account (`davud`, set in `netlify/lib/account.mjs`): users, tickets, walls, pictures, password resets, bans, account and share-link deletion (`admin.mjs`)
- A visitor counter (`netlify/functions/visits.mjs`)
- English, Türkçe and Deutsch, picked from the browser language or the globe menu. The words on the tickets switch too (`i18n.js` in the source)
- Letterboxd import under **My tickets**: type a username and recent diary entries become tickets with poster, date, rating, like and review (`netlify/functions/letterboxd.mjs` reads the public RSS feed)
- A quick guide for first-time visitors; the button only shows on a browser's first visit
- Its own icon: a tilted ticket with a star (`favicon.svg`)
- Holo foil (rainbow, gold or silver) that shines as you tilt your phone or move the mouse
- Tear a ticket on the wall with a swipe; tape it back from the ticket's buttons
- A seat map for picking row and seat, and "Seating: Free" on tickets without a seat number
- An album view in My tickets: tickets taped into a scrapbook you flip page by page
- Cinema search: type a cinema or a place and pick from real cinemas worldwide (OpenStreetMap data via Photon, `netlify/functions/cinemas.mjs`)
- Find people: search public walls by username (`netlify/functions/people.mjs`; private and blocked accounts never show up)

Made by [davudiswatchin](https://letterboxd.com/davudiswatchin/).

Film data and posters from [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
