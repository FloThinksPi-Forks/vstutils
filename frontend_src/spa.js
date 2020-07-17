import Vue from 'vue';
import VueI18n from 'vue-i18n';
import BaseApp from './BaseApp.js';
import { openapi_dictionary } from './vstutils/api';
import { guiLocalSettings } from './vstutils/utils';
import { View, ViewConstructor } from './vstutils/views';
import { StoreConstructor } from './vstutils/store';
import { ModelConstructor, guiModels } from './vstutils/models';
import { RouterConstructor, mixins as routerMixins } from './vstutils/router';

export * from './app.common.js';
export * from './vstutils/dashboard';

/**
 * Class for a App object.
 * App object - JS object, that has all properties, needed for an application work.
 */
export class App extends BaseApp {
    /**
     * Constructor of App class.
     * @param {object} openapi Object with OpenAPI schema.
     * @param {object} cache Cache instance (is supposed to be instance of FilesCache class).
     */
    constructor(openapi, cache) {
        super(openapi, cache);
        /**
         * Dict, that stores all parsed models from OpenAPI schema.
         */
        this.models = null;
        /**
         * Dict, that stores all views, generated for all paths from OpenAPI schema.
         */
        this.views = null;
        /**
         * Main(root) Vue instance for current application, that has access to the app store and app router.
         */
        this.application = null;
    }
    afterInitialDataBeforeMount() {
        this.initModels();
        this.initViews();
    }
    /**
     * Method, that inits Models Objects.
     */
    initModels() {
        this.models = this.generateModels();
    }
    /**
     * Method, that generates Models Objects, based on openapi_schema.
     */
    generateModels() {
        let models_constructor = new ModelConstructor(openapi_dictionary, guiModels);
        return models_constructor.generateModels(this.api.openapi);
    }
    /**
     * Method, that inits Views Objects.
     */
    initViews() {
        this.views = this.generateViews();
        this.prepareViewsModelsFields();
    }
    /**
     * Method, that generates Views Objects, based on openapi_schema.
     */
    generateViews() {
        let views_constructor = new ViewConstructor(openapi_dictionary, this.models);
        return views_constructor.generateViews(View, this.api.openapi);
    }
    /**
     * Method, that runs through all views
     * and handles all fields with additionalProperties.
     */
    prepareViewsModelsFields() {
        for (let path in this.views) {
            if (Object.prototype.hasOwnProperty.call(this.views, path)) {
                let view = this.views[path];

                for (let key in view.objects.model.fields) {
                    if (Object.prototype.hasOwnProperty.call(view.objects.model.fields, key)) {
                        let field = view.objects.model.fields[key];

                        if (field.constructor.prepareField) {
                            let prepared = field.constructor.prepareField(field, path);

                            view.objects.model.fields[key] = prepared;
                        }
                    }
                }
            }
        }
    }

    /**
     * Method returns a promise of applying some language to app interface.
     * This method is supposed to be called after app was mounted.
     * @param {string} lang Code of language, that should be set as current App language.
     * @return {Promise}
     */
    setLanguage(lang) {
        return this._prefetchTranslation(lang).then((lang) => {
            this.application.$i18n.locale = lang;
            guiLocalSettings.set('lang', lang);
            window.spa.signals.emit('app.language.changed', { lang: lang });
            return lang;
        });
    }

    /**
     * Method returns a promise of checking that current language exists and translations for language is loaded.
     * This method is supposed to be called after app was mounted and only from this.setLanguage(lang) method.
     * @param {string} lang Code of language, that should be prefetched.
     * @return {Promise}
     */
    _prefetchTranslation(lang) {
        if (
            !Object.values(this.languages)
                .map((item) => item.code)
                .includes(lang)
        ) {
            return Promise.reject(false);
        }

        if (this.translations[lang]) {
            return Promise.resolve(lang);
        }

        return this.api
            .getTranslations(lang)
            .then((transitions) => {
                this.translations = {
                    ...this.translations,
                    [lang]: transitions,
                };

                this.application.$i18n.setLocaleMessage(lang, transitions);
                return lang;
            })
            .catch((error) => {
                throw error;
            });
    }

    /**
     * Method, that creates store and router for an application and mounts it to DOM.
     */
    mountApplication() {
        window.spa.signals.emit('app.beforeInit', { app: this });

        let storeConstructor = new StoreConstructor(this.views);

        window.spa.signals.emit('app.beforeInitStore', { storeConstructor });

        let routerConstructor = new RouterConstructor(
            this.views,
            routerMixins.routesComponentsTemplates,
            routerMixins.customRoutesComponentsTemplates,
        );

        window.spa.signals.emit('app.beforeInitRouter', { routerConstructor });

        let i18n = new VueI18n({
            locale: guiLocalSettings.get('lang') || 'en',
            messages: this.translations,
            silentTranslationWarn: true,
        });

        this.application = new Vue({
            mixins: [this.appRootComponent],
            propsData: {
                info: this.api.openapi.info,
                x_menu: this.api.openapi.info['x-menu'],
                x_docs: this.api.openapi.info['x-docs'],
                a_links: false,
            },
            router: routerConstructor.getRouter(),
            store: storeConstructor.getStore(),
            i18n: i18n,
        }).$mount('#RealBody');

        window.spa.signals.emit('app.afterInit', { app: this });
    }
}

window.App = App;
