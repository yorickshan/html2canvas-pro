// Karma configuration
// Generated on Sat Aug 05 2017 23:42:26 GMT+0800 (Malay Peninsula Standard Time)

const listenAddress = 'localhost';
const port = 9876;
const fs = require('fs');
const path = require('path');

// Mirrors how karma-firefox-launcher resolves the Firefox binary
// (FIREFOX_BIN override, then platform-specific default locations) so a
// missing install can be detected before the launcher crashes the server
// with an opaque TypeError.
const firefoxAvailable = () => {
    if (process.env.FIREFOX_BIN) {
        return true;
    }
    switch (process.platform) {
        case 'darwin': {
            const candidates = ['/Applications/Firefox.app/Contents/MacOS/firefox'];
            if ('HOME' in process.env) {
                candidates.unshift(path.join(process.env.HOME, '/Applications/Firefox.app/Contents/MacOS/firefox'));
            }
            return candidates.some(fs.existsSync);
        }
        case 'linux':
        case 'freebsd': {
            // The launcher resolves a bare "firefox" command via PATH.
            const pathDirs = (process.env.PATH || '').split(path.delimiter);
            return pathDirs.some((dir) => {
                const candidate = path.join(dir, 'firefox');
                return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
            });
        }
        case 'win32': {
            const prefixes = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean);
            return prefixes.some((prefix) => fs.existsSync(path.join(prefix, 'Mozilla Firefox', 'firefox.exe')));
        }
        default:
            // Unknown platform: leave the decision to the launcher.
            return true;
    }
};

module.exports = function(config) {
    // https://github.com/actions/virtual-environments/blob/master/images/macos/macos-10.15-Readme.md
    const launchers = {
        Safari_Stable: {
            base: 'SafariNative'
        },
        Chrome_Stable: {
            base: 'ChromeHeadless'
        },
        Firefox_Stable: {
            base: 'Firefox'
        }
    };

    const ciLauncher = launchers[process.env.TARGET_BROWSER];

    let customLaunchers;
    if (ciLauncher) {
        customLaunchers = { target_browser: ciLauncher };
    } else {
        customLaunchers = {
            stable_chrome: {
                base: 'ChromeHeadless'
            }
        };
        // A missing Firefox install makes the firefox launcher throw an
        // uncaught TypeError that kills the whole suite; skip it with a
        // warning instead. Explicit TARGET_BROWSER requests are honoured as-is.
        if (firefoxAvailable()) {
            customLaunchers.stable_firefox = {
                base: 'Firefox'
            };
        } else {
            // console.warn on purpose: the karma logger (log4js) is not
            // reliably configured yet while the config file is evaluated.
            console.warn(
                '[karma.conf] Firefox not found — skipping the stable_firefox launcher. ' +
                    'Install Firefox or set FIREFOX_BIN to run the suite in both browsers, ' +
                    'or pick one explicitly with TARGET_BROWSER (e.g. Chrome_Stable).'
            );
        }
    }

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha'],

        // list of files / patterns to load in the browser
        files: [
            'build/testrunner.js',
            { pattern: './tests/**/*', 'watched': true, 'included': false, 'served': true},
            { pattern: './dist/**/*', 'watched': true, 'included': false, 'served': true},
            { pattern: './node_modules/**/*', 'watched': true, 'included': false, 'served': true},
        ],

        plugins: [
            'karma-mocha',
            'karma-junit-reporter',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-safarinative-launcher'
        ],

        // list of files to exclude
        exclude: [
        ],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['dots', 'junit'],

        junitReporter: {
            outputDir: 'tmp/junit/'
        },

        // web server listen address,
        listenAddress,

        // web server port
        port,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: Object.keys(customLaunchers),


        customLaunchers,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: 5,

        proxies: {
            '/dist': `http://localhost:${port}/base/dist`,
            '/node_modules': `http://localhost:${port}/base/node_modules`,
            '/tests': `http://localhost:${port}/base/tests`,
            '/assets': `http://localhost:${port}/base/tests/assets`
        },

        client: {
            mocha: {
                // change Karma's debug.html to the mocha web reporter
                reporter: 'html'
            }
        },

        captureTimeout: 300000,

        // Safari on CI (especially newer macOS runners) can be slow to establish
        // socket.io heartbeats; generous timeouts avoid false ping-timeout failures.
        pingTimeout: 120000,
        browserSocketTimeout: 120000,
        browserDisconnectTimeout: 120000,
        browserDisconnectTolerance: 3,

        browserNoActivityTimeout: 1200000
    })
};
