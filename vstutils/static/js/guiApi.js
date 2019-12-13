guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100);

/**
 * Class for Errors connected with API requests.
 */
class StatusError extends Error {
    /**
     * Constructor of StatusError class.
     * @param {number} status Status of HTTP response.
     * @param {string, object} data Error object.
     */
    constructor(status, data){
        super();
        this.status = status;
        this.message = undefined;
        if(typeof data == "string") {
            this.message = data;
        }
        if(typeof data == "object" && data.detail){
            this.message = data.detail;
        }
    }
}


/**
 * Class, that sends API requests.
 */
class ApiConnector { /* jshint unused: false */
    /**
     * Constructor of ApiConnector class.
     * @param {object} config Object with config properties for Api connector.
     */
    constructor(config){
        /**
         * Object with config properties for Api connector.
         */
        this.config = config;
        /**
         * Object with methods for providing Api connection.
         */
        this.api = axios.create(config); /* globals axios */
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
             *   data: {method: get, data_type: []},
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
    }
    /**
     * Method, that loads OpeanApi schema from API.
     * @return {promise} Promise of getting OpenApi schema from API.
     */
    loadSchema() {
        let schema_url = "/openapi/?format=openapi";
        return this.query('get', schema_url).then(response => {
            return response.data;
        }).catch(error => {
            debugger;
            throw new Error(error);
        });
    }
    /**
     * Method, that gets OpeanApi schema from cache.
     * @return {promise} Promise of getting OpenApi schema from Cache.
     */
    getSchemaFromCache() {
        return app.files_cache.getFile('openapi').then(response => {
            return JSON.parse(response.data);
        }).catch(error => {
            return this.loadSchema().then(openapi => {
                app.files_cache.setFile('openapi', JSON.stringify(openapi));
                return openapi;
            });
        });
    }
    /**
     * Method, that gets OpenApi schema.
     * @return {promise} Promise of getting OpenApi schema.
     */
    _getSchema() {
        if(app && app.files_cache) {
            return this.getSchemaFromCache();
        } else {
            return this.loadSchema();
        }
    }

    /**
     * Method, that gets OpenApi schema and emits "openapi.loaded" signal.
     * @return {promise} Promise of getting OpenApi schema.
     */
    getSchema() {
        return this._getSchema().then(openapi => {
            this.openapi = openapi;
            tabSignal.emit("openapi.loaded", openapi);
            return openapi;
        }).catch(error => {
            throw error;
        });
    }

    /**
     * Method, that loads list of App languages from API.
     * @return {promise} Promise of getting list of App languages from API.
     */
    loadLanguages() {
        return this.bulkQuery({data_type: ['_lang'], method: 'get'}).then(response => {
            return response.data.results;
        });
    }

    /**
     * Method, that gets list of App languages from cache.
     * @return {promise} Promise of getting list of App languages from Cache.
     */
    getLanguagesFromCache() {
        return app.files_cache.getFile('languages').then(response => {
            return JSON.parse(response.data);
        }).catch(error => {
            return this.loadLanguages().then(languages => {
                app.files_cache.setFile('languages', JSON.stringify(languages));
                return languages;
            });
        });
    }

