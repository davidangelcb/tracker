# 🚀 React + Vite
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Install dependencies
```
npm install
```

## Start the development server
### Front-end:
```
npm run dev
```

This will start the project locally (default port 5173):
```
http://localhost:5173
```

### Bridge API:
#### Requirement:
We also need to set up a bridge API to the real API using the Vercel CLI (https://vercel.com/docs/cli)

Install the Vercel CLI; this helps us send and deploy to Vercel directly from the terminal (located in the root directory of our project).
```
pnpm i -g vercel
```

```
vercel dev
```

This will start the project locally (default port 3000):
```
http://localhost:3000
```

## Expose your app with HTTPS using Ngrok
Ngrok allows you to access your development environment from any network or device, using a valid HTTPS tunnel (required for camera, geolocation, etc.).

In another terminal, run:
```
ngrok http 5173
```

Ngrok will generate a public URL like:
```
https://xxxxxx.ngrok-free.app
```
Use this URL from any device (LAN or Internet) to test the app with camera and geolocation enabled.

## Production build
For production, you usually do not serve the app with Vite. Instead, you build the static assets and serve them via a real web server (e.g., Nginx, Apache, or Node.js with HTTPS).
```
npm run build
```
- This generates an optimized version of your app in the dist/ folder.
- The files in dist/ can be served by any static server.

## Environment Variables
Create a copy of the **.env.example** file and rename it to **.env** in the project root directory:
```
#---------------
# NECESSARY
#---------------
API_URL=
API_KEY_PRIVADA=

#---------------
# OPTIONAL
#---------------
VITE_ALLOWED_HOSTS=localhost,127.0.0.1,.ngrok-free.app

VITE_POLLING_INTERVAL=5000
VITE_ENABLE_PHOTO_POLLING=false

```
⚠️ Do not include https:// in variables like VITE_NGROK_HOST, since Vite expects only the hostname if you ever use it.

## View the project in our browser!
http://localhost:5173/[UUID]

## Deploy in Vercel from your terminal:
```
vercel --prod
```

## Serve production locally (optional)
You can test the compiled app (dist/) locally. Using serve:
```
npm install -g serve
serve -s dist
```
By default, this serves on HTTP, not HTTPS.
