import express from 'express';
import axios from 'axios';
import { load } from 'cheerio';

const app = express();
const PORT = 3000;

// List of the websites
const webSource = [
	{
		name: 'Mashable',
		url: 'https://sea.mashable.com/',
		selector: 'li.blogroll.ARTICLE',
	},
];

// Scrape website function
const scrapeWebsite = async () => {
	const newsData = [];

	for (const source of webSource) {
		try {
			let currentPage = 1;
			let hasNextPage = true;

			while (hasNextPage) {
				// Fetch the current page HTML
				const response = await axios.get(source.url, {
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					},
					params: { page: currentPage },
				});

				const cheerioInstance = load(response.data);
				let headlines = [];

				// Scrape the current page
				cheerioInstance(source.selector).each((_, el) => {
					const headline = cheerioInstance(el)
						.find('div.caption')
						.text()
						.trim();
					const link = cheerioInstance(el).find('a').attr('href');
					const dateText = cheerioInstance(el)
						.find('time.datepublished')
						.text()
						.trim();
					const date = new Date(dateText.replace('.', ''));

					if (headline) {
						headlines.push({
							headline,
							link: link.startsWith('http') ? link : source.url + link,
							date,
						});
					}
				});

				// Push data to the result array
				newsData.push({
					name: source.name,
					headlines: headlines.sort((a, b) => b.date - a.date),
				});

				// Look for the next data-pagenum
				const nextPageNum = cheerioInstance(
					`div#brollanchor[data-pagenum="${currentPage + 1}"]`
				);
				if (!nextPageNum.length) {
					console.log('No more pages to load.');
					break;
				}

				currentPage++;
			}
		} catch (error) {
			console.error(`Error Scraping`, error.message);
		}
	}

	return newsData;
};

// Endpoint to get the scraped news
app.get('/', async (req, res) => {
	try {
		// get the news
		const news = await scrapeWebsite();
		let html = `<!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <title>News Scraping</title>
                    </head>
                    <style>
                        body {
                            background-color: #f4f4f4;
                            padding: 0;
                            margin: 0;
                            margin-top: 100px;
                            font-family: 'Arial', sans-serif;
                            color: #333;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: auto;
                        }

                        .container {
                            background-color: #fff;
                            padding: 30px;
                            margin: 20px;
                            border-radius: 10px;
                            width: 80%;
                            max-width: 900px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        }

                        h1 {
                            font-size: 2.5em;
                            text-align: center;
                            color: #111;
                            margin-bottom: 40px;
                        }

                        h2 {
                            font-size: 1.8em;
                            margin-bottom: 20px;
                            padding-bottom: 8px;
                            border-bottom: 2px solid #333;
                            color: #333;
                        }

                        ul {
                            list-style: none;
                            padding-left: 0;
                            margin: 0;
                        }

                        li {
                            padding: 15px;
                            border-bottom: 1px solid #ddd;
                            transition: background-color 0.3s ease;
                        }

                        li:last-child {
                            border-bottom: none;
                        }

                        li:hover {
                            background-color: #e0e0e0;
                            cursor: pointer;
                        }

                        a {
                            text-decoration: none;
                            color: #333;
                            font-size: 1.1em;
                            font-weight: 500;
                            display: block;
                        }

                        a:hover {
                            color: #000;
                        }

                        .date {
                            font-size: 0.9em;
                            color: #888;
                        }
                    </style>
                    <body>
                        <div class="container">
                            <h1>Latest News</h1>
                            <h2>Mashable</h2>
                           
                            ${news.map((source) => {
															let headlineHtml = `<ul>`;
															source.headlines.map(
																({ headline, link, date }) => {
																	headlineHtml += `<li>
                                        <a href="${link}" target="_blank">
                                            <span class="headline">${headline}</span>
                                            <span class="date">${date.toLocaleDateString()}</span>
                                        </a>
                                    </li>`;
																}
															);

															headlineHtml += `</ul>`;

															return headlineHtml;
														})}
														
                        </div>
                    </body>
                </html>`;

		res.send(html);
	} catch (error) {
		res.status(500).json({ error: 'Failed to scrape news data' });
	}
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
