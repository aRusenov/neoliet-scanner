const {https} = require('follow-redirects');
const url = require('url');
const cheerio = require('cheerio');
const notifier = require('node-notifier');

const TARGET_DATE = '1 Juni';
const AFTER_HOUR = 18;
const BEFORE_HOUR = 22;
const PEOPLE_COUNT = 1;

notifier.notify({
    title: 'Looking for bouldering slots',
    message: `For ${PEOPLE_COUNT} person(s) between ${AFTER_HOUR} and ${BEFORE_HOUR} on ${TARGET_DATE}`,
    sticky: true
});

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const options = url.parse('https://mijn2.klim.nl/bolder/?p=56');
options.beforeRedirect = (opts, {headers}) => {
    const cookie = headers['set-cookie'][0];
    opts.headers = {'Cookie': cookie}
};

const fetchAndProcess = () => {
    console.log(`Running at ${new Date().toISOString()}`);
    https.get(options, response => {
        let body = '';
        response.on('data', chunk => {
            body += chunk;
        });
        response.on('end', () => {
            const $ = cheerio.load(body);
            const rows = $('table.groupedPerDayViewTable tr');

            let latestDate = null;
            for (const row in rows) {
                if (rows.hasOwnProperty(row)) {
                    latestDate = $('td.dateColumn', rows[row]).text() || latestDate;
                    if (latestDate !== TARGET_DATE) {
                        continue;
                    }
                    const time = $('td.timeColumn', rows[row]).text();
                    const spots = $('td.linkColumn a', rows[row]).text();
                    if (spots) {
                        const spotsOpen = parseInt(new RegExp(/\d+/).exec(spots)[0], 10);
                        const timeInt = parseInt(new RegExp(/(\d+):/).exec(time)[1], 10);
                        console.log(`${latestDate} ${time}: ${spotsOpen}`)
                        if (spotsOpen >= PEOPLE_COUNT && timeInt >= AFTER_HOUR && timeInt <= BEFORE_HOUR) {
                            notifier.notify({
                                title: 'Bouldering time',
                                message: `${PEOPLE_COUNT} spots available at ${time} on ${TARGET_DATE}`
                            });
                        }
                    }
                }
            }
        });
    }).on('error', err => {
        console.error(err);
    });
};


setInterval(fetchAndProcess, 60 * 1000);

fetchAndProcess();