    /**
     * Method, that gets list of App languages.
     * @return {promise} Promise of getting list of App languages.
     */
    getLanguages() {
        if(app && app.files_cache) {
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
        return this.bulkQuery({data_type: ['_lang', lang], method: 'get'}).then(response => {
            return response.data.translations;
        });
    }

    /**
     * Method, that gets translations for some language from cache.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language from Cache.
     */
    getTranslationsFromCache(lang) {
        return app.files_cache.getFile('translations.' + lang).then(response => {
            return JSON.parse(response.data);
        }).catch(error => {
            return this.loadTranslations(lang).then(translations => {
                app.files_cache.setFile('translations.' + lang, JSON.stringify(translations));
                return translations;
            });
        });
    }

    /**
     * Method, that gets translations for some language.
     * @param {string} lang Code of language, translations of which to load.
     * @return {promise} Promise of getting translations for some language.
     */
    getTranslations(lang) {
        if(app && app.files_cache) {
            return this.getTranslationsFromCache(lang);
        }
        return this.loadTranslations(lang);
    }

    /**
     * Method, that sends API request.
     * @param {string} method Method of HTTP request.
     * @param {string} url Relative part of link, to which send API requests.
     * @param {object} data Query body.
     */
    query(method, url="", data={}) {
        let with_data_methods = ["post", "put", "patch"];
        let without_data_methods = ["get", "delete"];

        if(with_data_methods.includes(method)) {
            return this.api[method](url, data);
        } else if(without_data_methods.includes(method)) {
            return this.api[method](url);
        }
    }
    /**
     * Method, that collects several bulk requests into one.
     * @param {object} data Body of bulk request.
     */
    bulkQuery(data) {
        if(this.bulk_collector.timeout_id) {
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
     * @return {promise} Promise of getting bulk request response.
     */
    sendBulk() {
        let url = "/" + api_version + "/_bulk/"; /* globals api_version */
        let collector = $.extend(true, {}, this.bulk_collector);
        this.bulk_collector.bulk_parts = [];
        let bulk_data = [];

        for(let index = 0; index < collector.bulk_parts.length; index++) {
            bulk_data.push(collector.bulk_parts[index].data);
        }

        return this.query("put", url, bulk_data).then(response => {
            let result = response.data;

            for(let index = 0; index < result.length; index++) {
                let item = result[index];
                let method = "resolve";

                if(!(item.status >= 200 && item.status < 400)) {
                    debugger;
                    method = "reject";
                }

                collector.bulk_parts[index].callbacks[method](result[index]);
            }

        }).catch(error => {
            debugger;
            throw new StatusError(error.status, error.data);
        });
    }
}

/**
 * Config for instance of ApiConnector class.
 */
let api_connector_config = { /* jshint unused: false */
    headers: {
        'content-type': 'application/json',
        'X-CSRFToken': csrf_data.token, /* globals csrf_data */
    },
    baseURL: hostname + "/api",
};

/**
 * Dictionary, that contains names of openapi schema attributes.
 * This dictionary is needed for easier updates of following opeanapi versions,
 * that can contain another attributes names.
 */
let openapi_dictionary = { /* jshint unused: false */
    models: {
        name: "definitions",
        fields: {
            name: "properties",
        },
        required_fields: {
            name: "required",
        },
        ref_names: ["$ref", "definition_ref"],
        filters_to_delete: ["limit", "offset"],
    },
    paths: {
        name: "paths",
        operation_id: {
            name: "operationId",
        },
        operations: {
            base: {
                remove: {
                    name: 'remove',
                    title: 'remove',
                    icon_classes: ['fa', 'fa-trash'],
                    title_classes: ['d-none', 'd-lg-inline-block'],
                    classes: ['btn-danger', 'danger-right'],
                },
            },
            list: {
                new: {
                    name: 'new',
                    title: 'create',
                    icon_classes: ['fa', 'fa-plus'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
                add: {
                    name: 'add',
                    title: 'add',
                    component: 'gui_add_child_modal',
                },
            },
            page: {
                edit: {
                    name: 'edit',
                    title: 'edit',
                    icon_classes: ['fa', 'fa-pencil-square-o'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            page_new: {
                save_new: {
                    name: 'save',
                    title: 'save',
                    icon_classes: ['fa', 'fa-floppy-o'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            page_edit: {
                save: {
                    name: 'save',
                    title: 'save',
                    icon_classes: ['fa', 'fa-floppy-o'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
                reload: {
                    name: 'reload',
                    title: 'reload',
                    icon_classes: ['fa', ' fa-refresh'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            action: {
                execute: {
                    name: 'execute',
                    title: 'send',
                    icon_classes: ['fa', 'fa-upload'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                }
            },
        },
        multi_actions: ['remove'],
        types_operations_always_to_add: ['page_new', 'page_edit', 'action'],
    },
    schema_types: {
        "_add": {
            query_type: "post",
            url_postfix: "new/",
            type: "page_new",
        },
        "_list": {
            query_type: "get",
            url_postfix: "",
            filters: {name: "parameters"},
            type: "list",
            autoupdate: true,
        },
        "_get": {
            query_type: "get",
            url_postfix: "",
            type: "page",
            autoupdate: true,
        },
        "_edit": {
            query_type: "patch",
            url_postfix: "edit/",
            type: "page_edit",
        },
        "_update": {
            query_type: "put",
            url_postfix: "edit/",
            type: "page_edit",
        },
        "_remove": {
            query_type: "delete",
            url_postfix: "remove/",
            type: "page_remove",
            hidden: true,
        },
    }
};