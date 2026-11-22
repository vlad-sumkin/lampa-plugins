/**
 * ADrama Plugin for Lampa (webOS & TV)
 * Catalog parser, video streaming, user profile & synchronization for web.adrama.tv
 */
(function () {
    'use strict';

    if (window.plugin_adrama_installed) return;
    window.plugin_adrama_installed = true;

    var API_BASE = 'https://web.adrama.tv/api';
    var STORAGE_AUTH = 'adrama_user_auth';

    // SVG Icons
    var ICONS = {
        logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 3 14 9-14 9V3z"/></svg>',
        search: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
        bookmarks: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
        history: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        star: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#ffb703" stroke="#ffb703" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="m5 3 14 9-14 9V3z"/></svg>'
    };

    // Safe Navigator helper for SpatialNavigator in Lampa
    var Nav = {
        canmove: function (dir) {
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            return (n && typeof n.canmove === 'function') ? n.canmove(dir) : false;
        },
        move: function (dir) {
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            return (n && typeof n.move === 'function') ? n.move(dir) : false;
        },
        focused: function (elem) {
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            if (n && typeof n.focused === 'function') n.focused(elem);
        }
    };


    // Helper: validate JWT token expiration safely
    function isTokenExpired(token) {
        if (!token) return true;
        try {
            var parts = token.split('.');
            if (parts.length < 2) return true;
            var base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            var jsonPayload = decodeURIComponent(atob(base64Url).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            var payload = JSON.parse(jsonPayload);
            if (payload && payload.exp && (Date.now() / 1000) >= (payload.exp - 60)) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    // --- 1. AUTH & STORAGE ---
    var Auth = {
        get: function () {
            return Lampa.Storage.get(STORAGE_AUTH, {});
        },
        token: function () {
            var a = this.get();
            return a.access_token || '';
        },
        rawToken: function () {
            var a = this.get();
            return a.access_token || '';
        },
        refreshToken: function () {
            var a = this.get();
            return a.refresh_token || '';
        },
        credentials: function () {
            var a = this.get();
            if (a.login_email && a.password) {
                return { email: a.login_email, password: a.password };
            }
            return null;
        },
        user: function () {
            var a = this.get();
            return a.profile || a.user || null;
        },
        isLogged: function () {
            var a = this.get();
            return Boolean(a.access_token || a.refresh_token || (a.login_email && a.password));
        },
        isExpired: function () {
            var raw = this.rawToken();
            return Boolean(raw && isTokenExpired(raw));
        },
        save: function (token, profile, refreshToken, email, password) {
            var curr = this.get();
            var data = {
                access_token: token || curr.access_token || '',
                refresh_token: refreshToken || curr.refresh_token || '',
                profile: profile || curr.profile || null,
                login_email: email || curr.login_email || '',
                password: password || curr.password || '',
                saved_at: Date.now()
            };
            Lampa.Storage.set(STORAGE_AUTH, data);
        },
        clear: function () {
            Lampa.Storage.set(STORAGE_AUTH, {});
        }
    };

    // --- 2. API CLIENT ---
    var Api = {
        _refreshPromise: null,
        _ensurePromise: null,

        isPublic: function (path) {
            var p = path.toLowerCase();
            return p === 'home' ||
                   p.indexOf('releases') === 0 ||
                   p.indexOf('episodes') === 0 ||
                   p.indexOf('auth/') === 0;
        },

        ensureToken: function () {
            var _this = this;
            if (this._ensurePromise) return this._ensurePromise;

            var a = Auth.get();
            var tok = a.access_token || '';
            var rf = a.refresh_token || '';
            var email = a.login_email || '';
            var pass = a.password || '';

            if (tok && !isTokenExpired(tok)) {
                return Promise.resolve(tok);
            }

            this._ensurePromise = (function () {
                if (rf) {
                    return _this.refresh().catch(function () {
                        if (email && pass) {
                            return _this.signin(email, pass).then(function (res) {
                                if (res && res.access_token) {
                                    Auth.save(res.access_token, res.profile || res.user, res.refresh_token, email, pass);
                                    return res.access_token;
                                }
                                return '';
                            }).catch(function () { return ''; });
                        }
                        return '';
                    });
                }

                if (email && pass) {
                    return _this.signin(email, pass).then(function (res) {
                        if (res && res.access_token) {
                            Auth.save(res.access_token, res.profile || res.user, res.refresh_token, email, pass);
                            return res.access_token;
                        }
                        return '';
                    }).catch(function () { return ''; });
                }

                return Promise.resolve('');
            })().then(function (token) {
                _this._ensurePromise = null;
                return token;
            }).catch(function () {
                _this._ensurePromise = null;
                return '';
            });

            return this._ensurePromise;
        },

        refresh: function () {
            var _this = this;
            if (this._refreshPromise) return this._refreshPromise;

            var rf = Auth.refreshToken();
            var body = rf ? { refresh_token: rf } : {};

            this._refreshPromise = new Promise(function (resolve, reject) {
                $.ajax({
                    url: API_BASE + '/auth/refresh',
                    type: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Platform': 'web',
                        'X-Locale': 'ru'
                    },
                    xhrFields: { withCredentials: true },
                    data: JSON.stringify(body),
                    timeout: 10000,
                    success: function (res) {
                        _this._refreshPromise = null;
                        if (typeof res === 'string') {
                            try { res = JSON.parse(res); } catch (e) {}
                        }
                        var data = (res && res.data !== undefined) ? res.data : res;
                        if (data && data.access_token) {
                            Auth.save(data.access_token, data.profile || Auth.user(), data.refresh_token || rf);
                            resolve(data.access_token);
                        } else {
                            reject(new Error('Refresh failed'));
                        }
                    },
                    error: function () {
                        _this._refreshPromise = null;
                        reject(new Error('Refresh failed'));
                    }
                });
            });

            return this._refreshPromise;
        },

        request: function (path, options, isRetry) {
            var _this = this;
            options = options || {};

            var isAuthPath = (path.indexOf('auth/') === 0);
            if (isAuthPath) options.skipAuth = true;

            var ensurePromise = (!options.skipAuth && Auth.isLogged()) ? _this.ensureToken() : Promise.resolve('');

            return ensurePromise.then(function (validToken) {
                var url = path.indexOf('http') === 0 ? path : (API_BASE + '/' + path.replace(/^\//, ''));
                if (options.query) {
                    var pairs = [];
                    for (var key in options.query) {
                        var val = options.query[key];
                        if (val !== undefined && val !== null && val !== '') {
                            pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
                        }
                    }
                    if (pairs.length) url += (url.indexOf('?') >= 0 ? '&' : '?') + pairs.join('&');
                }

                var headers = {
                    'Accept': 'application/json',
                    'X-Platform': 'web',
                    'X-Locale': 'ru'
                };
                if (options.body && !(options.body instanceof FormData)) {
                    headers['Content-Type'] = 'application/json';
                }

                var token = validToken || Auth.token();
                if (token && isTokenExpired(token)) {
                    token = '';
                }
                if (token && !options.skipAuth) {
                    headers['Authorization'] = 'Bearer ' + token;
                }

                return new Promise(function (resolve, reject) {
                    $.ajax({
                        url: url,
                        type: options.method || 'GET',
                        headers: headers,
                        xhrFields: { withCredentials: true },
                        data: options.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : null,
                        contentType: options.body instanceof FormData ? false : (headers['Content-Type'] || false),
                        processData: false,
                        timeout: options.timeout || 25000,
                        success: function (res) {
                            if (typeof res === 'string') {
                                try { res = JSON.parse(res); } catch (e) {}
                            }
                            if (res && res.success === false) {
                                var errMsg = (res.error || '').toString();
                                if (!isRetry && !isAuthPath && (res.status === 401 || errMsg.toLowerCase().indexOf('token') >= 0)) {
                                    var creds = Auth.credentials();
                                    if (creds) {
                                        return _this.signin(creds.email, creds.password).then(function (sRes) {
                                            if (sRes && sRes.access_token) {
                                                Auth.save(sRes.access_token, sRes.profile || sRes.user, sRes.refresh_token, creds.email, creds.password);
                                                return _this.request(path, options, true).then(resolve).catch(reject);
                                            }
                                            if (_this.isPublic(path)) {
                                                return _this.request(path, Object.assign({}, options, { skipAuth: true }), true).then(resolve).catch(reject);
                                            }
                                            return reject(new Error(errMsg || 'Ошибка авторизации'));
                                        }).catch(function () {
                                            if (_this.isPublic(path)) {
                                                return _this.request(path, Object.assign({}, options, { skipAuth: true }), true).then(resolve).catch(reject);
                                            }
                                            return reject(new Error(errMsg || 'Ошибка авторизации'));
                                        });
                                    }
                                    if (_this.isPublic(path)) {
                                        var opts = Object.assign({}, options, { skipAuth: true });
                                        return _this.request(path, opts, true).then(resolve).catch(reject);
                                    }
                                }
                                return reject(new Error(errMsg || 'Ошибка API ADrama'));
                            }
                            resolve(res && res.data !== undefined ? res.data : res);
                        },
                        error: function (xhr) {
                            var msg = 'Ошибка сети (' + xhr.status + ')';
                            var isAuthErr = xhr.status === 401 || xhr.status === 403;
                            try {
                                var json = JSON.parse(xhr.responseText);
                                if (json && json.error) {
                                    msg = json.error;
                                    if (typeof msg === 'string' && msg.toLowerCase().indexOf('token') >= 0) isAuthErr = true;
                                }
                            } catch (e) {}

                            if (!isRetry && !isAuthPath && isAuthErr) {
                                var creds = Auth.credentials();
                                if (creds) {
                                    return _this.signin(creds.email, creds.password).then(function (sRes) {
                                        if (sRes && sRes.access_token) {
                                            Auth.save(sRes.access_token, sRes.profile || sRes.user, sRes.refresh_token, creds.email, creds.password);
                                            return _this.request(path, options, true).then(resolve).catch(reject);
                                        }
                                        if (_this.isPublic(path)) {
                                            return _this.request(path, Object.assign({}, options, { skipAuth: true }), true).then(resolve).catch(reject);
                                        }
                                        return reject(new Error(msg));
                                    }).catch(function () {
                                        if (_this.isPublic(path)) {
                                            return _this.request(path, Object.assign({}, options, { skipAuth: true }), true).then(resolve).catch(reject);
                                        }
                                        return reject(new Error(msg));
                                    });
                                }
                                if (_this.isPublic(path)) {
                                    var opts = Object.assign({}, options, { skipAuth: true });
                                    return _this.request(path, opts, true).then(resolve).catch(reject);
                                }
                            }

                            reject(new Error(msg));
                        }
                    });
                });
            });
        },

        home: function () {
            return this.request('home');
        },
        releases: function (params) {
            return this.request('releases', { query: params });
        },
        release: function (id) {
            return this.request('releases/' + id);
        },
        episodes: function (id) {
            return this.request('releases/' + id + '/episodes');
        },
        episodeTranslations: function (episodeId) {
            return this.request('episodes/' + episodeId + '/translations');
        },
        movieTranslations: function (releaseId) {
            return this.request('releases/' + releaseId + '/translations');
        },
        search: function (key, page) {
            return this.request('releases/search', { query: { key: key, page: page || 1, limit: 24 } });
        },
        popularQueries: function () {
            return this.request('releases/search/popular-queries', { query: { limit: 12 } });
        },
        signin: function (email_or_login, password) {
            return this.request('auth/signin', {
                method: 'POST',
                body: { login_email: email_or_login, password: password },
                skipAuth: true
            });
        },
        me: function () {
            return this.request('users/me', { query: { brief: 1 } });
        },
        profile: function () {
            return this.request('users/me/profile');
        },
        favorites: function (page) {
            return this.request('users/me/favorites', { query: { page: page || 1, limit: 24 } });
        },
        watchStatus: function (status, page) {
            return this.request('users/me/watch-status', { query: { status: status, page: page || 1, limit: 24 } });
        },
        addFavorite: function (releaseId) {
            return this.request('users/me/favorites', { method: 'POST', body: { release_id: releaseId } });
        },
        removeFavorite: function (releaseId) {
            return this.request('users/me/favorites/' + releaseId, { method: 'DELETE' });
        },
        setWatchStatus: function (releaseId, status) {
            if (status === 0 || status === '0') {
                return this.request('users/me/watch-status/' + releaseId, { method: 'DELETE' });
            }
            return this.request('users/me/watch-status', { method: 'POST', body: { release_id: releaseId, status: status } });
        },
        history: function (page) {
            return this.request('users/me/history', { query: { page: page || 1, count: 24 } });
        },
        trackView: function (releaseId, translationId, sourceId) {
            return this.request('releases/' + releaseId + '/translations/' + translationId + '/view', {
                method: 'POST',
                query: { source_id: sourceId }
            }).catch(function () {});
        },
        saveEpisode: function (payload) {
            return this.request('users/me/history/episode', { method: 'POST', body: payload }).catch(function () {});
        },
        saveMovie: function (payload) {
            return this.request('users/me/history/movie', { method: 'POST', body: payload }).catch(function () {});
        },
        comments: function (releaseId, page) {
            return this.request('comments/release/' + releaseId, { query: { page: page || 1, limit: 20 } });
        }
    };

    // --- 2.5 POSTER CACHE ENGINE (LRU IN-MEMORY BLOBS + PERSISTENT CACHESTORAGE) ---
    var PosterCache = {
        _mem: {},
        _keys: [],
        _maxMem: 300,
        _cache: null,
        init: function () {
            var _this = this;
            if ('caches' in window) {
                caches.open('adrama-posters').then(function (c) {
                    _this._cache = c;
                }).catch(function () {});
            }
        },
        getBlobUrl: function (url) {
            return this._mem[url] || null;
        },
        setMem: function (url, blobUrl) {
            if (this._mem[url]) return;
            if (this._keys.length >= this._maxMem) {
                var oldUrl = this._keys.shift();
                var oldBlob = this._mem[oldUrl];
                delete this._mem[oldUrl];
                if (oldBlob && oldBlob.indexOf('blob:') === 0) {
                    try { URL.revokeObjectURL(oldBlob); } catch (e) {}
                }
            }
            this._keys.push(url);
            this._mem[url] = blobUrl;
        },
        load: function (url, imgElem, cardElem) {
            if (imgElem && imgElem.jquery) imgElem = imgElem[0];
            if (!url || url.indexOf('http') !== 0) {
                if (imgElem) imgElem.src = url || './img/img_broken.svg';
                if (cardElem) $(cardElem).addClass('card--loaded loaded');
                return;
            }
            var _this = this;
            var memBlob = this.getBlobUrl(url);
            if (memBlob) {
                if (imgElem) imgElem.src = memBlob;
                if (cardElem) $(cardElem).addClass('card--loaded loaded');
                return;
            }
            if (this._cache) {
                this._cache.match(url).then(function (matched) {
                    if (matched) {
                        return matched.blob().then(function (blob) {
                            var bUrl = URL.createObjectURL(blob);
                            _this.setMem(url, bUrl);
                            if (imgElem) imgElem.src = bUrl;
                            if (cardElem) $(cardElem).addClass('card--loaded loaded');
                        });
                    } else {
                        _this._fetchAndCache(url, imgElem, cardElem);
                    }
                }).catch(function () {
                    _this._fetchAndCache(url, imgElem, cardElem);
                });
            } else {
                _this._fetchAndCache(url, imgElem, cardElem);
            }
        },
        _fetchAndCache: function (url, imgElem, cardElem) {
            var _this = this;
            if (imgElem) {
                imgElem.onload = function () {
                    if (cardElem) $(cardElem).addClass('card--loaded loaded');
                };
                imgElem.onerror = function () {
                    imgElem.src = './img/img_broken.svg';
                };
                imgElem.src = url;
                if (imgElem.complete && imgElem.naturalWidth > 0) {
                    if (cardElem) $(cardElem).addClass('card--loaded loaded');
                }
            }
            if ('fetch' in window && this._cache) {
                fetch(url).then(function (resp) {
                    if (resp && resp.ok) {
                        if (_this._cache) _this._cache.put(url, resp.clone());
                        return resp.blob();
                    }
                }).then(function (blob) {
                    if (blob) {
                        var bUrl = URL.createObjectURL(blob);
                        _this.setMem(url, bUrl);
                        if (imgElem && (!imgElem.complete || imgElem.src === url)) {
                            imgElem.src = bUrl;
                            if (cardElem) $(cardElem).addClass('card--loaded loaded');
                        }
                    }
                }).catch(function () {});
            }
        },
        preload: function (urls) {
            if (!urls || !urls.length) return;
            var _this = this;
            var limit = Math.min(urls.length, 50);
            for (var i = 0; i < limit; i++) {
                var u = urls[i];
                if (u && u.indexOf('http') === 0 && !_this.getBlobUrl(u)) {
                    _this._fetchAndCache(u, null, null);
                }
            }
        }
    };

    // --- 3. STREAM RESOLVER ---
    var Resolver = {
        rot18Decode: function (s) {
            if (!s) return '';
            var shifted = s.replace(/[a-zA-Z]/g, function (c) {
                return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 18) ? c : c - 26);
            });
            try {
                return atob(shifted);
            } catch (e) {
                return '';
            }
        },

        resolveKodik: function (embedUrl) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var hostname = 'kodikplayer.com';
                var hostMatch = embedUrl.match(/^https?:\/\/([^\/]+)/);
                if (hostMatch) hostname = hostMatch[1];

                $.ajax({
                    url: embedUrl,
                    type: 'GET',
                    headers: { 'Accept': 'text/html' },
                    timeout: 12000,
                    success: function (html) {
                        var typeMatch = /var\s+type\s*=\s*["']([^"']+)["']/.exec(html);
                        var videoIdMatch = /var\s+videoId\s*=\s*["']([^"']+)["']/.exec(html);
                        var urlParamsMatch = /var\s+urlParams\s*=\s*'(\{.+?\})'/.exec(html) || /var\s+urlParams\s*=\s*"(\{.+?\})"/.exec(html);
                        var hashMatch = /\/(?:seria|video|film)\/\d+\/([a-zA-Z0-9]+)/.exec(embedUrl);

                        if (!typeMatch || !videoIdMatch || !urlParamsMatch || !hashMatch) {
                            return reject(new Error('Не удалось получить параметры Kodik'));
                        }

                        var params;
                        try {
                            params = JSON.parse(urlParamsMatch[1]);
                        } catch (e) {
                            return reject(new Error('Ошибка разбора параметров Kodik'));
                        }

                        var postData = {
                            d: params.d || '',
                            d_sign: params.d_sign || '',
                            pd: params.pd || '',
                            pd_sign: params.pd_sign || '',
                            ref: decodeURIComponent(params.ref || ''),
                            ref_sign: params.ref_sign || '',
                            bad_user: 'false',
                            type: typeMatch[1],
                            hash: hashMatch[1],
                            id: videoIdMatch[1]
                        };

                        var ftorUrl = 'https://' + hostname + '/ftor';

                        $.ajax({
                            url: ftorUrl,
                            type: 'POST',
                            data: postData,
                            dataType: 'json',
                            timeout: 12000,
                            success: function (res) {
                                var links = (res && res.links) || {};
                                var chosen = links['720'] || links['480'] || links['360'] || links[Object.keys(links)[0]];
                                if (!chosen || !chosen.length || !chosen[0].src) {
                                    return reject(new Error('Потоки не найдены в Kodik'));
                                }

                                var streamUrl = _this.rot18Decode(chosen[0].src);
                                if (!streamUrl) {
                                    return reject(new Error('Ошибка декодирования потока Kodik'));
                                }
                                if (streamUrl.indexOf('//') === 0) {
                                    streamUrl = 'http:' + streamUrl;
                                }
                                resolve({
                                    hls: streamUrl,
                                    quality: chosen[0].title || '720'
                                });
                            },
                            error: function (xhr, st, err) {
                                reject(new Error(err || 'Ошибка получения потока Kodik'));
                            }
                        });
                    },
                    error: function (xhr, st, err) {
                        reject(new Error(err || 'Ошибка загрузки плеера Kodik'));
                    }
                });
            });
        },

        resolveCollaps: function (embedUrl, episodeNum, seasonNum) {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: embedUrl,
                    type: 'GET',
                    headers: { 'Accept': 'text/html' },
                    timeout: 12000,
                    success: function (html) {
                        // 1. Try finding JSON playlist inside makePlayer({ ... playlist: { seasons: [...] } })
                        var plMatch = /playlist\s*:\s*\{[\s\S]*?seasons\s*:\s*(\[[\s\S]*?\])\s*[\},]/m.exec(html);
                        if (plMatch && plMatch[1]) {
                            try {
                                var seasons = JSON.parse(plMatch[1]);
                                for (var s = 0; s < seasons.length; s++) {
                                    var season = seasons[s];
                                    if (seasonNum && String(season.season) !== String(seasonNum)) continue;
                                    for (var e = 0; e < season.episodes.length; e++) {
                                        var ep = season.episodes[e];
                                        if (!episodeNum || String(ep.episode) === String(episodeNum)) {
                                            if (ep.hls) return resolve({ hls: ep.hls.replace(/\\\//g, '/'), title: ep.title });
                                        }
                                    }
                                }
                                if (seasons.length && seasons[0].episodes && seasons[0].episodes[0] && seasons[0].episodes[0].hls) {
                                    return resolve({ hls: seasons[0].episodes[0].hls.replace(/\\\//g, '/') });
                                }
                            } catch (e) {}
                        }

                        // 2. Direct regex match for master.m3u8
                        var m3u8Match = /(?:hls\s*:\s*|["']hls["']\s*:\s*)["']([^"']+\.m3u8[^"']*)["']/.exec(html);
                        if (m3u8Match && m3u8Match[1]) {
                            return resolve({ hls: m3u8Match[1].replace(/\\\//g, '/') });
                        }

                        reject(new Error('HLS поток не найден в ответе Collaps'));
                    },
                    error: function (xhr, st, err) {
                        reject(new Error(err || 'Ошибка загрузки плеера Collaps'));
                    }
                });
            });
        }
    };

    // --- 4. PLAYER CONTROLLER ---
    var Playback = {
        timer: null,
        current: null,

        start: function (item, episode, translation, source) {
            var _this = this;
            this.stopTracking();

            var dramaTitle = (item.titles && item.titles.ru) || item.title || 'Дорама';
            var epTitle = (episode && episode.title) ? episode.title : (episode ? (episode.number + ' серия') : '');
            var fullTitle = dramaTitle + (epTitle ? (' - ' + epTitle) : '') + (translation ? (' (' + translation.title + ')') : '');

            _this.current = {
                releaseId: item.id,
                episodeId: episode ? episode.id : null,
                translationId: translation ? translation.id : null,
                sourceId: source.source_id,
                linkId: source.link_id || null,
                duration: (item.runtime || 60) * 60
            };

            if (translation && source) {
                Api.trackView(item.id, translation.id, source.source_id);
            }

            var isCollaps = (source.resolver === 'collaps') || (source.url && (source.url.indexOf('nextembed') >= 0 || source.url.indexOf('embf.net') >= 0 || source.url.indexOf('collaps') >= 0));
            var isKodik = (source.title && source.title.toLowerCase().indexOf('kodik') >= 0) || (source.url && source.url.indexOf('kodik') >= 0);

            if (isKodik) {
                Lampa.Noty.show('Подготовка потока Kodik...');
                Resolver.resolveKodik(source.url).then(function (res) {
                    _this.playHls(res.hls, fullTitle);
                }).catch(function (err) {
                    console.warn('[ADrama] Kodik resolve failed:', err.message);
                    _this.playIframe(source.url);
                });
            } else if (isCollaps) {
                Lampa.Noty.show('Подготовка потока...');
                var epNum = episode ? episode.number : 1;
                var seasonNum = (episode && episode.season_number) ? episode.season_number : 1;

                Resolver.resolveCollaps(source.url, epNum, seasonNum).then(function (res) {
                    _this.playHls(res.hls, fullTitle);
                }).catch(function (err) {
                    console.warn('[ADrama] Collaps resolve failed:', err.message);
                    _this.playIframe(source.url);
                });
            } else if (source.url && (source.url.indexOf('.m3u8') >= 0 || source.url.indexOf('.mp4') >= 0)) {
                _this.playHls(source.url, fullTitle);
            } else {
                _this.playIframe(source.url);
            }
        },

        playHls: function (url, title) {
            var _this = this;

            // Normalize URL to bypass WebKit certificate and file-protocol issues
            if (url.indexOf('//') === 0) {
                url = 'http:' + url;
            } else if (url.indexOf('https://') === 0 && (url.indexOf('solodcdn.com') >= 0 || url.indexOf('kodik-cdn.com') >= 0)) {
                url = url.replace('https://', 'http://');
            }

            Lampa.Player.play({
                title: title,
                url: url,
                timeline: {
                    hash: 'adrama_' + (_this.current.releaseId || '') + '_' + (_this.current.episodeId || '')
                }
            });

            Lampa.Player.callback(function () {
                _this.saveProgress();
                _this.stopTracking();
            });

            _this.timer = setInterval(function () {
                _this.saveProgress();
            }, 25000);
        },

        playIframe: function (url) {
            var _this = this;
            Lampa.Iframe.show({
                url: url,
                onBack: function () {
                    _this.saveProgress();
                    _this.stopTracking();
                    Lampa.Controller.toggle('content');
                }
            });
        },

        saveProgress: function () {
            if (!this.current || !Auth.isLogged()) return;
            var cur = this.current;
            var currentTime = 0;
            try {
                if (Lampa.PlayerVideo && Lampa.PlayerVideo.video()) {
                    currentTime = Math.round(Lampa.PlayerVideo.video().currentTime || 0);
                }
            } catch (e) {}

            var payload = {
                release_id: cur.releaseId,
                translation_id: cur.translationId || 0,
                progress_ms: currentTime * 1000,
                duration_ms: (cur.duration || 3600) * 1000,
                watched_at: new Date().toISOString()
            };

            if (cur.episodeId) {
                payload.episode_id = cur.episodeId;
                Api.saveEpisode(payload);
            } else if (cur.linkId) {
                payload.link_id = cur.linkId;
                Api.saveMovie(payload);
            }
        },

        stopTracking: function () {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
    };

    // Helper for loading status
    function setLoader(comp, status) {
        if (comp && comp.activity && comp.activity.loader) {
            comp.activity.loader(status);
        }
    }

    window.Resolver = Resolver;
    window.Playback = Playback;
    window.showBookmarkMenu = showBookmarkMenu;
    window.Api = Api;
    window.Auth = Auth;

    // --- SHARED BOOKMARK & FAVORITES MODAL (CLEAN, NO EMOJIS, PROPER DELETE) ---
    function showBookmarkMenu(releaseId, currentStatus, isFav, onUpdate) {
        if (!Auth.isLogged()) {
            promptLogin(function () {
                showBookmarkMenu(releaseId, currentStatus, isFav, onUpdate);
            });
            return;
        }

        var isFavoriteNow = Boolean(isFav === 1 || isFav === true || isFav === '1');
        var items = [];

        if (isFavoriteNow) {
            items.push({ title: 'Удалить из избранного', status: 'unfav' });
        } else {
            items.push({ title: 'Избранное', status: 'fav' });
        }
        items.push({ title: 'Смотрю', status: 1 });
        items.push({ title: 'В планах', status: 2 });
        items.push({ title: 'Просмотрено', status: 3 });
        items.push({ title: 'Отложено', status: 4 });
        items.push({ title: 'Брошено', status: 5 });
        items.push({ title: 'Удалить из закладок', status: 0 });

        Lampa.Select.show({
            title: 'Закладки',
            items: items,
            onSelect: function (sel) {
                Lampa.Controller.toggle('content');
                if (sel.status === 'unfav') {
                    Api.removeFavorite(releaseId).then(function () {
                        Lampa.Noty.show('Удалено из избранного');
                        if (typeof onUpdate === 'function') onUpdate(currentStatus, false);
                    }).catch(function (err) {
                        Lampa.Noty.show('Ошибка: ' + (err.message || 'не удалось удалить'));
                    });
                } else if (sel.status === 'fav') {
                    Api.addFavorite(releaseId).then(function () {
                        Lampa.Noty.show('Добавлено в избранное');
                        if (typeof onUpdate === 'function') onUpdate(currentStatus, true);
                    }).catch(function (err) {
                        Lampa.Noty.show('Ошибка: ' + (err.message || 'не удалось добавить'));
                    });
                } else if (sel.status === 0) {
                    Promise.all([
                        Api.removeFavorite(releaseId).catch(function () {}),
                        Api.setWatchStatus(releaseId, 0).catch(function () {})
                    ]).then(function () {
                        Lampa.Noty.show('Удалено из закладок');
                        if (typeof onUpdate === 'function') onUpdate(0, false);
                    }).catch(function () {
                        Lampa.Noty.show('Удалено из закладок');
                        if (typeof onUpdate === 'function') onUpdate(0, false);
                    });
                } else {
                    Api.setWatchStatus(releaseId, sel.status).then(function () {
                        Lampa.Noty.show('Статус обновлен');
                        if (typeof onUpdate === 'function') onUpdate(sel.status, isFavoriteNow);
                    }).catch(function (err) {
                        Lampa.Noty.show('Ошибка: ' + (err.message || 'не удалось обновить статус'));
                    });
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // --- 5. COMPONENT: ADRAMA MAIN (UNIFIED TABS: CATALOG, SEARCH, BOOKMARKS) ---
    function ComponentMain(object) {
        var scroll = new Lampa.Scroll({ mask: false, over: true, step: 250 });
        scroll.minus();
        scroll.onWheel = function (step) {
            if (step > 0) {
                handleDown();
            } else {
                handleUp();
            }
        };

        var html = $('<div class="adrama-main-container"></div>');
        var currentTab = (object && object.tab) || 'catalog';
        var activeBookmarkSubTab = (object && object.subTab) || 'fav';
        var lastSearchQuery = '';
        var homeSectionsCache = null;
        var popularQueriesCache = null;

        var navTabs = $(
            '<div class="navigation-tabs adrama-nav-tabs">' +
                '<div class="navigation-tabs__button selector' + (currentTab === 'catalog' ? ' active' : '') + '" data-tab="catalog">Каталог</div>' +
                '<div class="navigation-tabs__split">|</div>' +
                '<div class="navigation-tabs__button selector' + (currentTab === 'search' ? ' active' : '') + '" data-tab="search">Поиск</div>' +
                '<div class="navigation-tabs__split">|</div>' +
                '<div class="navigation-tabs__button selector' + (currentTab === 'bookmarks' ? ' active' : '') + '" data-tab="bookmarks">Избранное</div>' +
            '</div>'
        );
        var contentBox = $('<div class="adrama-tab-content"></div>');
        var paneCatalog = $('<div class="adrama-tab-pane adrama-tab-pane--catalog"></div>');
        var paneSearch = $('<div class="adrama-tab-pane adrama-tab-pane--search" style="display:none"></div>');
        var paneBookmarks = $('<div class="adrama-tab-pane adrama-tab-pane--bookmarks" style="display:none"></div>');
        contentBox.append(paneCatalog);
        contentBox.append(paneSearch);
        contentBox.append(paneBookmarks);
        html.append(navTabs);
        html.append(contentBox);

        var catalogBuilt = false;
        var searchBuilt = false;
        var bookmarksBuilt = false;

        function getActivePane() {
            if (currentTab === 'catalog') return paneCatalog;
            if (currentTab === 'search') return paneSearch;
            return paneBookmarks;
        }

        var last;
        var self = this;
        var activeLineElem = null;
        var updateCounters = function () {};

        var BOOKMARK_LISTS = [
            { id: 'fav', title: 'Избранное', type: 'fav', statKey: 'favorites' },
            { id: 1, title: 'Смотрю', type: 'status', statKey: 'stats_watch_status_watching' },
            { id: 2, title: 'В планах', type: 'status', statKey: 'stats_watch_status_planned' },
            { id: 3, title: 'Просмотрено', type: 'status', statKey: 'stats_watch_status_completed' },
            { id: 4, title: 'Отложено', type: 'status', statKey: 'stats_watch_status_onhold' },
            { id: 5, title: 'Брошено', type: 'status', statKey: 'stats_watch_status_dropped' },
            { id: 'history', title: 'История', type: 'history', statKey: 'history_count' }
        ];

        this.create = function () {
            bindTabs();
            scroll.append(html);
            switchTab(currentTab, true);
            return scroll.render();
        };

        function bindTabs() {
            navTabs.find('.navigation-tabs__button').on('hover:focus', function () {
                last = this;
                scroll.reset();
            }).on('hover:hover', function () {
                last = this;
                Nav.focused(last);
            }).on('hover:enter', function () {
                var tab = $(this).data('tab');
                if (tab && tab !== currentTab) {
                    switchTab(tab, false);
                }
            });
        }

        function switchTab(tabName, isInitial) {
            currentTab = tabName;
            navTabs.find('.navigation-tabs__button').removeClass('active');
            navTabs.find('[data-tab="' + tabName + '"]').addClass('active');

            activeLineElem = null;
            scroll.reset();

            paneCatalog.hide();
            paneSearch.hide();
            paneBookmarks.hide();

            if (tabName === 'catalog') {
                paneCatalog.show();
                if (!catalogBuilt) {
                    renderCatalog(isInitial);
                } else {
                    if (isInitial) self.start();
                    else focusAfterSwitch(isInitial);
                }
            } else if (tabName === 'search') {
                paneSearch.show();
                if (!searchBuilt) {
                    renderSearch(isInitial);
                } else {
                    if (isInitial) self.start();
                    else focusAfterSwitch(isInitial);
                }
            } else if (tabName === 'bookmarks') {
                paneBookmarks.show();
                if (!bookmarksBuilt) {
                    renderBookmarks(isInitial);
                } else {
                    if (isInitial) self.start();
                    else focusAfterSwitch(isInitial);
                    updateCounters();
                }
            }
        }

        // --- CATALOG TAB ---
        function renderCatalog(isInitial) {
            if (homeSectionsCache) {
                buildCatalogUI(homeSectionsCache);
                if (isInitial) self.start();
                else focusAfterSwitch(isInitial);
                return;
            }

            setLoader(self, true);
            Api.home().then(function (sections) {
                setLoader(self, false);
                homeSectionsCache = sections || [];
                if (!homeSectionsCache.length) {
                    paneCatalog.html('<div class="adrama-empty-info">Каталог ADrama пуст или временно недоступен</div>');
                } else {
                    buildCatalogUI(homeSectionsCache);
                }
                if (isInitial) self.start();
                else focusAfterSwitch(isInitial);
            }).catch(function (err) {
                setLoader(self, false);
                paneCatalog.html('<div class="adrama-empty-info">Ошибка загрузки каталога: ' + err.message + '</div>');
                if (isInitial) self.start();
                else focusAfterSwitch(isInitial);
            });
        }

        function buildCatalogUI(sections) {
            var body = $('<div class="adrama-main-body"></div>');
            var allPosters = [];
            sections.forEach(function (sec) {
                if (!sec.items || !sec.items.length) return;

                var title = sec.title || (sec.id === 'updates' ? 'Обновления' : 'Раздел');
                var line = $(
                    '<div class="items-line layer--visible layer--render">' +
                        '<div class="items-line__head">' +
                            '<div class="items-line__title">' + title + '</div>' +
                        '</div>' +
                        '<div class="items-line__body"></div>' +
                    '</div>'
                );

                var lineScroll = new Lampa.Scroll({ horizontal: true, step: 300 });
                lineScroll.body().addClass('items-cards');
                lineScroll.onWheel = function (step) {
                    if (step > 0) {
                        Nav.move('right');
                    } else {
                        if (Nav.canmove('left')) Nav.move('left');
                        else Lampa.Controller.toggle('menu');
                    }
                };

                sec.items.forEach(function (item) {
                    if (item.poster) allPosters.push(item.poster);
                    var card = createCatalogCard(item, lineScroll, line);
                    lineScroll.append(card);
                });

                line.find('.items-line__body').append(lineScroll.render());
                body.append(line);
            });

            PosterCache.preload(allPosters);

            paneCatalog.empty().append(body);
            catalogBuilt = true;
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();

            setTimeout(function () {
                if (!searchBuilt) renderSearch(false);
                if (!bookmarksBuilt) renderBookmarks(false);
            }, 300);
        }

        function createCatalogCard(item, lineScroll, line) {
            var titleRu = (item.titles && item.titles.ru) || item.title || 'Дорама';
            var year = item.year || '';
            var country = (item.countries && item.countries[0]) || '';
            var poster = item.poster || './img/img_broken.svg';
            var rating = item.rating_score ? Number(item.rating_score).toFixed(1) : '';
            var updateMsg = (item.updated && item.updated.message) ? (' · ' + item.updated.message) : '';

            var card = $(
                '<div class="card selector layer--visible layer--render">' +
                    '<div class="card__view">' +
                        '<img class="card__img" />' +
                        (rating ? ('<div class="card__vote">' + rating + '</div>') : '') +
                    '</div>' +
                    '<div class="card__title">' + titleRu + '</div>' +
                    '<div class="card__age">' + year + (country ? (' · ' + country) : '') + updateMsg + '</div>' +
                '</div>'
            );

            PosterCache.load(poster, card.find('.card__img')[0], card);

            card.on('hover:focus', function () {
                last = card[0];
                if (lineScroll) lineScroll.update(card, true);
                if (activeLineElem !== line[0]) {
                    activeLineElem = line[0];
                    if (line.is(':first-child') || line.index() === 0) {
                        scroll.reset();
                    } else {
                        scroll.update(line);
                    }
                }
                if (poster) Lampa.Background.change(PosterCache.getBlobUrl(poster) || poster);
            }).on('hover:hover', function () {
                last = card[0];
                Nav.focused(last);
            }).on('hover:enter', function () {
                Lampa.Activity.push({
                    component: 'adrama_card',
                    id: item.id,
                    item: item
                });
            });

            return card;
        }

        // --- GRID CARDS FOR SEARCH & BOOKMARKS ---
        function createGridCard(item, subtextCustom) {
            var titleRu = (item.titles && item.titles.ru) || item.title || 'Дорама';
            var year = item.year || '';
            var country = (item.countries && item.countries[0]) || '';
            var poster = item.poster || (item.details && item.details.media && item.details.media.posters && item.details.media.posters[0]) || './img/img_broken.svg';
            var rating = item.rating_score ? Number(item.rating_score).toFixed(1) : '';
            var subtext = subtextCustom !== undefined ? subtextCustom : (year + (country ? (' · ' + country) : ''));

            var card = $(
                '<div class="card selector layer--visible layer--render">' +
                    '<div class="card__view">' +
                        '<img class="card__img" />' +
                        (rating ? ('<div class="card__vote">' + rating + '</div>') : '') +
                    '</div>' +
                    '<div class="card__title">' + titleRu + '</div>' +
                    '<div class="card__age">' + subtext + '</div>' +
                '</div>'
            );

            PosterCache.load(poster, card.find('.card__img')[0], card);

            card.on('hover:focus', function () {
                last = card[0];
                scroll.update(card);
                if (poster) Lampa.Background.change(PosterCache.getBlobUrl(poster) || poster);
            }).on('hover:hover', function () {
                last = card[0];
                Nav.focused(last);
            }).on('hover:enter', function () {
                Lampa.Activity.push({
                    component: 'adrama_card',
                    id: item.id,
                    item: item
                });
            });

            return card;
        }

        // --- SEARCH TAB ---
        function renderSearch(isInitial) {
            var searchWrap = $('<div class="adrama-search-box"></div>');
            var searchBtn = $(
                '<div class="adrama-search-input-btn selector">' +
                    ICONS.search + ' <span class="search-text">' + (lastSearchQuery ? ('Поиск: ' + lastSearchQuery) : 'Нажмите для поиска дорамы...') + '</span>' +
                '</div>'
            );

            searchBtn.on('hover:focus', function () {
                last = searchBtn[0];
                scroll.reset();
            }).on('hover:enter', function () {
                Lampa.Input.edit({
                    title: 'Поиск по дорамам (ADrama)',
                    value: lastSearchQuery || '',
                    free: true,
                    nosave: true
                }, function (query) {
                    if (query && query.trim()) {
                        lastSearchQuery = query.trim();
                        searchBtn.find('.search-text').text('Поиск: ' + lastSearchQuery);
                        doSearch(lastSearchQuery);
                    }
                });
            });

            searchWrap.append(searchBtn);

            var tagsBox = $('<div class="adrama-popular-tags"></div>');
            searchWrap.append(tagsBox);

            var resultsLine = $('<div class="items-line layer--visible layer--render"><div class="items-line__body"></div></div>');
            searchWrap.append(resultsLine);

            paneSearch.empty().append(searchWrap);
            searchBuilt = true;

            function doSearch(query) {
                setLoader(self, true);
                var bodyLine = resultsLine.find('.items-line__body');
                bodyLine.empty();

                Api.search(query, 1).then(function (res) {
                    setLoader(self, false);
                    var items = [];
                    if (Array.isArray(res)) items = res;
                    else if (res && Array.isArray(res.items)) items = res.items;
                    else if (res && Array.isArray(res.data)) items = res.data;

                    if (!items.length) {
                        bodyLine.html('<div class="adrama-empty-info">По запросу «' + query + '» ничего не найдено</div>');
                        return;
                    }

                    var grid = $('<div class="category-full"></div>');
                    var postersToPreload = [];
                    items.forEach(function (it) {
                        var p = it.poster || (it.details && it.details.media && it.details.media.posters && it.details.media.posters[0]);
                        if (p) postersToPreload.push(p);
                        grid.append(createGridCard(it));
                    });
                    PosterCache.preload(postersToPreload);
                    bodyLine.append(grid);

                    if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                    Lampa.Controller.toggle('content');
                }).catch(function (err) {
                    setLoader(self, false);
                    bodyLine.html('<div class="adrama-empty-info">Ошибка поиска: ' + err.message + '</div>');
                });
            }

            if (popularQueriesCache) {
                buildTags(popularQueriesCache);
            } else {
                Api.popularQueries().then(function (res) {
                    var queries = (res && res.queries) ? res.queries : (Array.isArray(res) ? res : []);
                    popularQueriesCache = queries;
                    buildTags(popularQueriesCache);
                }).catch(function () {});
            }

            function buildTags(queries) {
                tagsBox.empty();
                (queries || []).forEach(function (q) {
                    var tag = $('<div class="adrama-pop-tag selector">' + q + '</div>');
                    tag.on('hover:focus', function () {
                        last = tag[0];
                        scroll.update(tag);
                    }).on('hover:enter', function () {
                        lastSearchQuery = q;
                        searchBtn.find('.search-text').text('Поиск: ' + q);
                        doSearch(q);
                    });
                    tagsBox.append(tag);
                });
                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            }

            if (lastSearchQuery) {
                doSearch(lastSearchQuery);
            }

            if (isInitial) self.start();
            else focusAfterSwitch(isInitial);
        }

        // --- BOOKMARKS TAB (ORIGINAL LAMPA REGISTER STYLE & PROPER HISTORY/DELETION) ---
        function renderBookmarks(isInitial) {
            if (!Auth.isLogged()) {
                var notice = $(
                    '<div class="adrama-auth-notice">' +
                        '<div class="adrama-auth-notice__icon">' + ICONS.bookmarks + '</div>' +
                        '<div class="adrama-auth-notice__title">Избранное и закладки</div>' +
                        '<div class="adrama-auth-notice__text">Войдите в свой аккаунт adrama.tv, чтобы синхронизировать сохраненные дорамы, списки просмотра и историю. Авторизация сохранится навсегда.</div>' +
                        '<div class="adrama-auth-notice__btn selector">Войти в аккаунт</div>' +
                    '</div>'
                );
                notice.find('.adrama-auth-notice__btn').on('hover:focus', function () {
                    last = this;
                    scroll.update($(this));
                }).on('hover:enter', function () {
                    promptLogin(function () {
                        switchTab('bookmarks', false);
                    });
                });

                paneBookmarks.empty().append(notice);
                if (isInitial) self.start();
                else focusAfterSwitch(isInitial);
                return;
            }

            var wrap = $('<div class="adrama-bookmarks-wrap"></div>');

            // Registers line matching original Lampa (.register.selector)
            var regLine = $('<div class="items-line layer--visible layer--render adrama-registers-line"><div class="items-line__body"></div></div>');
            var regScroll = new Lampa.Scroll({ horizontal: true, step: 250 });
            regScroll.body().addClass('items-cards adrama-registers-cards');
            regScroll.onWheel = function (step) {
                if (step > 0) Nav.move('right');
                else {
                    if (Nav.canmove('left')) Nav.move('left');
                    else Lampa.Controller.toggle('menu');
                }
            };

            var registersWrap = regScroll.body();

            BOOKMARK_LISTS.forEach(function (listCfg) {
                var isSubActive = (String(listCfg.id) === String(activeBookmarkSubTab));
                var reg = $(
                    '<div class="register selector' + (isSubActive ? ' active' : '') + '" data-id="' + listCfg.id + '">' +
                        '<div class="register__name">' + listCfg.title + '</div>' +
                        '<div class="register__counter">-</div>' +
                    '</div>'
                );

                reg.on('hover:focus', function () {
                    last = reg[0];
                    regScroll.update(reg, true);
                    if (activeLineElem !== regLine[0]) {
                        activeLineElem = regLine[0];
                        scroll.reset();
                    }
                }).on('hover:enter', function () {
                    if (activeBookmarkSubTab !== listCfg.id) {
                        registersWrap.find('.register').removeClass('active');
                        reg.addClass('active');
                        activeBookmarkSubTab = listCfg.id;
                        loadBookmarks(listCfg);
                    }
                });

                registersWrap.append(reg);
            });

            regLine.find('.items-line__body').append(regScroll.render());
            wrap.append(regLine);

            var contentLine = $('<div class="items-line layer--visible layer--render adrama-bookmarks-content"><div class="items-line__body"></div></div>');
            wrap.append(contentLine);
            paneBookmarks.empty().append(wrap);
            bookmarksBuilt = true;

            updateCounters = function () {
                Api.profile().then(function (res) {
                    var profileData = (res && res.data) ? res.data : res;
                    var stats = (profileData && profileData.stats) || {};
                    BOOKMARK_LISTS.forEach(function (l) {
                        var val = stats[l.statKey];
                        if (val !== undefined && val !== null) {
                            registersWrap.find('.register[data-id="' + l.id + '"] .register__counter').text(val);
                        }
                    });
                }).catch(function () {});
            }

            function loadBookmarks(cfg) {
                setLoader(self, true);
                var lineBody = contentLine.find('.items-line__body');
                lineBody.empty();

                var reqPromise;
                if (cfg.type === 'fav') {
                    reqPromise = Api.favorites(1);
                } else if (cfg.type === 'history') {
                    reqPromise = Api.history(1);
                } else {
                    reqPromise = Api.watchStatus(cfg.id, 1);
                }

                reqPromise.then(function (res) {
                    setLoader(self, false);
                    var items = [];
                    if (Array.isArray(res)) items = res;
                    else if (res && Array.isArray(res.items)) items = res.items;
                    else if (res && Array.isArray(res.data)) items = res.data;
                    else if (res && res.items && Array.isArray(res.items.data)) items = res.items.data;

                    if (!items.length) {
                        lineBody.html('<div class="adrama-empty-info">В этом списке пока ничего нет</div>');
                        return;
                    }

                    var grid = $('<div class="category-full"></div>');
                    items.forEach(function (entry) {
                        var it;
                        var subMsg = '';

                        if (cfg.type === 'history') {
                            it = {
                                id: entry.release_id,
                                title: entry.release_title || 'Дорама',
                                poster: entry.release_poster,
                                countries: entry.countries || [],
                                year: '',
                                rating_score: '',
                                is_favorite: entry.is_favorite ? 1 : 0,
                                watch_status: entry.watch_status || 0
                            };
                            if (entry.episode_number) {
                                subMsg = entry.episode_number + ' серия';
                                if (entry.progress_pct) subMsg += ' · ' + entry.progress_pct + '%';
                            } else if (entry.progress_pct) {
                                subMsg = entry.progress_pct + '%';
                            }
                        } else {
                            it = entry.release || entry.item || entry;
                            if (cfg.type === 'fav') it.is_favorite = 1;
                            else if (cfg.type === 'status') it.watch_status = cfg.id;
                        }

                        var card = createGridCard(it, subMsg || undefined);

                        // Attach long press handler to delete/manage right from grid
                        card.on('hover:long', function () {
                            showBookmarkMenu(it.id, it.watch_status, it.is_favorite, function () {
                                loadBookmarks(cfg);
                                updateCounters();
                            });
                        });

                        grid.append(card);
                    });
                    var postersToPreload = [];
                    items.forEach(function (entry) {
                        var it = entry.release || entry.item || entry;
                        var p = it.poster || entry.release_poster || (it.details && it.details.media && it.details.media.posters && it.details.media.posters[0]);
                        if (p) postersToPreload.push(p);
                    });
                    PosterCache.preload(postersToPreload);

                    lineBody.append(grid);
                    if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                    Lampa.Controller.toggle('content');
                }).catch(function (err) {
                    setLoader(self, false);
                    var msg = (err && err.message) ? err.message : '';
                    if (msg.indexOf('Token expired') >= 0 || msg.indexOf('401') >= 0 || msg.indexOf('token') >= 0) {
                        var notice = $(
                            '<div class="adrama-auth-notice">' +
                                '<div class="adrama-auth-notice__icon">' + ICONS.bookmarks + '</div>' +
                                '<div class="adrama-auth-notice__title">Требуется вход в аккаунт</div>' +
                                '<div class="adrama-auth-notice__text">Срок действия предыдущей сессии истек. Войдите в свой аккаунт adrama.tv один раз, и авторизация сохранится навсегда.</div>' +
                                '<div class="adrama-auth-notice__btn selector">Войти в аккаунт</div>' +
                            '</div>'
                        );
                        notice.find('.adrama-auth-notice__btn').on('hover:focus', function () {
                            last = this;
                            scroll.update($(this));
                        }).on('hover:enter', function () {
                            promptLogin(function () {
                                switchTab('bookmarks', false);
                            });
                        });
                        lineBody.html(notice);
                        if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                        Lampa.Controller.toggle('content');
                        return;
                    }
                    lineBody.html('<div class="adrama-empty-info" style="color:#ff5252">Ошибка загрузки: ' + msg + '</div>');
                });
            }

            var initialCfg = BOOKMARK_LISTS.find(function (c) { return String(c.id) === String(activeBookmarkSubTab); }) || BOOKMARK_LISTS[0];
            loadBookmarks(initialCfg);
            updateCounters();

            if (isInitial) self.start();
            else focusAfterSwitch(isInitial);
        }

        function focusAfterSwitch(isInitial) {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            Lampa.Controller.collectionSet(scroll.render());
            // ALWAYS keep focus on the active tab button when switching tabs so focus never skips tabs
            var target = navTabs.find('.navigation-tabs__button[data-tab="' + currentTab + '"]')[0] ||
                         navTabs.find('.navigation-tabs__button.active')[0] ||
                         getActivePane().find('.selector:first')[0];
            last = target;
            scroll.reset();
            Lampa.Controller.collectionFocus(last || false, scroll.render());
            if (window.Navigator) {
                window.Navigator.focus(last);
            }
            $(last).trigger('hover:focus');
        }

        function getFocusedElement() {
            var cur = document.querySelector('.focus');
            if (cur) return cur;
            if (window.Navigator && window.Navigator._focus) return window.Navigator._focus;
            return last || null;
        }

        function isTabsFocused() {
            var cur = getFocusedElement();
            return Boolean(cur && (cur.classList.contains('navigation-tabs__button') || $.contains(navTabs[0], cur)));
        }

        function focusTabs(preferTab) {
            var tabKey = preferTab || currentTab;
            var targetTab = navTabs.find('.navigation-tabs__button[data-tab="' + tabKey + '"]')[0] ||
                            navTabs.find('.navigation-tabs__button.active')[0] ||
                            navTabs.find('.navigation-tabs__button:first')[0];
            if (targetTab) {
                last = targetTab;
                scroll.reset();
                Lampa.Controller.collectionSet(scroll.render());
                Lampa.Controller.collectionFocus(targetTab, scroll.render());
                if (window.Navigator) {
                    window.Navigator.focus(targetTab);
                }
                $(targetTab).trigger('hover:focus');
            }
        }

        function handleLeft() {
            if (isTabsFocused()) {
                var cur = getFocusedElement();
                var tabBtn = $(cur).closest('.navigation-tabs__button');
                var tabName = tabBtn.data('tab') || currentTab;

                if (tabName === 'bookmarks') {
                    switchTab('search', false);
                    return;
                } else if (tabName === 'search') {
                    switchTab('catalog', false);
                    return;
                } else if (tabName === 'catalog') {
                    Lampa.Controller.toggle('menu');
                    return;
                }
            }

            if (Nav.canmove('left')) {
                Nav.move('left');
            } else {
                Lampa.Controller.toggle('menu');
            }
        }

        function handleRight() {
            if (isTabsFocused()) {
                var cur = getFocusedElement();
                var tabBtn = $(cur).closest('.navigation-tabs__button');
                var tabName = tabBtn.data('tab') || currentTab;

                if (tabName === 'catalog') {
                    switchTab('search', false);
                    return;
                } else if (tabName === 'search') {
                    switchTab('bookmarks', false);
                    return;
                } else if (tabName === 'bookmarks') {
                    return; // rightmost tab, stay on it
                }
            }

            Nav.move('right');
        }

        function handleUp() {
            if (isTabsFocused()) {
                Lampa.Controller.toggle('head');
                return;
            }

            var cur = getFocusedElement();

            if (Nav.canmove('up')) {
                Nav.move('up');
                if (isTabsFocused()) {
                    scroll.reset();
                }
                return;
            }

            if (cur) {
                var curLine = $(cur).closest('.items-line');
                if (curLine.length) {
                    var prevLine = curLine.prevAll('.items-line:first');
                    if (prevLine.length) {
                        var prevCards = prevLine.find('.selector');
                        if (prevCards.length) {
                            var curR = cur.getBoundingClientRect();
                            var curX = (curR.left + curR.right) / 2;
                            var bestCard = prevCards[0];
                            var bestDist = Infinity;
                            prevCards.each(function () {
                                var r = this.getBoundingClientRect();
                                var c = (r.left + r.right) / 2;
                                var d = Math.abs(c - curX);
                                if (d < bestDist) {
                                    bestDist = d;
                                    bestCard = this;
                                }
                            });
                            if (bestCard) {
                                last = bestCard;
                                if (window.Navigator) window.Navigator.focus(bestCard);
                                $(bestCard).trigger('hover:focus');
                                return;
                            }
                        }
                    }
                }

                var inBmGrid = $(cur).closest('.adrama-bookmarks-content');
                if (inBmGrid.length) {
                    var registers = getActivePane().find('.adrama-registers-line .register.selector');
                    if (registers.length) {
                        var curR = cur.getBoundingClientRect();
                        var curX = (curR.left + curR.right) / 2;
                        var bestReg = registers[0];
                        var bestDist = Infinity;
                        registers.each(function () {
                            var r = this.getBoundingClientRect();
                            var c = (r.left + r.right) / 2;
                            var d = Math.abs(c - curX);
                            if (d < bestDist) {
                                bestDist = d;
                                bestReg = this;
                            }
                        });
                        if (bestReg) {
                            last = bestReg;
                            if (window.Navigator) window.Navigator.focus(bestReg);
                            $(bestReg).trigger('hover:focus');
                            return;
                        }
                    }
                }

                var inSearchResults = $(cur).closest('.adrama-search-box .items-line');
                if (inSearchResults.length) {
                    var tags = getActivePane().find('.adrama-popular-tags .selector');
                    var sBtn = getActivePane().find('.adrama-search-input-btn.selector')[0];
                    if (tags.length) {
                        var curR = cur.getBoundingClientRect();
                        var curX = (curR.left + curR.right) / 2;
                        var bestTag = tags[0];
                        var bestDist = Infinity;
                        tags.each(function () {
                            var r = this.getBoundingClientRect();
                            var c = (r.left + r.right) / 2;
                            var d = Math.abs(c - curX);
                            if (d < bestDist) {
                                bestDist = d;
                                bestTag = this;
                            }
                        });
                        if (bestTag) {
                            last = bestTag;
                            if (window.Navigator) window.Navigator.focus(bestTag);
                            $(bestTag).trigger('hover:focus');
                            return;
                        }
                    } else if (sBtn) {
                        last = sBtn;
                        if (window.Navigator) window.Navigator.focus(sBtn);
                        $(sBtn).trigger('hover:focus');
                        return;
                    }
                }
            }

            focusTabs();
        }

        function handleDown() {
            if (isTabsFocused()) {
                if (Nav.canmove('down')) {
                    Nav.move('down');
                    return;
                }
                var firstEl = getActivePane().find('.selector:first')[0];
                if (firstEl) {
                    last = firstEl;
                    if (window.Navigator) window.Navigator.focus(firstEl);
                    $(firstEl).trigger('hover:focus');
                }
                return;
            }

            if (Nav.canmove('down')) {
                Nav.move('down');
                return;
            }

            var cur = getFocusedElement();
            if (cur) {
                var curLine = $(cur).closest('.items-line');
                if (curLine.length) {
                    var nextLine = curLine.nextAll('.items-line:first');
                    if (nextLine.length) {
                        var nextCards = nextLine.find('.selector');
                        if (nextCards.length) {
                            var curR = cur.getBoundingClientRect();
                            var curX = (curR.left + curR.right) / 2;
                            var bestCard = nextCards[0];
                            var bestDist = Infinity;
                            nextCards.each(function () {
                                var r = this.getBoundingClientRect();
                                var c = (r.left + r.right) / 2;
                                var d = Math.abs(c - curX);
                                if (d < bestDist) {
                                    bestDist = d;
                                    bestCard = this;
                                }
                            });
                            if (bestCard) {
                                last = bestCard;
                                if (window.Navigator) window.Navigator.focus(bestCard);
                                $(bestCard).trigger('hover:focus');
                            }
                        }
                    }
                }
            }
        }

        this.start = function () {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            setTimeout(function () {
                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            }, 100);

            Lampa.Controller.add('content', {
                toggle: function () {
                    ControllerFocus();
                },
                left: function () {
                    handleLeft();
                },
                right: function () {
                    handleRight();
                },
                up: function () {
                    handleUp();
                },
                down: function () {
                    handleDown();
                },
                back: function () {
                    if (currentTab !== 'catalog') {
                        switchTab('catalog', false);
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });
            Lampa.Controller.toggle('content');
        };

        function ControllerFocus() {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            Lampa.Controller.collectionSet(scroll.render());
            if (!last || !$.contains(scroll.render()[0], last)) {
                last = navTabs.find('.navigation-tabs__button.active')[0] || scroll.render().find('.selector:first')[0];
            }
            if (isTabsFocused() || $.contains(navTabs[0], last)) {
                scroll.reset();
            }
            Lampa.Controller.collectionFocus(last || false, scroll.render());
        }

        this.pause = function () {};
        this.stop = function () {};
        this.render = function (js) { return scroll.render(js); };
        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    // --- 6. COMPONENT: ADRAMA CARD (DETAILS & EPISODES) ---
    function ComponentCard(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        scroll.minus();
        var html = $('<div class="layer--wheight"></div>');
        var bg = $('<img class="full-start__background" />');
        html.append(bg);
        html.append(scroll.render());

        scroll.onScroll = function (pos) {
            bg.toggleClass('dim', pos > 0);
        };

        scroll.onWheel = function (step) {
            if (step > 0) {
                if (Nav.canmove('down')) Nav.move('down');
            } else {
                if (Nav.canmove('up')) Nav.move('up');
                else Lampa.Controller.toggle('head');
            }
        };

        var last;
        var self = this;
        var releaseData = null;
        var seasonsData = [];
        var activeLineElem = null;

        this.create = function () {
            setLoader(self, true);

            Promise.all([
                Api.release(object.id),
                Api.episodes(object.id).catch(function () { return { seasons: [] }; })
            ]).then(function (results) {
                setLoader(self, false);
                releaseData = results[0];
                var epData = results[1];
                seasonsData = (epData && epData.seasons) ? epData.seasons : [];

                buildView();
                self.start();
            }).catch(function (err) {
                setLoader(self, false);
                Lampa.Noty.show('Ошибка загрузки дорамы: ' + err.message);
                Lampa.Activity.backward();
            });

            return html;
        };

        function buildView() {
            var sum = releaseData.summary || {};
            var det = releaseData.details || {};
            var titleRu = (sum.titles && sum.titles.ru) || (object.item && object.item.title) || 'Дорама';
            var titleEn = (sum.titles && sum.titles.en) || '';
            var poster = sum.poster || (det.media && det.media.posters && det.media.posters[0]) || '';
            var rating = sum.rating_score ? Number(sum.rating_score).toFixed(1) : '';
            var year = sum.year || '';
            var country = (sum.countries && sum.countries.join(', ')) || '';
            var runtime = sum.runtime ? (sum.runtime + ' мин') : '';
            var desc = det.description || sum.description_short || 'Описание отсутствует';
            var genres = sum.genres || [];
            var genresStr = genres.join(' · ');

            // 1. Background image
            if (poster) {
                PosterCache.load(poster, bg[0], null);
                Lampa.Background.change(PosterCache.getBlobUrl(poster) || poster);
            }

            // 2. Section 1: Header (full-start-new)
            var start = Lampa.Template.get('full_start_new', {
                title: titleRu,
                tagline: titleEn,
                rating: rating || '0.0'
            });

            start.find('.full-start-new__left').removeClass('hide');
            var posterBox = start.find('.full-start-new__poster');
            posterBox.addClass('card--tv loaded');
            if (!posterBox.find('.card__type').length) {
                posterBox.append('<div class="card__type">TV</div>');
            }
            if (poster) {
                var pImg = start.find('.full-start-new__img');
                PosterCache.load(poster, pImg[0], posterBox);
            }

            var headHtml = [];
            if (year) headHtml.push('<span>' + year + '</span>');
            if (country) headHtml.push('<span>' + country + '</span>');
            start.find('.full-start-new__head').html(headHtml.join(' · '));

            start.find('.source--name').text('ADRAMA');
            if (!rating || rating === '0.0') {
                start.find('.rate--tmdb').addClass('hide');
            }
            var statusBadge = start.find('.full-start__status');
            if (sum.status === 1) {
                statusBadge.removeClass('hide').text('Онгоинг');
            } else if (sum.status === 2) {
                statusBadge.removeClass('hide').text('Завершен');
            } else {
                statusBadge.addClass('hide');
            }

            var detailsItems = [];
            if (runtime) detailsItems.push('<span>' + runtime + '</span>');
            if (sum.episodes && sum.episodes.total) {
                detailsItems.push('<span>Серий: ' + sum.episodes.total + '</span>');
            }
            if (genresStr) detailsItems.push('<span>' + genresStr + '</span>');
            start.find('.full-start-new__details').html(detailsItems.join('<span class="full-start-new__split">●</span>'));

            start.find('.full-start-new__reactions').remove();
            start.find('.button--reaction, .button--subscribe, .button--options, .buttons--container').remove();

            var btnPlay = start.find('.button--play');
            var btnBook = start.find('.button--book');
            btnBook.find('span').text('В закладки');

            btnPlay.on('hover:enter', function () {
                var firstEpBtn = scroll.render().find('.full-episode.selector:first');
                if (firstEpBtn.length) {
                    firstEpBtn.trigger('hover:enter');
                } else {
                    Lampa.Noty.show('Серии не найдены');
                }
            }).on('hover:focus', function (e) {
                last = e.target;
                if (activeLineElem !== start[0]) {
                    activeLineElem = start[0];
                    scroll.update(start);
                }
            });

            btnBook.on('hover:enter', function () {
                showBookmarkMenu(sum.id || object.id, sum.watch_status, sum.is_favorite, function (newStatus, isFavNow) {
                    sum.watch_status = newStatus;
                    sum.is_favorite = isFavNow;
                });
            }).on('hover:focus', function (e) {
                last = e.target;
                if (activeLineElem !== start[0]) {
                    activeLineElem = start[0];
                    scroll.update(start);
                }
            });

            scroll.append(start);

            // 3. Section 2: Details / Description (full-descr)
            var descrLine = $(
                '<div class="items-line layer--visible layer--render">' +
                    '<div class="items-line__head"><div class="items-line__title">Детали</div></div>' +
                    '<div class="items-line__body"></div>' +
                '</div>'
            );
            var descr = Lampa.Template.get('full_descr', {
                text: desc + '<br><br>',
                relise: year || '----',
                budget: '',
                countries: country || '----'
            });
            descr.find('.full--budget').remove();
            if (!country) descr.find('.full--countries').remove();

            if (genres.length) {
                var tagsBox = descr.find('.full-descr__tags');
                tagsBox.empty();
                genres.forEach(function (g) {
                    tagsBox.append('<div class="full-descr__tag selector"><div>' + g + '</div></div>');
                });
            }

            descr.find('.full-descr__text').on('hover:enter', function () {
                Lampa.Modal.open({
                    title: titleRu,
                    html: $('<div class="about" style="line-height:1.6;font-size:1.2em;padding:1em;">' + desc + '</div>'),
                    size: 'large',
                    onBack: function () {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('content');
                    },
                    onSelect: function () {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('content');
                    }
                });
            }).on('hover:focus', function (e) {
                last = e.target;
                if (activeLineElem !== descrLine[0]) {
                    activeLineElem = descrLine[0];
                    scroll.update(descrLine);
                }
            });

            descrLine.find('.items-line__body').append(descr);
            scroll.append(descrLine);

            // 4. Section 3: Episodes carousel
            buildEpisodesSection();

            // 5. Section 4: Notify external plugins (e.g. frames.js)
            if (window.Lampa && window.Lampa.Listener) {
                window.Lampa.Listener.send('adrama_card', {
                    type: 'complite',
                    id: object.id,
                    release: releaseData,
                    scroll: scroll,
                    html: html
                });
            }

            // 6. Section 5: Comments carousel
            buildCommentsSection();
        }

        function buildEpisodesSection() {
            if (!seasonsData || !seasonsData.length) return;

            seasonsData.forEach(function (season, sIdx) {
                if (!season.episodes || !season.episodes.length) return;

                var sNum = season.number || (sIdx + 1);
                var sTitle = season.title || (sNum + ' сезон');
                var totalEps = season.episodes.length;

                var epLine = $(
                    '<div class="items-line layer--visible layer--render">' +
                        '<div class="items-line__head">' +
                            '<div class="items-line__title">Серии' + (seasonsData.length > 1 ? (' — ' + sTitle) : '') + ' (' + totalEps + ')</div>' +
                        '</div>' +
                        '<div class="items-line__body"></div>' +
                    '</div>'
                );

                var epScroll = new Lampa.Scroll({
                    horizontal: true,
                    step: 300
                });
                epScroll.body().addClass('full-episodes');
                epScroll.onWheel = function (step) {
                    if (step > 0) Nav.move('right');
                    else {
                        if (Nav.canmove('left')) Nav.move('left');
                        else Lampa.Controller.toggle('menu');
                    }
                };

                season.episodes.forEach(function (ep) {
                    var epCard = createEpisodeCard(ep, epScroll, epLine);
                    epScroll.append(epCard);
                });

                epLine.find('.items-line__body').append(epScroll.render());
                scroll.append(epLine);
            });
        }

        function createEpisodeCard(ep, epScroll, epLine) {
            var epNum = ep.number || 1;
            var epTitle = ep.title || (epNum + ' серия');
            var types = (ep.translation_type && ep.translation_type.length)
                ? ep.translation_type.map(function (t) {
                    return t === 'voice' ? 'Озвучка' : (t === 'subtitles' ? 'Субтитры' : t);
                }).join(' / ')
                : 'Серия ' + epNum;
            var previewImg = ep.preview || (releaseData.summary && releaseData.summary.poster) || '';

            var card = Lampa.Template.get('full_episode', {
                num: epNum,
                name: epTitle,
                date: types
            });
            card.addClass('full-episode--small');

            var img = card.find('img');
            if (previewImg) {
                PosterCache.load(previewImg, img[0], card);
                img.on('load', function () {
                    card.addClass('full-episode--loaded');
                });
            } else {
                img.attr('src', './img/img_broken.svg');
            }

            if (ep.progress_pct && ep.progress_pct > 0) {
                card.append('<div class="full-episode__viewed" style="display:block;"></div>');
                if (ep.progress_pct >= 90) card.addClass('full-episode--viewed');
            }

            card.on('hover:focus', function () {
                last = card[0];
                epScroll.update(card, true);
                if (activeLineElem !== epLine[0]) {
                    activeLineElem = epLine[0];
                    scroll.update(epLine);
                }
            }).on('hover:hover', function () {
                last = card[0];
                Nav.focused(last);
            }).on('hover:enter', function () {
                openTranslationsModal(ep);
            });

            return card;
        }

        function openTranslationsModal(episode) {
            Lampa.Noty.show('Загрузка озвучек...');

            Api.episodeTranslations(episode.id).then(function (res) {
                var translations = (res && res.translations) ? res.translations : [];
                if (!translations.length) {
                    Lampa.Noty.show('Нет доступных переводов для этой серии');
                    return;
                }

                var items = [];
                translations.forEach(function (tr) {
                    var sources = (tr.sources || []).map(function (s) { return s.title; }).join(', ');
                    items.push({
                        title: tr.title + (sources ? (' — ' + sources) : ''),
                        translation: tr
                    });
                });

                Lampa.Select.show({
                    title: 'Выберите озвучку (' + (episode.number || '') + ' серия)',
                    items: items,
                    onSelect: function (sel) {
                        Lampa.Controller.toggle('content');
                        var tr = sel.translation;
                        if (!tr.sources || !tr.sources.length) {
                            Lampa.Noty.show('У выбранной озвучки нет источников');
                            return;
                        }
                        var chosenSource = tr.sources.find(function (s) { return s.mode === 'direct' || s.resolver === 'collaps' || (s.title && s.title.toLowerCase().indexOf('kodik') >= 0) || (s.url && s.url.indexOf('kodik') >= 0); }) || tr.sources[0];
                        Playback.start(releaseData.summary || object.item, episode, tr, chosenSource);
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    }
                });
            }).catch(function (err) {
                Lampa.Noty.show('Ошибка загрузки переводов: ' + err.message);
            });
        }

        function escapeHtml(str) {
            if (!str) return '';
            return (str + '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatCommentDate(dStr) {
            if (!dStr) return '';
            try {
                var parts = dStr.split(' ')[0].split('-');
                if (parts.length === 3) {
                    return parts[2] + '.' + parts[1] + '.' + parts[0];
                }
            } catch (e) {}
            return dStr;
        }

        function buildCommentsSection() {
            var releaseId = object.id || (releaseData && releaseData.id) || (releaseData && releaseData.summary && releaseData.summary.id);
            if (!releaseId) return;

            Api.comments(releaseId, 1).then(function (res) {
                var items = (res && res.items) || (res && res.data && res.data.items) || [];
                var total = (res && (res.total !== undefined ? res.total : res.total_all)) || (res && res.data && (res.data.total !== undefined ? res.data.total : res.data.total_all)) || items.length;
                if (!items.length) return;

                var titleText = 'Комментарии' + (total ? (' (' + total + ')') : '');

                var commentsLine = $(
                    '<div class="items-line layer--visible layer--render adrama-comments-line">' +
                        '<div class="items-line__head">' +
                            '<div class="items-line__title">' + escapeHtml(titleText) + '</div>' +
                        '</div>' +
                        '<div class="items-line__body"></div>' +
                    '</div>'
                );

                var commentsScroll = new Lampa.Scroll({
                    horizontal: true,
                    step: 300
                });
                commentsScroll.body().addClass('full-reviews adrama-comments-scroll');
                commentsScroll.onWheel = function (step) {
                    if (step > 0) Nav.move('right');
                    else {
                        if (Nav.canmove('left')) Nav.move('left');
                        else Lampa.Controller.toggle('menu');
                    }
                };

                items.forEach(function (comment) {
                    var card = createCommentCard(comment, commentsScroll, commentsLine);
                    commentsScroll.append(card);
                });

                var currentPage = 1;
                var moreCard = null;

                function updateMoreCard(hasMore, remaining) {
                    if (!hasMore) {
                        if (moreCard) {
                            moreCard.remove();
                            moreCard = null;
                        }
                        return;
                    }
                    if (!moreCard) {
                        moreCard = $(
                            '<div class="full-review selector layer--visible adrama-comment-card adrama-comment-card--more">' +
                                '<div class="adrama-comment-card__more-content">' +
                                    '<div class="adrama-comment-card__more-icon">' +
                                        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
                                    '</div>' +
                                    '<div class="adrama-comment-card__more-title">Еще комментарии</div>' +
                                    '<div class="adrama-comment-card__more-count">Осталось: ' + remaining + '</div>' +
                                '</div>' +
                            '</div>'
                        );

                        moreCard.on('hover:focus', function () {
                            last = moreCard[0];
                            commentsScroll.update(moreCard, true);
                            if (activeLineElem !== commentsLine[0]) {
                                activeLineElem = commentsLine[0];
                                scroll.update(commentsLine);
                            }
                        }).on('hover:hover', function () {
                            last = moreCard[0];
                            Nav.focused(last);
                        }).on('hover:enter', function () {
                            loadMoreComments();
                        });

                        commentsScroll.append(moreCard);
                        Lampa.Controller.collectionAppend(moreCard);
                    } else {
                        moreCard.find('.adrama-comment-card__more-count').text('Осталось: ' + remaining);
                    }
                }

                function loadMoreComments() {
                    Lampa.Noty.show('Загрузка комментариев...');
                    currentPage++;
                    Api.comments(releaseId, currentPage).then(function (res2) {
                        var nextItems = (res2 && res2.items) || (res2 && res2.data && res2.data.items) || [];
                        if (!nextItems.length) {
                            updateMoreCard(false);
                            return;
                        }
                        var newCards = [];
                        nextItems.forEach(function (c) {
                            var card = createCommentCard(c, commentsScroll, commentsLine);
                            if (moreCard) {
                                moreCard.before(card);
                            } else {
                                commentsScroll.append(card);
                            }
                            newCards.push(card);
                        });
                        newCards.forEach(function (c) {
                            Lampa.Controller.collectionAppend(c);
                        });

                        var loadedCount = commentsScroll.render().find('.adrama-comment-card:not(.adrama-comment-card--more)').length;
                        var remaining = total - loadedCount;
                        if (remaining > 0 && nextItems.length >= 20) {
                            updateMoreCard(true, remaining);
                        } else {
                            updateMoreCard(false);
                        }

                        if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                    }).catch(function (err) {
                        Lampa.Noty.show('Не удалось загрузить комментарии');
                    });
                }

                if (total > items.length && items.length >= 20) {
                    updateMoreCard(true, total - items.length);
                }

                commentsLine.find('.items-line__body').append(commentsScroll.render());

                var framesLine = scroll.render().find('.items-line--frames');
                if (framesLine.length) {
                    framesLine.after(commentsLine);
                } else {
                    scroll.append(commentsLine);
                }

                Lampa.Controller.collectionAppend(commentsLine.find('.selector'));

                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                if (Lampa.Layer && Lampa.Layer.visible) Lampa.Layer.visible(scroll.render(true));
            }).catch(function (err) {
                console.error('ADRAMA COMMENTS: catch err =', err);
            });
        }

        function createCommentCard(comment, commentsScroll, commentsLine) {
            var author = comment.author || {};
            var authorName = author.name || 'Пользователь';
            var avatarUrl = author.avatar || '';
            var dateStr = formatCommentDate(comment.date);
            var isSpoiler = !!comment.is_spoiler;
            var rawText = (comment.text || '').trim();

            var card = $(
                '<div class="full-review selector layer--visible adrama-comment-card' + (isSpoiler ? ' adrama-comment--spoiler' : '') + '">' +
                    '<div class="adrama-comment-card__header">' +
                        '<div class="adrama-comment-card__avatar">' +
                            (avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" alt="" />' : '<div class="adrama-comment-card__avatar-placeholder">' + escapeHtml(authorName.charAt(0).toUpperCase()) + '</div>') +
                        '</div>' +
                        '<div class="adrama-comment-card__info">' +
                            '<div class="adrama-comment-card__author">' + escapeHtml(authorName) + '</div>' +
                            '<div class="adrama-comment-card__meta">' +
                                (dateStr ? '<span class="adrama-comment-card__date">' + escapeHtml(dateStr) + '</span>' : '') +
                                (isSpoiler ? '<span class="adrama-comment-card__spoiler-badge">Спойлер</span>' : '') +
                            '</div>' +
                        '</div>' +
                        (comment.score !== undefined && comment.score !== 0 ? '<div class="adrama-comment-card__score ' + (comment.score > 0 ? 'positive' : 'negative') + '">' + (comment.score > 0 ? ('+' + comment.score) : comment.score) + '</div>' : '') +
                    '</div>' +
                    '<div class="full-review__text adrama-comment-card__text' + (isSpoiler ? ' adrama-comment-spoiler-text' : '') + '">' +
                        escapeHtml(rawText) +
                    '</div>' +
                '</div>'
            );

            var img = card.find('.adrama-comment-card__avatar img');
            if (img.length) {
                img.on('error', function () {
                    img.replaceWith('<div class="adrama-comment-card__avatar-placeholder">' + escapeHtml(authorName.charAt(0).toUpperCase()) + '</div>');
                });
            }

            card.on('hover:focus', function () {
                last = card[0];
                commentsScroll.update(card, true);
                if (activeLineElem !== commentsLine[0]) {
                    activeLineElem = commentsLine[0];
                    scroll.update(commentsLine);
                }
            }).on('hover:hover', function () {
                last = card[0];
                Nav.focused(last);
            }).on('hover:enter', function () {
                openCommentModal(comment);
            });

            return card;
        }

        function openCommentModal(comment) {
            var author = comment.author || {};
            var authorName = author.name || 'Пользователь';
            var avatarUrl = author.avatar || '';
            var dateStr = formatCommentDate(comment.date);
            var isSpoiler = !!comment.is_spoiler;
            var rawText = (comment.text || '').trim();

            var textHtml = escapeHtml(rawText).replace(/\r?\n/g, '<br>');

            var modalHtml = $(
                '<div class="adrama-comment-modal">' +
                    '<div class="adrama-comment-modal__header">' +
                        '<div class="adrama-comment-modal__avatar">' +
                            (avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" alt="" />' : '<div class="adrama-comment-card__avatar-placeholder">' + escapeHtml(authorName.charAt(0).toUpperCase()) + '</div>') +
                        '</div>' +
                        '<div class="adrama-comment-modal__info">' +
                            '<div class="adrama-comment-modal__author">' + escapeHtml(authorName) + '</div>' +
                            '<div class="adrama-comment-modal__meta">' +
                                (dateStr ? '<span class="adrama-comment-modal__date">' + escapeHtml(dateStr) + '</span>' : '') +
                                (isSpoiler ? '<span class="adrama-comment-card__spoiler-badge">Спойлер</span>' : '') +
                                (comment.score !== undefined && comment.score !== 0 ? '<span class="adrama-comment-card__score ' + (comment.score > 0 ? 'positive' : 'negative') + '">' + (comment.score > 0 ? ('+' + comment.score) : comment.score) + '</span>' : '') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="adrama-comment-modal__body">' +
                        textHtml +
                    '</div>' +
                '</div>'
            );

            var img = modalHtml.find('.adrama-comment-modal__avatar img');
            if (img.length) {
                img.on('error', function () {
                    img.replaceWith('<div class="adrama-comment-card__avatar-placeholder">' + escapeHtml(authorName.charAt(0).toUpperCase()) + '</div>');
                });
            }

            Lampa.Modal.open({
                title: 'Комментарий',
                html: modalHtml,
                size: 'medium',
                buttons: [
                    {
                        name: 'Закрыть',
                        onSelect: function () {
                            Lampa.Modal.close();
                            Lampa.Controller.toggle('content');
                        }
                    }
                ],
                onBack: function () {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('content');
                }
            });
        }

        this.start = function () {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            setTimeout(function () {
                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            }, 100);

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    if (!last) last = scroll.render().find('.selector:first')[0];
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: function () {
                    if (Nav.canmove('left')) Nav.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    Nav.move('right');
                },
                up: function () {
                    if (Nav.canmove('up')) Nav.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    if (Nav.canmove('down')) Nav.move('down');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function (js) { return js ? html[0] : html; };
        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    // --- 7. COMPONENT: ADRAMA SEARCH (FORWARDER) ---
    function ComponentSearch(object) {
        object = object || {};
        object.tab = 'search';
        return new ComponentMain(object);
    }

    // --- 8. COMPONENT: ADRAMA BOOKMARKS (FORWARDER) ---
    function ComponentBookmarks(object) {
        object = object || {};
        object.tab = 'bookmarks';
        return new ComponentMain(object);
    }

    // --- 9. COMPONENT: ADRAMA HISTORY (FORWARDER) ---
    function ComponentHistory(object) {
        object = object || {};
        object.tab = 'bookmarks';
        object.subTab = 'history';
        return new ComponentMain(object);
    }

    // --- 10. AUTH MODAL / PROMPT ---
    function promptLogin(onSuccess) {
        Lampa.Input.edit({
            title: 'ADrama: Email или логин',
            value: '',
            free: true,
            nosave: true
        }, function (email) {
            if (!email || !email.trim()) return;

            Lampa.Input.edit({
                title: 'ADrama: Пароль',
                value: '',
                free: true,
                nosave: true,
                password: true
            }, function (pass) {
                if (!pass || !pass.trim()) return;

                Lampa.Noty.show('Авторизация в ADrama...');
                Api.signin(email.trim(), pass.trim()).then(function (res) {
                    if (res && res.access_token) {
                        Auth.save(res.access_token, res.profile || res.user || { name: email.trim() }, res.refresh_token, email.trim(), pass.trim());
                        Lampa.Noty.show('Успешный вход в ADrama!');
                        if (onSuccess) onSuccess();
                    } else {
                        Lampa.Noty.show('Не удалось получить токен авторизации');
                    }
                }).catch(function (err) {
                    Lampa.Noty.show('Ошибка входа: ' + err.message);
                });
            });
        });
    }

    // --- 11. INITIALIZATION & HOOKS ---
    function init() {
        PosterCache.init();

        // Register Components in Lampa
        Lampa.Component.add('adrama', ComponentMain);
        Lampa.Component.add('adrama_main', ComponentMain);
        Lampa.Component.add('adrama_card', ComponentCard);
        Lampa.Component.add('adrama_search', ComponentSearch);
        Lampa.Component.add('adrama_bookmarks', ComponentBookmarks);
        Lampa.Component.add('adrama_history', ComponentHistory);

        // Inject Stylesheet
        if (!$('link[href*="adrama.css"]').length) {
            $('head').append('<style id="adrama-styles">' + "/* ADrama Custom Styles for Lampa on webOS */\n\n.adrama-main-body {\n    padding-top: 0.5em !important;\n    padding-bottom: 3.5em !important;\n}\n\n/* Horizontal card lines layout for Catalog */\n.items-cards {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    align-items: flex-start !important;\n    padding: 0.8em 1.5em 1.2em 1.5em !important;\n}\n\n.items-cards .card {\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    width: 12.75em !important;\n    margin-right: 1.2em !important;\n}\n\n.items-line {\n    position: relative;\n    margin-bottom: 1.5em;\n}\n\n.items-line__head {\n    padding: 0 1.5em;\n    margin-bottom: 0.4em;\n}\n\n.items-line__title {\n    font-size: 1.4em;\n    font-weight: 700;\n    color: #fff;\n}\n\n.items-line__body {\n    overflow: visible !important;\n    position: relative !important;\n}\n\n/* Card poster vote badge: bottom-right corner */\n.card__view .card__vote {\n    position: absolute !important;\n    right: 0.3em !important;\n    bottom: 0.3em !important;\n    top: auto !important;\n    left: auto !important;\n    z-index: 2 !important;\n    background: rgba(0, 0, 0, 0.6) !important;\n    color: #fff !important;\n    padding: 0.2em 0.4em !important;\n    border-radius: 0.3em !important;\n    font-size: 0.85em !important;\n    font-weight: 700 !important;\n    line-height: 1 !important;\n}\n\n/* TV card grid layout for Search, Bookmarks, and History */\n.category-full {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-wrap: wrap !important;\n    flex-wrap: wrap !important;\n    padding: 1.5em 2em !important;\n    gap: 1.2em !important;\n}\n\n.category-full .card {\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    width: 12.75em !important;\n    margin: 0 1.2em 1.5em 0 !important;\n}\n\n/* Native Lampa Card Details (full-start-new / full-descr / full-episodes) */\n.layer--wheight {\n    position: relative;\n    width: 100%;\n    min-height: 100vh;\n}\n\n.full-start__background {\n    position: fixed;\n    top: 0;\n    left: 0;\n    width: 100vw;\n    height: 100vh;\n    object-fit: cover;\n    filter: blur(22px) brightness(0.28);\n    -webkit-filter: blur(22px) brightness(0.28);\n    z-index: -1;\n    pointer-events: none;\n    transform: scale(1.08);\n    -webkit-transform: scale(1.08);\n    opacity: 0;\n    transition: opacity 0.4s ease, filter 0.4s ease;\n    -webkit-transition: opacity 0.4s ease, -webkit-filter 0.4s ease;\n}\n\n.full-start__background.loaded {\n    opacity: 0.65;\n}\n\n.full-start__background.dim {\n    opacity: 0.25;\n    filter: blur(30px) brightness(0.15);\n    -webkit-filter: blur(30px) brightness(0.15);\n}\n\n/* Card details poster visibility fix */\n.full-start-new__poster img,\n.full-start-new__poster.loaded img,\n.full-start-new__img {\n    opacity: 1 !important;\n    display: block !important;\n}\n\n.full-start-new__head {\n    font-size: 1.15em;\n    color: rgba(255, 255, 255, 0.7);\n    margin-bottom: 0.4em;\n}\n\n.full-start-new__split {\n    margin: 0 0.5em;\n    opacity: 0.5;\n    font-size: 0.7em;\n    vertical-align: middle;\n}\n\n/* Episodes Carousel */\n.full-episodes {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    padding: 0.8em 1.5em 1.5em 1.5em !important;\n}\n\n.full-episodes .full-episode {\n    margin-right: 1.2em !important;\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n}\n\n.full-descr__tag {\n    display: inline-block;\n    margin-right: 0.8em;\n    margin-bottom: 0.6em;\n    padding: 0.3em 0.8em;\n    border-radius: 0.5em;\n    background: rgba(255, 255, 255, 0.1);\n    color: rgba(255, 255, 255, 0.85);\n    font-size: 0.95em;\n}\n\n.full-descr__text.focus {\n    background: rgba(255, 255, 255, 0.12);\n    border-radius: 0.6em;\n    outline: 2px solid #fff;\n    padding: 0.2em 0.4em;\n}\n\n/* Modal for Translations */\n.adrama-translations-list {\n    display: flex;\n    flex-direction: column;\n    gap: 0.6em;\n    padding: 0.5em;\n}\n\n.adrama-tr-item {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    padding: 0.9em 1.2em;\n    border-radius: 8px;\n    background: rgba(255, 255, 255, 0.08);\n    cursor: pointer;\n    font-size: 1.15em;\n    border: 2px solid transparent;\n}\n\n.adrama-tr-item.focus,\n.adrama-tr-item:hover {\n    border-color: #fff;\n    background: #7c4dff;\n    color: #fff;\n}\n\n.adrama-tr-sources {\n    font-size: 0.85em;\n    color: rgba(255, 255, 255, 0.6);\n}\n\n/* Native Lampa Navigation Tabs for ADrama */\n.navigation-tabs.adrama-nav-tabs,\n.adrama-nav-tabs.navigation-tabs {\n    margin: 1.2em 1.5em 1.6em 1.5em !important;\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    width: auto !important;\n    background-color: rgba(0, 0, 0, 0.4) !important;\n    border-radius: 0.6em !important;\n    padding: 0.35em !important;\n    border: 1px solid rgba(255, 255, 255, 0.08) !important;\n    box-sizing: border-box !important;\n    align-items: center !important;\n}\n\n.navigation-tabs.adrama-nav-tabs .navigation-tabs__split,\n.adrama-nav-tabs.navigation-tabs .navigation-tabs__split {\n    padding: 0.4em 0.25em !important;\n    opacity: 0.25 !important;\n    color: rgba(255, 255, 255, 0.5) !important;\n    line-height: 1 !important;\n    user-select: none !important;\n}\n\n.navigation-tabs.adrama-nav-tabs .navigation-tabs__button,\n.adrama-nav-tabs.navigation-tabs .navigation-tabs__button {\n    cursor: pointer !important;\n    font-size: 1.15em !important;\n    padding: 0.55em 1.8em !important;\n    border-radius: 0.4em !important;\n    color: rgba(255, 255, 255, 0.75) !important;\n    background-color: transparent !important;\n    white-space: nowrap !important;\n    font-weight: 500 !important;\n    transition: none !important;\n    -webkit-transition: none !important;\n    transform: none !important;\n    -webkit-transform: none !important;\n    box-shadow: none !important;\n}\n\n.navigation-tabs.adrama-nav-tabs .navigation-tabs__button.active,\n.adrama-nav-tabs.navigation-tabs .navigation-tabs__button.active {\n    background-color: rgba(255, 255, 255, 0.25) !important;\n    color: #ffffff !important;\n    font-weight: 600 !important;\n}\n\n.navigation-tabs.adrama-nav-tabs .navigation-tabs__button.focus,\n.adrama-nav-tabs.navigation-tabs .navigation-tabs__button.focus {\n    background-color: #ffffff !important;\n    color: #000000 !important;\n    font-weight: 700 !important;\n    transform: none !important;\n    -webkit-transform: none !important;\n    box-shadow: none !important;\n    z-index: 2 !important;\n}\n\n.adrama-tab-pane {\n    width: 100% !important;\n    box-sizing: border-box !important;\n}\n\n/* Sub-tabs for Bookmarks & Lists */\n.adrama-sub-tabs {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    gap: 0.8em !important;\n    padding: 0 1.5em 1.2em 1.5em !important;\n    overflow-x: auto !important;\n}\n\n.adrama-sub-tab {\n    padding: 0.5em 1.1em !important;\n    border-radius: 0.5em !important;\n    background: rgba(255, 255, 255, 0.08) !important;\n    font-size: 1.05em !important;\n    font-weight: 600 !important;\n    cursor: pointer !important;\n    border: 2px solid transparent !important;\n    color: rgba(255, 255, 255, 0.8) !important;\n    flex-shrink: 0 !important;\n    -webkit-flex-shrink: 0 !important;\n}\n\n.adrama-sub-tab.active {\n    background: rgba(255, 255, 255, 0.25) !important;\n    color: #fff !important;\n}\n\n.adrama-sub-tab.focus {\n    background: #fff !important;\n    color: #000 !important;\n}\n\n/* Search Screen */\n.adrama-search-box {\n    padding: 0 1.5em 2em 1.5em;\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-box-orient: vertical;\n    -webkit-box-direction: normal;\n    -webkit-flex-direction: column;\n    flex-direction: column;\n    gap: 1.2em;\n}\n\n.adrama-search-input-btn {\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    gap: 0.8em !important;\n    padding: 0.75em 1.6em !important;\n    background: rgba(255, 255, 255, 0.1) !important;\n    -webkit-border-radius: 0.6em !important;\n    border-radius: 0.6em !important;\n    font-size: 1.2em !important;\n    color: #fff !important;\n    border: 2px solid transparent !important;\n    cursor: pointer !important;\n    width: auto !important;\n    max-width: 32em !important;\n    box-sizing: border-box !important;\n    line-height: 1.2 !important;\n    transition: background 0.2s, color 0.2s, border-color 0.2s !important;\n}\n\n.adrama-search-input-btn svg {\n    width: 1.4em !important;\n    height: 1.4em !important;\n    min-width: 1.4em !important;\n    min-height: 1.4em !important;\n    max-width: 1.4em !important;\n    max-height: 1.4em !important;\n    flex-shrink: 0 !important;\n    display: block !important;\n}\n\n.adrama-search-input-btn.focus,\n.adrama-search-input-btn:hover {\n    border-color: #ffffff !important;\n    background: #ffffff !important;\n    color: #000000 !important;\n}\n\n.adrama-search-input-btn.focus svg,\n.adrama-search-input-btn:hover svg {\n    stroke: #000000 !important;\n}\n\n.adrama-popular-tags {\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-flex-wrap: wrap;\n    flex-wrap: wrap;\n    gap: 0.6em;\n    max-width: 80em;\n}\n\n.adrama-pop-tag {\n    background: rgba(255, 255, 255, 0.08);\n    padding: 0.45em 1.1em;\n    -webkit-border-radius: 2em;\n    border-radius: 2em;\n    font-size: 1em;\n    color: rgba(255, 255, 255, 0.85);\n    cursor: pointer;\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    transition: background 0.2s, color 0.2s, border-color 0.2s;\n}\n\n.adrama-pop-tag.focus,\n.adrama-pop-tag:hover {\n    border-color: #ffffff !important;\n    background: #ffffff !important;\n    color: #000000 !important;\n}\n\n/* Auth Notice / Empty States */\n.adrama-auth-notice {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: column !important;\n    flex-direction: column !important;\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    -webkit-box-pack: center !important;\n    -webkit-justify-content: center !important;\n    justify-content: center !important;\n    padding: 5em 2em !important;\n    text-align: center !important;\n    gap: 1.2em !important;\n}\n\n.adrama-auth-notice__icon svg {\n    width: 4em !important;\n    height: 4em !important;\n    opacity: 0.6 !important;\n}\n\n.adrama-auth-notice__title {\n    font-size: 1.8em !important;\n    font-weight: 700 !important;\n    color: #fff !important;\n}\n\n.adrama-auth-notice__text {\n    font-size: 1.15em !important;\n    color: rgba(255, 255, 255, 0.65) !important;\n    max-width: 520px !important;\n    line-height: 1.4 !important;\n}\n\n.adrama-auth-notice__btn {\n    margin-top: 0.5em !important;\n    padding: 0.8em 2em !important;\n    border-radius: 0.5em !important;\n    background: #7c4dff !important;\n    color: #fff !important;\n    font-size: 1.15em !important;\n    font-weight: 600 !important;\n    cursor: pointer !important;\n    border: 2px solid transparent !important;\n}\n\n.adrama-auth-notice__btn.focus {\n    background: #fff !important;\n    color: #000 !important;\n}\n\n.adrama-empty-info {\n    padding: 3em 1.5em !important;\n    color: rgba(255, 255, 255, 0.5) !important;\n    font-size: 1.2em !important;\n    text-align: center !important;\n}\n\n/* Bookmarks Registers line matching native Lampa (.register.selector) */\n.adrama-registers-line {\n    padding: 0.5em 0 1.2em 0 !important;\n}\n\n.adrama-registers-cards {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    padding: 0.5em 1.5em !important;\n}\n\n.adrama-registers-cards .register {\n    background-color: rgba(0, 0, 0, 0.3) !important;\n    -webkit-border-radius: 1em !important;\n    border-radius: 1em !important;\n    padding: 1em 1.2em !important;\n    line-height: 1.3 !important;\n    position: relative !important;\n    min-width: 9em !important;\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    margin-right: 1.2em !important;\n    cursor: pointer !important;\n    transition: background-color 0.2s ease !important;\n}\n\n.adrama-registers-cards .register.active {\n    background-color: rgba(255, 255, 255, 0.2) !important;\n}\n\n.adrama-registers-cards .register.focus::after {\n    content: \"\" !important;\n    position: absolute !important;\n    top: -0.35em !important;\n    left: -0.35em !important;\n    right: -0.35em !important;\n    bottom: -0.35em !important;\n    border: 0.3em solid #fff !important;\n    -webkit-border-radius: 1.3em !important;\n    border-radius: 1.3em !important;\n    z-index: 2 !important;\n    pointer-events: none !important;\n}\n\n.adrama-registers-cards .register__name {\n    font-size: 1.15em !important;\n    color: #fff !important;\n    white-space: nowrap !important;\n}\n\n.adrama-registers-cards .register__counter {\n    font-size: 2.1em !important;\n    font-weight: 700 !important;\n    color: #fff !important;\n    margin-top: 0.2em !important;\n    letter-spacing: -0.02em !important;\n}\n\n/* Ad blocking & anti-banner rules */\n.ad-bot,\n.ad-banner,\n.advert,\n.advertisement,\n[id*=\"yandex_rtb\"],\n[class*=\"yandex_rtb\"],\niframe[src*=\"an.yandex.ru\"],\niframe[src*=\"adsystem\"] {\n    display: none !important;\n    visibility: hidden !important;\n    height: 0 !important;\n    width: 0 !important;\n    pointer-events: none !important;\n}\n\n\n/* ADrama Comments in Details Card */\n.adrama-comments-line {\n    margin-bottom: 2em;\n}\n\n.adrama-comments-scroll {\n    display: flex !important;\n    flex-direction: row !important;\n}\n\n.adrama-comment-card {\n    min-width: 22em !important;\n    max-width: 26em !important;\n    width: 24em !important;\n    padding: 1.2em 1.4em !important;\n    background-color: rgba(255, 255, 255, 0.08) !important;\n    border-radius: 1.2em !important;\n    margin-right: 1.5em !important;\n    display: flex !important;\n    flex-direction: column !important;\n    justify-content: flex-start !important;\n    position: relative !important;\n    box-sizing: border-box !important;\n    cursor: pointer !important;\n    transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease !important;\n}\n\n.adrama-comment-card:last-child {\n    margin-right: 3em !important;\n}\n\n.adrama-comment-card.focus {\n    background-color: #ffffff !important;\n    color: #111111 !important;\n    transform: scale(1.03) !important;\n    z-index: 5 !important;\n    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;\n}\n\n.adrama-comment-card__header {\n    display: flex !important;\n    align-items: center !important;\n    margin-bottom: 1em !important;\n    width: 100% !important;\n}\n\n.adrama-comment-card__avatar {\n    width: 2.6em !important;\n    height: 2.6em !important;\n    border-radius: 50% !important;\n    overflow: hidden !important;\n    flex-shrink: 0 !important;\n    margin-right: 0.9em !important;\n    background-color: rgba(255, 255, 255, 0.15) !important;\n}\n\n.adrama-comment-card__avatar img {\n    width: 100% !important;\n    height: 100% !important;\n    object-fit: cover !important;\n    display: block !important;\n}\n\n.adrama-comment-card__avatar-placeholder {\n    width: 100% !important;\n    height: 100% !important;\n    background: #ff5533 !important;\n    color: #ffffff !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n    font-weight: 700 !important;\n    font-size: 1.2em !important;\n    border-radius: 50% !important;\n    text-transform: uppercase !important;\n}\n\n.adrama-comment-card__info {\n    flex-grow: 1 !important;\n    min-width: 0 !important;\n    overflow: hidden !important;\n}\n\n.adrama-comment-card__author {\n    font-size: 1.15em !important;\n    font-weight: 600 !important;\n    color: #ffffff !important;\n    white-space: nowrap !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    line-height: 1.2 !important;\n    transition: color 0.2s ease !important;\n}\n\n.adrama-comment-card.focus .adrama-comment-card__author {\n    color: #111111 !important;\n}\n\n.adrama-comment-card__meta {\n    display: flex !important;\n    align-items: center !important;\n    gap: 0.6em !important;\n    margin-top: 0.3em !important;\n    font-size: 0.9em !important;\n}\n\n.adrama-comment-card__date {\n    color: rgba(255, 255, 255, 0.55) !important;\n    white-space: nowrap !important;\n    transition: color 0.2s ease !important;\n}\n\n.adrama-comment-card.focus .adrama-comment-card__date {\n    color: #666666 !important;\n}\n\n.adrama-comment-card__spoiler-badge {\n    background-color: #e53935 !important;\n    color: #ffffff !important;\n    font-size: 0.8em !important;\n    font-weight: 700 !important;\n    text-transform: uppercase !important;\n    padding: 0.15em 0.5em !important;\n    border-radius: 0.4em !important;\n    letter-spacing: 0.03em !important;\n}\n\n.adrama-comment-card__score {\n    font-size: 1em !important;\n    font-weight: 700 !important;\n    margin-left: auto !important;\n    padding: 0.1em 0.4em !important;\n    border-radius: 0.4em !important;\n    white-space: nowrap !important;\n}\n\n.adrama-comment-card__score.positive {\n    color: #4caf50 !important;\n}\n\n.adrama-comment-card__score.negative {\n    color: #f44336 !important;\n}\n\n.adrama-comment-card__text {\n    font-size: 1.15em !important;\n    line-height: 1.4 !important;\n    color: rgba(255, 255, 255, 0.85) !important;\n    word-break: break-word !important;\n    display: -webkit-box !important;\n    -webkit-line-clamp: 4 !important;\n    line-clamp: 4 !important;\n    -webkit-box-orient: vertical !important;\n    overflow: hidden !important;\n    text-overflow: ellipsis !important;\n    transition: color 0.2s ease !important;\n    margin-bottom: 0 !important;\n}\n\n.adrama-comment-card.focus .adrama-comment-card__text {\n    color: #222222 !important;\n}\n\n.adrama-comment-spoiler-text {\n    filter: blur(5px) !important;\n    opacity: 0.6 !important;\n    transition: filter 0.25s ease, opacity 0.25s ease !important;\n}\n\n.adrama-comment-card.focus .adrama-comment-spoiler-text {\n    filter: none !important;\n    opacity: 1 !important;\n}\n\n/* \"\u0415\u0449\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0438\" card */\n.adrama-comment-card--more {\n    align-items: center !important;\n    justify-content: center !important;\n    min-width: 14em !important;\n    max-width: 16em !important;\n    width: 15em !important;\n    border: 2px dashed rgba(255, 255, 255, 0.3) !important;\n    background-color: transparent !important;\n}\n\n.adrama-comment-card--more.focus {\n    border: 2px solid #ffffff !important;\n    background-color: #ffffff !important;\n}\n\n.adrama-comment-card__more-content {\n    display: flex !important;\n    flex-direction: column !important;\n    align-items: center !important;\n    text-align: center !important;\n}\n\n.adrama-comment-card__more-icon {\n    margin-bottom: 0.6em !important;\n    color: rgba(255, 255, 255, 0.8) !important;\n    transition: color 0.2s ease !important;\n}\n\n.adrama-comment-card--more.focus .adrama-comment-card__more-icon {\n    color: #111111 !important;\n}\n\n.adrama-comment-card__more-title {\n    font-size: 1.2em !important;\n    font-weight: 600 !important;\n    color: #ffffff !important;\n    margin-bottom: 0.3em !important;\n    transition: color 0.2s ease !important;\n}\n\n.adrama-comment-card--more.focus .adrama-comment-card__more-title {\n    color: #111111 !important;\n}\n\n.adrama-comment-card__more-count {\n    font-size: 0.95em !important;\n    color: rgba(255, 255, 255, 0.5) !important;\n    transition: color 0.2s ease !important;\n}\n\n.adrama-comment-card--more.focus .adrama-comment-card__more-count {\n    color: #666666 !important;\n}\n\n/* Modal View */\n.adrama-comment-modal {\n    padding: 1.2em 0.8em !important;\n}\n\n.adrama-comment-modal__header {\n    display: flex !important;\n    align-items: center !important;\n    margin-bottom: 1.5em !important;\n    padding-bottom: 1em !important;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;\n}\n\n.adrama-comment-modal__avatar {\n    width: 3.5em !important;\n    height: 3.5em !important;\n    border-radius: 50% !important;\n    overflow: hidden !important;\n    flex-shrink: 0 !important;\n    margin-right: 1.2em !important;\n}\n\n.adrama-comment-modal__avatar img {\n    width: 100% !important;\n    height: 100% !important;\n    object-fit: cover !important;\n}\n\n.adrama-comment-modal__author {\n    font-size: 1.4em !important;\n    font-weight: 600 !important;\n    color: #ffffff !important;\n}\n\n.adrama-comment-modal__meta {\n    display: flex !important;\n    align-items: center !important;\n    gap: 0.8em !important;\n    margin-top: 0.4em !important;\n    font-size: 1em !important;\n}\n\n.adrama-comment-modal__date {\n    color: rgba(255, 255, 255, 0.6) !important;\n}\n\n.adrama-comment-modal__body {\n    font-size: 1.3em !important;\n    line-height: 1.6 !important;\n    color: rgba(255, 255, 255, 0.92) !important;\n    max-height: 50vh !important;\n    overflow-y: auto !important;\n    word-break: break-word !important;\n    padding: 0.5em 0.2em !important;\n}\n" + '</style>');
        }

        // Add Items to Sidebar Menu: Only ADrama
        if (Lampa.Menu && Lampa.Menu.addButton) {
            Lampa.Menu.addButton(ICONS.logo, 'ADrama', function () {
                Lampa.Activity.push({ component: 'adrama', title: 'ADrama' });
            });
        }

        // Add Settings Section
        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({
                component: 'adrama_settings',
                name: 'ADrama (Дорамы)',
                icon: ICONS.logo
            });

            Lampa.SettingsApi.addParam({
                component: 'adrama_settings',
                param: {
                    name: 'adrama_account_info',
                    type: 'title'
                },
                field: {
                    name: 'Учетная запись adrama.tv',
                    description: Auth.isLogged() ? ('Вы вошли как: ' + ((Auth.user() && (Auth.user().name || Auth.user().login || Auth.user().email)) || (Auth.credentials() && Auth.credentials().email) || 'Пользователь')) : 'Вы не авторизованы'
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'adrama_settings',
                param: {
                    name: 'adrama_login_action',
                    type: 'button'
                },
                field: {
                    name: Auth.isLogged() ? 'Сменить аккаунт / Выйти' : 'Войти в аккаунт'
                },
                onRender: function (item) {
                    item.on('hover:enter', function () {
                        if (Auth.isLogged()) {
                            Lampa.Select.show({
                                title: 'Управление аккаунтом ADrama',
                                items: [
                                    { title: 'Синхронизировать данные сейчас', action: 'sync' },
                                    { title: 'Выйти из аккаунта', action: 'logout' }
                                ],
                                onSelect: function (a) {
                                    Lampa.Controller.toggle('settings');
                                    if (a.action === 'logout') {
                                        Auth.clear();
                                        Lampa.Noty.show('Вы вышли из аккаунта ADrama');
                                    } else if (a.action === 'sync') {
                                        Lampa.Noty.show('Синхронизация завершена');
                                    }
                                }
                            });
                        } else {
                            promptLogin(function () {
                                Lampa.Controller.toggle('settings');
                            });
                        }
                    });
                }
            });
        }

        // Auto launch on start for standalone mode
        if (window.adrama_standalone) {
            setTimeout(function () {
                if (Lampa.Activity && Lampa.Activity.replace) {
                    Lampa.Activity.replace({ component: 'adrama', title: 'ADrama' }, true);
                } else if (Lampa.Activity && Lampa.Activity.push) {
                    Lampa.Activity.push({ component: 'adrama', title: 'ADrama' });
                }
            }, 300);
        }
    }

    if (window.appready) {
        init();
    } else if (window.Lampa && window.Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    } else {
        window.addEventListener('load', function () {
            if (window.Lampa && window.Lampa.Listener) {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') init();
                });
            }
        });
    }
})();
