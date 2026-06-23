var h2cSelector, h2cOptions;
var CI = window.location.search.indexOf('selenium') !== -1;
var AUTORUN = window.location.search.indexOf('run=false') === -1;
var REFTEST = window.location.search.indexOf('reftest') !== -1;

(function(document, window) {
    function appendScript(src) {
        document.write(
            '<script type="text/javascript" src="' +
                window.location.protocol +
                '//' +
                window.location.host +
                src +
                '.js?' +
                Math.random() +
                '"></script>'
        );
    }

    (typeof Promise === 'undefined' ? ['/node_modules/es6-promise/dist/es6-promise.auto.min'] : [])
        .concat([
            '/dist/html2canvas-pro'
        ])
        .forEach(appendScript);

    window.addEventListener("unhandledrejection", function(event) {
        console.info('UNHANDLED PROMISE REJECTION:', event);
    });

    function toggleSiblingsVisibility(el) {
        var parent = el.parentNode;
        if (!parent) return;
        var children = parent.children;
        for (var i = 0; i < children.length; i++) {
            if (children[i] !== el) {
                children[i].style.display = children[i].style.display === 'none' ? '' : 'none';
            }
        }
    }

    function isVisible(el) {
        return el.style.display !== 'none';
    }

    window.onload = function() {
        HTMLElement.prototype.html2canvas = function(options) {
            var date = new Date(),
                message = null,
                timeoutTimer = false,
                timer = date.getTime();
            options = options || {};
            var promise = html2canvas(this, options);
            var self = this;
            promise['catch'](function(err) {
                console.log('html2canvas threw an error', err);
            });

            promise.then(function(canvas) {
                var finishTime = new Date();

                canvas.classList.add('html2canvas');
                Object.assign(canvas.style, {
                    position: 'absolute',
                    left: '0px',
                    top: '0px'
                });
                document.body.appendChild(canvas);

                if (!CI) {
                    toggleSiblingsVisibility(canvas);
                    window.addEventListener('click', function(event) {
                        if (event.button === 0) {
                            var scrollTop = window.pageYOffset;
                            canvas.style.display = isVisible(canvas) ? 'none' : '';
                            toggleSiblingsVisibility(canvas);
                            document.documentElement.style.background = isVisible(canvas) ? 'none' : '';
                            document.body.style.background = isVisible(canvas) ? 'none' : '';
                            throwMessage(
                                'Canvas Render ' +
                                    (isVisible(canvas) ? 'visible' : 'hidden')
                            );
                            window.scrollTo(0, scrollTop);
                        }
                    });
                    document.documentElement.style.background = isVisible(canvas) ? 'none' : '';
                    document.body.style.background = isVisible(canvas) ? 'none' : '';
                    throwMessage(
                        'Screenshot created in ' + (finishTime.getTime() - timer) + ' ms<br />',
                        4000
                    );
                } else {
                    canvas.style.display = 'none';
                }
                // test if canvas is read-able
                try {
                    canvas.toDataURL();
                } catch (e) {
                    if (canvas.nodeName.toLowerCase() === 'canvas') {
                        // TODO, maybe add a bit less offensive way to present this, but still something that can easily be noticed
                        window.alert('Canvas is tainted, unable to read data');
                    }
                }
            });

            function throwMessage(msg, duration) {
                window.clearTimeout(timeoutTimer);
                timeoutTimer = window.setTimeout(function() {
                    if (message) {
                        message.style.display = 'none';
                        message.remove();
                        message = null;
                    }
                }, duration || 2000);
                if (message) message.remove();
                message = document.createElement('div');
                message.innerHTML = msg;
                Object.assign(message.style, {
                    margin: '0px',
                    padding: '10px',
                    background: '#000',
                    opacity: '0.7',
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    fontFamily: 'Tahoma',
                    color: '#fff',
                    fontSize: '12px',
                    borderRadius: '12px',
                    width: 'auto',
                    height: 'auto',
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'block'
                });
                document.body.appendChild(message);
            }
        };

        h2cSelector = typeof h2cSelector === 'undefined' ? [document.documentElement] : h2cSelector;

        if (window.setUp) {
            window.setUp();
        }

        window.run = function() {
            h2cSelector[0].html2canvas(
                Object.assign({},
                    {
                        logging: true,
                        proxy: 'http://localhost:8081/proxy',
                        useCORS: false,
                        removeContainer: true
                    },
                    h2cOptions || {},
                    REFTEST ? {windowWidth: 800, windowHeight: 600} : {}
                )
            );
        };

        if (typeof dontRun === 'undefined' && AUTORUN) {
            setTimeout(window.run, 100);
        }
    };
})(document, window);
