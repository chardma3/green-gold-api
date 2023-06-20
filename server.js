const PORT = process.env.PORT || 8000;
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

// Helper function to capitalize the newspaper name
function capitalizeFirstLetter(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Helper function to modify specific newspaper names
function modifyNewspaperName(name) {
  switch (name) {
    case 'wallstreetjournal':
      return 'Wall Street Journal';
    case 'financialtimes':
      return 'Financial Times';
    case 'thetimes':
      return 'The Times';
    case 'latimes':
      return 'LA Times';
    case 'nyt':
      return 'NY Times';
    case 'smh':
      return 'SMH';
    case 'bbc':
      return 'BBC';
    case 'nyp':
      return 'NY Post';
    default:
      return capitalizeFirstLetter(name);
  }
}

const newspapers = [
  {
    name: 'bloomberg',
    address: 'https://www.bloomberg.com',
    base: ' https://www.bloomberg.com',
  },
  {
    name: 'economist',
    address: 'https://www.economist.com',
    base: 'https://www.economist.com',
  },
  {
    name: 'barrons',
    address: ' https://www.barrons.com',
    base: ' https://www.barrons.com',
  },
  {
    name: 'forbes',
    address: 'https://www.forbes.com',
    base: 'https://www.forbes.com',
  },
  {
    name: 'wallstreetjournal',
    address: 'https://www.wsj.com',
    base: 'https://www.wsj.com',
  },
  {
    name: 'financialtimes',
    address: 'https://www.ft.com',
    base: 'https://www.ft.com',
  },
  {
    name: 'guardian',
    address: 'https://www.theguardian.com',
    base: 'https://www.theguardian.com',
  },
  {
    name: 'thetimes',
    address: 'https://www.thetimes.co.uk',
    base: 'https://www.thetimes.co.uk',
  },
  {
    name: 'nyt',
    address: 'https://www.nytimes.com/international',
    base: 'https://www.nytimes.com',
  },
  {
    name: 'latimes',
    address: 'https://www.latimes.com/environment',
    base: 'https://www.latimes.com',
  },
  {
    name: 'smh',
    address: 'https://www.smh.com.au',
    base: 'https://www.smh.com.au',
  },
  {
    name: 'bbc',
    address: 'https://www.bbc.co.uk',
    base: 'https://www.bbc.co.uk',
  },
  {
    name: 'nyp',
    address: 'https://nypost.com',
    base: 'https://nypost.com',
  },
];

app.get('/news', (req, res) => {
  let articles = [];

  Promise.all(
    newspapers.map((newspaper) =>
      axios
        .get(newspaper.address)
        .then((response) => {
          const html = response.data;
          const $ = cheerio.load(html);
          $(
            'a:contains("green") a:contains("startup"), a:contains("tech"), a:contains("climate"), a:contains("environment"),a:contains("AI"), a:contains("space"), a:contains("data"), a:contains("energy"), a:contains("stocks"), a:contains("investors")',
            html
          ).each(function () {
            const title = $(this).text().trim();
            let url = $(this).attr('href');
            if (!url.includes('https')) {
              url = `${newspaper.base}${url}`;
            }
            articles.push({
              title,
              source: modifyNewspaperName(newspaper.name),
              url,
            });
          });
          articles = articles.filter((article) => {
            const { title } = article;
            const words = title.split(' ');
            return (
              !title.includes('<', '}') &&
              words.length >= 3 &&
              words.length <= 20
            );
          });
          articles = articles.filter(
            (value, index, self) =>
              index === self.findIndex((t) => t.url === value.url)
          );
        })
        .catch((error) => {
          console.error(`Error scraping ${newspaper.name}:`, error.message);
          res.status(400).json({ error: `Error scraping ${newspaper.name}` });
        })
    )
  )
    .then(() => {
      res.json(articles);
    })
    .catch((error) => {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/news/:newspaperId', (req, res) => {
  const newspaperId = req.params.newspaperId;
  const selectedNewspaper = newspapers.find(
    (newspaper) => newspaper.name === newspaperId
  );

  if (!selectedNewspaper) {
    return res.status(404).json({ error: 'Newspaper not found' });
  }

  axios
    .get(selectedNewspaper.address)
    .then((response) => {
      const html = response.data;
      const $ = cheerio.load(html);
      let specificArticles = [];

      $(
        'a:contains("green") a:contains("startup"), a:contains("tech"), a:contains("climate"), a:contains("environment"),a:contains("AI"), a:contains("space"), a:contains("data"), a:contains("energy"), a:contains("stocks"), a:contains("investors")',
        html
      ).each(function () {
        const title = $(this).text().trim();
        let url = $(this).attr('href');
        if (!url.includes('https')) {
          url = `${selectedNewspaper.base}${url}`;
        }
        specificArticles.push({
          title,
          source: modifyNewspaperName(newspaperId),
          url,
        });
      });
      specificArticles = specificArticles.filter((article) => {
        const { title } = article;
        const words = title.split(' ');
        return (
          !title.includes('<', '}') && words.length >= 3 && words.length <= 20
        );
      });
      specificArticles = specificArticles.filter(
        (value, index, self) =>
          index === self.findIndex((t) => t.url === value.url)
      );
      res.json(specificArticles);
    })
    .catch((error) => {
      console.error(`Error scraping ${selectedNewspaper.name}:`, error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

// Error handling middleware for general 400 errors
app.use((err, req, res, next) => {
  if (err.status === 400) {
    res.status(400).json({ error: 'Bad Request' });
  } else {
    next(err);
  }
});

// Error handling middleware for general 500 errors
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
