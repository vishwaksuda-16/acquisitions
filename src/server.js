import app from './app.js';

const PORT = process.env.PORT || 2005;

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
