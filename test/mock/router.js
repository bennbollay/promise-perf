const express = require('express');
const superagent = require('superagent');

const router = express.Router();

const work = async () => {
  await superagent.get('https://www.google.com');

  await superagent.get('https://www.amazon.com');

  await superagent.get('https://www.apple.com');
};

router.get('/', async (req, res) => {
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 100)
  );
  await work();
  await new Promise((resolve) =>
    setTimeout(async () => {
      resolve(0);
    }, 100)
  );
  res.send('All done');
});

exports.router = router;
