var uniqueGlobalName = (function () {
    var freeid = 0;
    return function (thing) {
        var id = 'gmx_unique_' + freeid++;
        window[id] = thing;
        return id;
    }
})();

/** Посылает кросс-доменный GET запрос к серверу с использованием транспорта JSONP.
 * 
 * @param {String} url URL сервера.
 * @param {Function} callback Ф-ция, которая будет вызвана при получении от сервера результата.
 * @param {String} [callbackParamName=CallbackName] Имя параметра для задания имени ф-ции ответа.
 * @param {Function} [errorCallback] Ф-ция, которая будет вызвана в случае ошибки запроса к серверу
 */
var sendCrossDomainJSONRequest = function (url, callback, callbackParamName, errorCallback) {
    callbackParamName = callbackParamName || 'CallbackName';

    var script = document.createElement("script");
    script.setAttribute("charset", "UTF-8");
    var callbackName = uniqueGlobalName(function (obj) {
        callback && callback(obj);
        window[callbackName] = false;
        document.getElementsByTagName("head").item(0).removeChild(script);
    });

    var sepSym = url.indexOf('?') == -1 ? '?' : '&';

    if (errorCallback) {
        script.onerror = errorCallback;
    }

    script.setAttribute("src", url + sepSym + callbackParamName + "=" + callbackName + "&" + Math.random());
    document.getElementsByTagName("head").item(0).appendChild(script);
};

/** Посылает кроссдоменный POST запрос
*
* @param {String} url URL запроса
* @param {Object} params Хэш параметров-запросов
* @param {Function} [callback] Callback, который вызывается при приходе ответа с сервера. Единственный параметр ф-ции - собственно данные
* @param {DOMElement} [baseForm] базовая форма запроса. Используется, когда нужно отправить на сервер файл. 
*                                В функции эта форма будет модифицироваться, но после отправления запроса будет приведена к исходному виду.
*/
var sendCrossDomainPostRequest = function (url, params, callback, baseForm) {
    var form,
		rnd = String(Math.random()),
		id = '$$iframe_' + url + rnd;

    var iframe = createPostIframe2(id, callback, url),
        originalFormAction;

    if (baseForm) {
        form = baseForm;
        originalFormAction = form.getAttribute('action');
        form.setAttribute('action', url);
        form.target = id;

    }
    else {
        try {
            form = document.createElement('<form id=' + id + '" enctype="multipart/form-data" style="display:none" target="' + id + '" action="' + url + '" method="post"></form>');
        }
        catch (e) {
            form = document.createElement("form");
            form.style.display = 'none';
            form.setAttribute('enctype', 'multipart/form-data');
            form.target = id;
            form.setAttribute('method', 'POST');
            form.setAttribute('action', url);
            form.id = id;
        }
    }

    var hiddenParamsDiv = document.createElement("div");
    hiddenParamsDiv.style.display = 'none';

    if (params.WrapStyle === 'window') {
        params.WrapStyle = 'message';
    }

    if (params.WrapStyle === 'message') {
        params.CallbackName = iframe.callbackName;
    }

    for (var paramName in params) {
        var input = document.createElement("input");

        var value = typeof params[paramName] !== 'undefined' ? params[paramName] : '';

        input.setAttribute('type', 'hidden');
        input.setAttribute('name', paramName);
        input.setAttribute('value', value);

        hiddenParamsDiv.appendChild(input)
    }

    form.appendChild(hiddenParamsDiv);

    if (!baseForm)
        document.body.appendChild(form);

    document.body.appendChild(iframe);

    form.submit();

    if (baseForm) {
        form.removeChild(hiddenParamsDiv);
        if (originalFormAction !== null)
            form.setAttribute('action', originalFormAction);
        else
            form.removeAttribute('action');
    }
    else {
        form.parentNode.removeChild(form);
    }
};

var parseUri = function (str) {

    var o = {
        strictMode: false,
        key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'],
        q: {
            name: 'queryKey',
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    var m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str),
        uri = {},
        i = 14;

    while (i--) {
        uri[o.key[i]] = m[i] || '';
    }

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) { uri[o.q.name][$1] = $2; }
    });

    uri.hostOnly = uri.host;
    uri.host = uri.authority; // HACK

    return uri;
};

var createPostIframe2 = function (id, callback, url) {
    var uniqueId = uniquePrefix + (lastRequestId++);

    iframe = document.createElement("iframe");
    iframe.style.display = 'none';
    iframe.setAttribute('id', id);
    iframe.setAttribute('name', id);
    iframe.src = 'javascript:true';
    iframe.callbackName = uniqueId;
    //iframe.onload = window[callbackName];

    var parsedURL = parseUri(url);
    var origin = (parsedURL.protocol ? (parsedURL.protocol + ':') : window.location.protocol) + '//' + (parsedURL.host || window.location.host);

    requests[origin] = requests[origin] || {};
    requests[origin][uniqueId] = { callback: callback, iframe: iframe };

    return iframe;
};

var requests = {},
    lastRequestId = 0,
    uniquePrefix = 'id' + Math.random();

var processMessage = function (e) {
    if (!(e.origin in requests)) {
        return;
    }

    var dataStr = decodeURIComponent(e.data.replace(/\n/g, '\n\\'));
    try {
        var dataObj = JSON.parse(dataStr);
    } catch (e) {
        request.callback && request.callback({ Status: "error", ErrorInfo: { ErrorMessage: "JSON.parse exeption", ExceptionType: "JSON.parse", StackTrace: dataStr } });
    }
    var request = requests[e.origin][dataObj.CallbackName];
    if (!request) return;    // message от других запросов

    delete requests[e.origin][dataObj.CallbackName];
    delete dataObj.CallbackName;

    request.iframe.parentNode.removeChild(request.iframe);
    request.callback && request.callback(dataObj);
}

//совместимость с IE8
if (window.addEventListener) {
    window.addEventListener('message', processMessage);
} else {
    window.attachEvent('onmessage', processMessage);
}