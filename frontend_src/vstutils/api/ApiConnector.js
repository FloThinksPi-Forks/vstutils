import $ from 'jquery';
import StatusError from './StatusError.js';
import { guiLocalSettings, getCookie } from '../utils';

const METHODS_WITH_DATA = ['post', 'put', 'patch'];

/**
 * Class, that sends API requests.
 */
export default class ApiConnector {
    /**
     * Constructor of ApiConnector class.
     * @param {object} openapi Object with OpenAPI schema.
     * @param {object} cache Object, that manages api responses cache operations.
     */
    constructor(openapi, cache) {
        /**
         * Object with OpenAPI schema.
         */
        this.openapi = openapi;
        /**
         * Object, that manages api responses cache operations.
         */
        this.cache = cache;
        /**
         * Property for collecting several bulk requests into one.
         */
        this.bulk_collector = {
            /**
             * Timeout ID, that setTimeout() function returns.
             */
            timeout_id: undefined,
            /**
             * Array, that collects objects, created for every bulk request.
             * Example of this object.
             * {
             *   // Body of bulk query.
             *   data: {method: get, path: []},
             *
             *   // Promise for bulk request.
             *   promise: new Promise(),
             *
             *   // Object with promise callbacks.
             *   callbacks: {resolve: function(){}, reject: function(){},},
             * }
             */
            bulk_parts: [],
        };

        const version = openapi.info.version;
        // remove version and ending slash from path (/api/v1/)
        const path = openapi.basePath.replace(version, '').replace(/\/$/, '');

        this.baseURL = `${openapi.schemes[0]}://${openapi.host}${path}`;
        this.headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        };

        this.endpointURL = window.endpoint_url;
    }
    /**
     * Method, that sends API request.
     * @param {string} method - Method of HTTP request.
     * @param {string=} url - Relative part of link including version (e.g.: 'v1/user/1/'),
     * to which send API requests.
     * @param {object=} data - Json query body.
     */
    apiQuery(method, url, data = {}) {
        const fetchConfig = {
            method: method,
            headers: this.headers,
        };
        if (METHODS_WITH_DATA.includes(method.toLowerCase())) {
            fetchConfig.data = data;
        }
        return fetch(`${this.baseURL}/${url}`, fetchConfig);
    }
    /**
     * Method, that collects several bulk requests into one.
     * @param {object} data Body of bulk request.
     */
    bulkQuery(data) {
        if (this.bulk_collector.timeout_id) {
            clearTimeout(this.bulk_collector.timeout_id);
        }

        let callbacks = {
            resolve: undefined,
            reject: undefined,
        };

        let promise = new Promise((resolve, reject) => {
            callbacks.resolve = resolve;
            callbacks.reject = reject;
        });

        this.bulk_collector.bulk_parts.push({
            data: data,
            promise: promise,
            callbacks: callbacks,
        });

        let bulk_timeout = guiLocalSettings.get('guiApi.real_query_timeout') || 100;

        this.bulk_collector.timeout_id = setTimeout(() => this.sendBulk(), bulk_timeout);

        return promise;
    }
    /**
     * Method, that sends one big bulk request to API.
     * @return {Promise} Promise of getting bulk request response.
     */
    async sendBulk() {
        let collector = $.extend(true, {}, this.bulk_collector);
        this.bulk_collector.bulk_parts = [];
        let bulk_data = collector.bulk_parts.map((bulkPart) => bulkPart.data);

        try {
            const request = await fetch(this.endpointURL, {
                method: 'put',
                headers: this.headers,
                body: JSON.stringify(bulk_data),
            });
            const result = await request.json();

            for (let [idx, item] of result.entries()) {
                let method = 'resolve';

                if (!(item.status >= 200 && item.status < 400)) {
                    method = 'reject';
                }

                collector.bulk_parts[idx].callbacks[method](item);
            }
        } catch (error) {
            throw new StatusError(error.status, error.data);
        }
    }
    /**
     * Method returns URL of API host (server).
     * @return {string}
     */
    getHostUrl() {
        return this.openapi.schemes[0] + '://' + this.openapi.host;
    }
    /**
     * Method returns string, containing time zone of API host.
     * @return {string}
     */
    getTimeZone() {
        return this.openapi.info['x-settings'].time_zone;
    }
    /**
     * Method returns relative path (from host url) to the directory with static path.
     * @return {string}
     */
    getStaticPath() {
        return this.openapi.info['x-settings'].static_path;
    }
    /**
     * Method returns id of user, that is now authorized and uses application.
     * @return {number | string}
     */
    getUserId() {
        return this.openapi.info['x-user-id'];
    }
    /**
     * Method, that loads data of authorized user.
     * @return {Promise} Promise of getting data of authorized user.
     */
    loadUser() {
        return this.bulkQuery({
            path: ['user', this.getUserId()],
            method: 'get',
        }).then((response) => {
            return response.data;
        });
    }
    /**
     * Method, that loads list of App languages from API.
     * @return {promise} Promise of getting list of App languages from API.
     */
    loadLanguages() {
        return this.bulkQuery({ path: '/_lang/', method: 'get' }).then((response) => {
            return response.data.results;
        });
    }
    /**
     * Method, that gets list of App languages from cache.
     * @return {promise} Promise of getting list of App languages from Cache.
     */
    getLanguagesFromCache() {
        return (
            this.cache
                .get('languages')
                .then((response) => {
                    return JSON.parse(response.data);
                })
                // eslint-disable-next-line no-unused-vars
                .catch((error) => {
                    return this.loadLanguages().then((languages) => {
                        this.cache.set('languages', JSON.stringify(languages));
                        return languages;
                    });
                })
        );
    }
    /**
     * Method, that gets list of App languages.
     * @return {promise} Promise of getting list of App languages.
     */
    getLanguages() {
        debugger;
        if (this.cache) {
            return this.getLanguagesFromCache();
        }
        return this.loadLanguages();
    }
    /**
     * Method, that loads translations for some language from API.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from API.
     */
    loadTranslations(lang) {
        return this.bulkQuery({ path: ['_lang', lang], method: 'get' }).then((response) => {
            return response.data.translations;
        });
    }
    /**
     * Method, that gets translations for some language from cache.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from Cache.
     */
    getTranslationsFromCache(lang) {
        return (
            this.cache
                .get('translations.' + lang)
                .then((response) => {
                    return JSON.parse(response.data);
                })
                // eslint-disable-next-line no-unused-vars
                .catch((error) => {
                    return this.loadTranslations(lang).then((translations) => {
                        this.cache.set('translations.' + lang, JSON.stringify(translations));
                        return translations;
                    });
                })
        );
    }
    /**
     * Method, that gets translations for some language.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language.
     */
    getTranslations(lang) {
        if (this.cache) {
            return this.getTranslationsFromCache(lang);
        }
        return this.loadTranslations(lang);
    }
}
