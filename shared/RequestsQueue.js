var RequestsQueue = function () {
    this._requests = [];
    this._callback = null;
    this._sender = null;

    this.pendingsQueue = [];
    this.counter = 0;
    this.MAX_LOADING_REQUESTS = 3;

    this._id = RequestsQueue.ID++;
};

RequestsQueue.ID = 0;

RequestsQueue.prototype.initisalize = function (requests, sender, callback, successCallback) {
    this.clear();
    this._requests = requests.slice(0);
    this._callback = callback;
    this._successCallback = successCallback;
    this._sender = sender;
};

RequestsQueue.prototype.clear = function () {
    this._requests.length = 0;
    this.counter = 0;
    this.pendingsQueue.length = 0;
    this._callback = null;
    this._successCallback = null;
};

RequestsQueue.prototype.start = function () {
    for (var i = 0; i < this._requests.length; i++) {
        this.sendRequest(this._requests[i]);
    }
};

RequestsQueue.prototype.sendRequest = function (request) {
    if (this.counter >= this.MAX_LOADING_REQUESTS) {
        this.pendingsQueue.push(request);
    } else {
        this.loadRequestData(request);
    }
};

RequestsQueue.prototype.loadRequestData = function (request) {
    this.counter++;

    var that = this;

    function _success(response) {
        if (response && response.Result) {

            if (that._callback)
                that._callback.call(that._sender, response.Result);

            that.dequeueRequest();
        }
    };

    var data = {
        'WrapStyle': 'window',
        'Request': JSON.stringify(request)
    };

    if (nsGmx.Auth && nsGmx.Auth.getResourceServer) {
        nsGmx.Auth.getResourceServer('geomixer').sendPostRequest("VectorLayer/Search.ashx", data).then(function (response) {
            _success(response);
        });
    } else {
        sendCrossDomainPostRequest('//maps.kosmosnimki.ru/plugins/getrasterhist.ashx', data, function (response) {
            _success(response);
        });
    }
};

RequestsQueue.prototype.dequeueRequest = function () {
    this.counter--;
    if (this.pendingsQueue.length) {
        if (this.counter < this.MAX_LOADING_REQUESTS) {
            var req;
            if (req = this.whilePendings())
                this.loadRequestData.call(this, req);
        }
    } else if (this.counter == 0 && this._successCallback) {
        this._successCallback();
    }
};

RequestsQueue.prototype.whilePendings = function () {
    while (this.pendingsQueue.length) {
        var req = this.pendingsQueue.pop();
        if (req) {
            return req;
        }
    }
    return null;
};