const express = require('express');
const url = require('url');
const cors = require('cors');
const http = require('http');

function validUrl(req, res, next) {
    if (!req.query.url) {
        next(new Error('No url specified'));
    } else if (typeof req.query.url !== 'string' || url.parse(req.query.url).host === null) {
        next(new Error(`Invalid url specified: ${req.query.url}`));
    } else {
        next();
    }
}

module.exports = () => {
    const app = express.Router();
    app.get('/', cors(), validUrl, (req, res, next) => {
        const options = {
            hostname: url.parse(req.query.url).hostname,
            port: url.parse(req.query.url).port || 80,
            path: url.parse(req.query.url).path,
            method: 'GET',
        };

        const request = http.get(options, (response) => {
            if (!response.statusCode || response.statusCode >= 400) {
                return next(new Error(`Error fetching url: ${response.statusCode}`));
            }

            switch (req.query.responseType) {
                case 'blob':
                    response.pipe(res);
                    break;
                case 'text':
                default:
                    let body = '';
                    response.on('data', (chunk) => {
                        body += chunk.toString();
                    });
                    response.on('end', () => {
                        const contentType = response.headers['content-type'];
                        res.send(
                            `data:${contentType};base64,${Buffer.from(body, 'binary').toString('base64')}`
                        );
                    });
            }
        });

        request.on('error', (error) => {
            next(error);
        });
    });

    return app;
};
