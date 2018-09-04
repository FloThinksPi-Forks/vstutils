
// Список файлов тестирующих ГУЙ
window.guiTestsFiles = []

// Добавляем файл тестов к списку файлов для тестов гуя
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/qUnitTest.js')
//window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/dashboard.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiElements.js')



// Запускает тесты гуя
function loadQUnitTests()
{
    loadAllUnitTests(window.guiTestsFiles)
}

// Загружает и запускает тесты гуя в строгом порядке.
function loadAllUnitTests(urls)
{
    let promises = []
    for(let i in urls)
    {
        let def = new $.Deferred();
        promises.push(def.promise());

        var link = document.createElement("script");
        link.setAttribute("type", "text/javascript");
        link.setAttribute("src", urls[i]+'?r='+Math.random());

        link.onload = function(def){
            return function(){
                def.resolve();
            }
        }(def)
        document.getElementsByTagName("head")[0].appendChild(link);
        
        break;
    }

    $.when.apply($, promises).done(() => {
        //injectQunit()
        
        if(urls.length == 1)
        {
            return injectQunit()
        }
        urls.splice(0, 1)
        loadAllUnitTests(urls)
    })
}


function addslashes(string) {
    return string.replace(/\\/g, '\\\\').
    replace(/\u0008/g, '\\b').
    replace(/\t/g, '\\t').
    replace(/\n/g, '\\n').
    replace(/\f/g, '\\f').
    //replace(/\r/g, '\\r').
    //replace(/\a/g, '\\a').
    replace(/\v/g, '\\v').
    //replace(/\e/g, '\\e').
    replace(/'/g, '\\\'').
    replace(/"/g, '\\"');
}

function stripslashes (str) {
    //       discuss at: http://locutus.io/php/stripslashes/
    //      original by: Kevin van Zonneveld (http://kvz.io)
    //      improved by: Ates Goral (http://magnetiq.com)
    //      improved by: marrtins
    //      improved by: rezna
    //         fixed by: Mick@el
    //      bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    //      bugfixed by: Brett Zamir (http://brett-zamir.me)
    //         input by: Rick Waldron
    //         input by: Brant Messenger (http://www.brantmessenger.com/)
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    //        example 1: stripslashes('Kevin\'s code')
    //        returns 1: "Kevin's code"
    //        example 2: stripslashes('Kevin\\\'s code')
    //        returns 2: "Kevin\'s code"
    return (str + '')
        .replace(/\\(.?)/g, function (s, n1) {
            switch (n1) {
                case '\\':
                    return '\\'
                case '0':
                    return '\u0000'
                case 't':
                    return "\t"
                case 'n':
                    return "\n"
                case 'f':
                    return "\f"
                //case 'e':
                //  return "\e"
                case 'v':
                    return "\v"
                //case 'a':
                //  return "\a"
                case 'b':
                    return "\b"
                //case 'r':
                //  return "\r"
                case '':
                    return ''
                default:
                    return n1
            }
        })
}
/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}


function inheritance(obj, constructor)
{
    var object = undefined;
    var item = function()
    {
        if(constructor)
        {
            return constructor.apply(jQuery.extend(true, item, object), arguments);
        }

        return jQuery.extend(true, item, object);
    }

    object = jQuery.extend(true, item, obj)

    return object
}

function toIdString(str)
{
    return str.replace(/[^A-z0-9\-]/img, "_").replace(/[\[\]]/gi, "_");
}

function hidemodal()
{
    var def = new $.Deferred();
    $(".modal.fade.in").on('hidden.bs.modal', function (e) {
        def.resolve();
    })
    $(".modal.fade.in").modal('hide');

    return def.promise();
}


function capitalizeString(string)
{
    if(!string)
    {
        return "";
    }
    
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function isEmptyObject(obj) {
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            return false;
        }
    }
    return true;
}

window.onresize=function ()
{
    if(window.innerWidth>767)
    {
        if(guiLocalSettings.get('hideMenu'))
        {
            $("body").addClass('sidebar-collapse');
        }
        if ($("body").hasClass('sidebar-open'))
        {
            $("body").removeClass('sidebar-open');
        }
    }
    else
    {
        if ($("body").hasClass('sidebar-collapse')){
            $("body").removeClass('sidebar-collapse');
        }
    }
}

var guiLocalSettings = {
    __settings:{
    },
    get:function(name){
        return this.__settings[name];
    },
    set:function(name, value){
        this.__settings[name] = value;
        window.localStorage['guiLocalSettings'] = JSON.stringify(this.__settings)
        tabSignal.emit('guiLocalSettings.'+name, {type:'set', name:name, value:value})
    },
    setIfNotExists:function(name, value)
    {
        if(this.__settings[name] === undefined)
        {
            this.__settings[name] = value;
        }
    }
}

if(window.localStorage['guiLocalSettings'])
{
    try{
        guiLocalSettings.__settings = window.localStorage['guiLocalSettings'];
        guiLocalSettings.__settings = JSON.parse(guiLocalSettings.__settings)

    }catch (e)
    {

    }
}

function getNewId(){
    return ("id_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
}