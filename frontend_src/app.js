// TabSignal
import "./tabSignal.js";

// Jquery and plugins
import jQuery from "jquery";
window.jQuery = jQuery;
window.$ = jQuery;

import "select2";
import "select2/dist/css/select2.css";

import "jquery.scrollto";

require("jquery-slimscroll");

import iziModal from "izimodal/js/iziModal";
$.fn.iziModal = iziModal;
import "izimodal/css/iziModal.css";

// Vue and plugins
import Vue from "vue";
window.Vue = Vue;

import VueRouter from "vue-router";
window.VueRouter = VueRouter;

import Vuex from "vuex";
window.Vuex = Vuex;

import VueI18n from "vue-i18n";
window.VueI18n = VueI18n;

Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(VueI18n);

// Other
import moment from "moment";
window.moment = moment;
import "moment-timezone/builds/moment-timezone-with-data-1970-2030.js";

import md5 from "md5";
window.md5 = md5;

import Visibility from "visibilityjs";
window.Visibility = Visibility;

import IMask from "imask";
window.IMask = IMask;

import iziToast from "izitoast";
import "izitoast/dist/css/iziToast.css";
window.iziToast = iziToast;

import XRegExp from "xregexp/lib/xregexp";
window.XRegExp = XRegExp;

import FastClick from "fastclick";
window.FastClick = FastClick;

import autoComplete from "JavaScript-autoComplete/auto-complete";
window.autoComplete = autoComplete;

import axios from "axios";
window.axios = axios;

import Chart from "chart.js";
window.Chart = Chart;

import { createPopper } from "@popperjs/core";
window.createPopper = createPopper;

// Bootstrap
import "bootstrap/dist/js/bootstrap.js";
import "bootstrap/dist/css/bootstrap.css";

// AdminLTE
require("admin-lte/dist/js/adminlte.js");
import "admin-lte/dist/css/adminlte.css";

import "./fontawesome.scss";

export default {};
