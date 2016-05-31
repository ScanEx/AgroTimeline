var SlopeManager = function () {

    this._featuresArray;

    this._colouredLayer = null;
    this._requests = [];
    this._stylesData = [];
    this._itemsIDToRemove = [];

    this._bagSize = 10;
    this._queue = new RequestsQueue();
    this.isClear = true;
};

SlopeManager.prototype.clear = function () {
    this.isClear = true;
    this.removeItems();
    this._stylesData.length = 0;
    this._queue.clear();
    this._requests.length = 0;
};

SlopeManager.prototype.initialize = function () {
    //...
};

SlopeManager.prototype.initializeColouredLayer = function () {
    var prop = {
        'properties': {
            //'Temporal': true
            //, 'TemporalColumnName': "acqdate"
        }
    };

    this._colouredLayer = L.gmx.createLayer(prop);

    this._colouredLayer.setStyle({
        "renderStyle": {
            "fillColor": 0x0,
            "fillOpacity": 0,
            "color": 0x0,
            "weight": 4,
            "opacity": 0
        }
    });

    this._colouredLayer.setZIndex(50000);

    this._colouredLayer.disablePopup();
    this.setVisible(true);

    var that = this;
    setTimeout(function () {
        that._colouredLayer.setStyleHook(function (data) {
            if (that._stylesData[data.id]) {
                return that._stylesData[data.id];
            } else {
                return data.style;
            }
        });
    }, 0);

    nsGmx.leafletMap.addLayer(this._colouredLayer);
};

SlopeManager.prototype.setVisible = function (visible) {
    if (visible) {
        nsGmx.leafletMap.addLayer(this._colouredLayer);
    } else {
        nsGmx.leafletMap.removeLayer(this._colouredLayer)
    }
};

SlopeManager.prototype.setFeatures = function (features) {
    this._featuresArray = features;
};

SlopeManager.prototype._constuctRequestsArray = function () {
    this._requests.length = 0;

    var req = [];

    for (var i = 1; i <= this._featuresArray.length; i++) {

        var item = {
            "Border": this._featuresArray[i - 1].geometry,
            "BorderSRS": "EPSG:4326",
            "Items": [
                {
                    "Name": this._featuresArray[i - 1].id,
                    "Layers": "F75B7265AE6C48348D49BC9D4C5AE723",
                    "Bands": ["r", "g", "b"],
                    "Return": ["Stat"],
                    "NoData": [0, 0, 0]
                }
            ]
        };

        req.push(item);

        if (i % this._bagSize == 0) {
            this._requests.push(req.slice(0));
            req.length = 0;
            req = [];
        }
    }

    if (req.length) {
        this._requests.push(req.slice(0));
    }
};

SlopeManager.prototype.startThemesThread = function () {
    this.isClear = false;
    this._constuctRequestsArray();
    this._stylesData.length = 0;
    this.removeItems();
    this._queue.initisalize(this._requests, this, this.applyRequest);
    this._colouredLayer.setVisible(true);
    this._queue.start();
};

SlopeManager.prototype.removeItems = function () {
    if (this._itemsIDToRemove.length) {
        this._colouredLayer.removeItems(this._itemsIDToRemove);
        this._itemsIDToRemove.length = 0;
    }
};

SlopeManager.prototype.applyRequest = function (res) {
    for (var i = 0; i < res.length; i++) {
        var r = res[i];
        if (r.Bands.b) {
            var b = r.Bands.b.Mean;
            var u = r.ValidPixels;
            var valid = r.ValidPixels / (r.NoDataPixels + r.ValidPixels + r.BackgroundPixels);
            if (valid > 0.32) {
                this.applyPalette(parseInt(r.Name), (b - 1) / 10);
            } else {
                this.applyPalette(parseInt(r.Name), -100);
            }
        }
    }
};

SlopeManager.palette = {
    "0": { "r": 7, "g": 142, "b": 81 },

    "1": { "r": 35, "g": 190, "b": 0 },

    "2": { "r": 249, "g": 249, "b": 34 },

    "3": { "r": 245, "g": 233, "b": 6 },
    "4": { "r": 245, "g": 233, "b": 6 },

    "5": { "r": 255, "g": 182, "b": 10 },
    "6": { "r": 255, "g": 182, "b": 10 },

    "7": { "r": 255, "g": 122, "b": 129 },
    "8": { "r": 255, "g": 122, "b": 129 },
    "9": { "r": 255, "g": 122, "b": 129 },

    "10": { "r": 251, "g": 0, "b": 8 },
    "11": { "r": 251, "g": 0, "b": 8 },
    "12": { "r": 251, "g": 0, "b": 8 },
    "13": { "r": 251, "g": 0, "b": 8 },
    "14": { "r": 251, "g": 0, "b": 8 },

    "15": { "r": 156, "g": 0, "b": 8 },
    "16": { "r": 156, "g": 0, "b": 8 },
    "17": { "r": 156, "g": 0, "b": 8 },
    "18": { "r": 156, "g": 0, "b": 8 },
    "19": { "r": 156, "g": 0, "b": 8 },
    "20": { "r": 156, "g": 0, "b": 8 },
    "21": { "r": 156, "g": 0, "b": 8 },
    "22": { "r": 156, "g": 0, "b": 8 },
    "23": { "r": 156, "g": 0, "b": 8 },
    "24": { "r": 156, "g": 0, "b": 8 },

    "25": { "r": 145, "g": 5, "b": 7 }
};

SlopeManager.prototype.applyPalette = function (id, value) {

    var r = 0, g = 0, b = 0, a = 100;

    if (value >= 0) {
        if (value > 25) {
            value = 25;
        }
        var color = SlopeManager.palette[Math.floor(value)];
        r = color.r;
        g = color.g;
        b = color.b;

        this._stylesData[id] = {
            fill: { color: RGB2HEX(r, g, b), opacity: a },
            outline: { color: RGB2HEX(r, g, b), opacity: a, thickness: 1 }
        };

        this._colouredLayer.addItems([this._featuresArray[id - 1]]);
        this._itemsIDToRemove.push(id);
        this._colouredLayer.repaint();
    } else {
        r = 0;
        g = 0;
        b = 0;

        this._stylesData[id] = {
            fill: { color: RGB2HEX(r, g, b), opacity: 0 },
            outline: { color: RGB2HEX(r, g, b), opacity: 0, thickness: 1 }
        };

        this._colouredLayer.addItems([this._featuresArray[id - 1]]);
        this._itemsIDToRemove.push(id);
        this._colouredLayer.repaint();
    }
};
