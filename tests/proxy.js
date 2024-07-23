const express = require('express');
const url = require('url');
const cors = require('cors');
const request = require('request');

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
        switch (req.query.responseType) {
            case 'blob':
                req.pipe(request(req.query.url).on('error', next)).pipe(res);
                break;
            case 'text':
            default:
                request({ url: req.query.url, encoding: 'binary' }, (error, response, body) => {
                    if (error) {
                        return next(error);
                    }
                    res.send(
                        `data:${response.headers['content-type']};base64,${Buffer.from(
                            body,
                            'binary'
                        ).toString('base64')}`
                    );
                });
        }
    });

    return app;
};