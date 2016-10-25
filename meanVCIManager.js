MeanVCIManager = function () {

    this._featuresArray;

    this._colouredLayer = null;
    this._requests = [];
    this._stylesData = [];
    this._itemsIDToRemove = [];

    this.isClear = true;

    this.datedYear = 2000;
    this.currentYear = 2014;
    this.day = 10;
    this.month = 9;

    this._currentFilename = "";

    //на получение текущей даты выбранного снимка;
    this._defFn = null;

    this._currentRK = "";


    //синхро-очередь
    this._pendingsQueue = [];
    this._counter = 0;

    //This is rule for integral indexes building
    this.MAX_LOADING_REQUESTS = 3;

    this.featureIdName = [];
    this.vciData = {};
};

// максимальный разброс дней даты снимка
MeanVCIManager.dayAccuracy = 4;
MeanVCIManager.ndviLayer = { "name": "3AD0B4A220D349848A383D828781DF4C", "dateColumnName": "ninthday", "prodtypeColumnName": "prodtype", "prodtype": "NDVI16" };

MeanVCIManager.addDaysToDate = function (date, days) {
    var dateOffset = (24 * 60 * 60 * 1000) * days;
    var myDate = new Date();
    myDate.setTime(date.getTime() + dateOffset);
    return myDate;
};

MeanVCIManager.dateToString = function (date) {
    return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear();
};

// Получает список GMX_RasterCatalogId в слое модис в границах border. 
// По завершению запускает _sendRequest
MeanVCIManager.prototype.startQueue = function (feature) {
    if (this._counter >= this.MAX_LOADING_REQUESTS) {
        this._pendingsQueue.push(feature);
    } else {
        this.loadBorderFeature(feature);
    }
};

MeanVCIManager.prototype.loadBorderFeature = function (feature) {
    this._counter++;

    var that = this;

    var startDay = this.day - MeanVCIManager.dayAccuracy,
        endDay = this.day + MeanVCIManager.dayAccuracy;

    this.datedYear = 2000;

    var q = ("(year([" + MeanVCIManager.ndviLayer.dateColumnName + "])>='" + this.datedYear.toString() +
    "')AND(year([" + MeanVCIManager.ndviLayer.dateColumnName + "])<='" + "2014" +
    "')AND(day([" + MeanVCIManager.ndviLayer.dateColumnName + "])>='" + startDay.toString() +
    "')AND(day([" + MeanVCIManager.ndviLayer.dateColumnName + "])<='" + endDay.toString() +
    "')AND(month([" + MeanVCIManager.ndviLayer.dateColumnName + "])='" + this.month.toString() + "')" +
    (MeanVCIManager.ndviLayer.prodtypeColumnName ? ("AND([" + MeanVCIManager.ndviLayer.prodtypeColumnName + "]='" + MeanVCIManager.ndviLayer.prodtype + "')") : ""));


    sendCrossDomainPostRequest("http://maps.kosmosnimki.ru/VectorLayer/Search.ashx", {
        'border': JSON.stringify(gmxAPI.merc_geometry(feature.geometry)),
        'query': q,
        'geometry': false,
        'layer': MeanVCIManager.ndviLayer.name,
        'WrapStyle': "window"
    }, function (result) {
        var res = result.Result;
        var index = res.fields.indexOf("GMX_RasterCatalogID"),
            //fnIndex = res.fields.indexOf("filename"),
            dtIndex = res.fields.indexOf(MeanVCIManager.ndviLayer.dateColumnName);

        //группируем слои по годам
        var groupedLayers = [];

        for (var i = 0; i < res.values.length; i++) {

            var date = new Date(res.values[i][dtIndex] * 1000),
                gmxId = res.values[i][index];

            var itemYear = date.getFullYear().toString();

            if (!groupedLayers[itemYear]) {
                groupedLayers[itemYear] = [];
            }
            groupedLayers[itemYear].push(gmxId);

        }

        var items = [];

        //готовим запросы
        for (var i in groupedLayers) {

            var item = {
                "Layers": groupedLayers[i],
                "Bands": ["r", "g", "b"],
                "Return": ["Stat"],
                "NoData": [0, 0, 0]
            };

            if (parseInt(i) == that.currentYear) {
                item["Name"] = "curr_" + feature.id + "_" + i;
            } else {
                item["Name"] = "prev_" + feature.id + "_" + i;
            }

            items.push(item);
        }

        //запомним имя по id
        that.featureIdName[feature.id] = feature.properties.name;
        that.vciData[feature.properties.name] = { "vci": 0, "ndvi": {} };

        var request = {
            "Border": feature.geometry,
            "BorderSRS": "EPSG:4326",
            "Items": items
        };

        that._sendRequest.call(that, request);

    });
};

MeanVCIManager.prototype.setCurrentDate = function (day, month, currYear) {
    this.day = day;
    this.month = month;
    this.currentYear = currYear;
};

MeanVCIManager.prototype.setDatedYear = function (datedYear) {
    this.datedYear = datedYear;
};

MeanVCIManager.prototype.setCurrentDateByFilename = function (filename) {
    this._currentFilename = filename;

    if (filename.length) {

        this._defFn = new $.Deferred();

        var that = this;

        var q = ("[filename]='" + filename + "'");
        sendCrossDomainPostRequest(window.serverBase + "VectorLayer/Search.ashx", {
            'query': q,
            'geometry': false,
            'layer': MeanVCIManager.ndviLayer.name,
            'WrapStyle': "window"
        }, function (result) {
            var res = result.Result;
            var dateIndex = res.fields.indexOf(MeanVCIManager.ndviLayer.dateColumnName);
            var date = new Date(res.values[0][dateIndex] * 1000);

            var gmxIDindex = res.fields.indexOf("GMX_RasterCatalogID");
            that._currentRK = res.values[0][gmxIDindex];

            that.setCurrentDate(date.getDate(), date.getMonth() + 1, date.getFullYear());

            that._defFn.resolve();
        });
    }
};

MeanVCIManager.prototype.show = function (modisFilename, layerId) {
    var that = this;
    this._counter = 0;

    this.setCurrentDateByFilename(modisFilename);
    this._defFn.then(function () {
        ThemesManager.getLayerGeometry(layerId, that, that._startThreads);
    });
};

MeanVCIManager.prototype._startThreads = function (features) {
    this.setFeatures(features.features);

    for (var i = 0; i < this._featuresArray.length; i++) {
        this.startQueue(this._featuresArray[i]);
    }

    this._colouredLayer.setVisible(true);
};

MeanVCIManager.prototype._sendRequest = function (request) {
    var that = this;
    sendCrossDomainPostRequest(window.serverBase + 'plugins/getrasterhist.ashx', {
        'WrapStyle': 'window',
        'Request': JSON.stringify(request)
    }, function (response) {
        if (response && response.Result) {
            that.applyRequest.call(that, response.Result);
            that.dequeueRequest();

            //завершение
            //if (that._itemsIDToRemove.length == that._featuresArray.length) {
            //    that.saveCSV();
            //}
        }
    });
};

//MeanVCIManager.prototype.saveCSV = function () {
//    var str = "Район;VCI;2014;2013;2012;2011;2010;2009;2008;2007;2006;2005;2004;2003;2002;2001;2000%0A";

//    for (var r in this.vciData) {
//        var datar = this.vciData[r];
//        str += r + ";" + datar.vci + ";";
//        for (var i = 2014; i >= 2000; i--) {
//            str += datar.ndvi[i] + (i == 2000 ? "%0A" : ";");
//        }
//    }

//    var a = document.createElement('a');
//    a.href = 'data:attachment/csv,' + str;
//    a.target = '_blank';
//    a.download = this.day + '.' + this.month + '.' + this.currentYear + '.csv';
//    document.body.appendChild(a);
//    a.click();
//};

MeanVCIManager.prototype.dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length) {
        if (this._counter < this.MAX_LOADING_REQUESTS) {
            var feature;
            if (feature = this.whilePendings())
                this.loadBorderFeature.call(this, feature);
        }
    }
};

MeanVCIManager.prototype.whilePendings = function () {
    while (this._pendingsQueue.length) {
        var req = this._pendingsQueue.pop();
        if (req) {
            return req;
        }
    }
    return null;
};


MeanVCIManager.prototype.applyRequest = function (res) {
    //var r = res[0];

    //if (r.Bands.b) {
    //u = r.ValidPixels;
    //if (u > 0) {

    var yearsNdvi = {};
    for (var i = 2005; i <= 2014; i++) {
        yearsNdvi[i] = 0;
    };

    var minMean = 100000000,
        maxMean = -100000000;

    var currMean = 0;

    var id = res[0].Name.split("_")[1];
    var name = this.featureIdName[id];

    for (var i = 0; i < res.length; i++) {
        var meani = res[i].Bands.b.Mean;
        if (res[i].ValidPixels > 0) {
            if (meani > 0) {
                if (meani > maxMean) {
                    maxMean = meani;
                }
                if (meani < minMean) {
                    minMean = meani;
                }
            } else {
                console.log("Error: NDVI==" + meani);
            }
            var namei = res[i].Name.split("_");
            if (namei[0] == "curr") {
                currMean = meani;
            }
            res[i].Name = namei[1];
            yearsNdvi[namei[2]] = (meani > 0 ? meani : "-");
        }
    }

    currMean = (currMean - 1) * 0.01;
    minMean = (minMean - 1) * 0.01;
    maxMean = (maxMean - 1) * 0.01;

    var vci = ((currMean - minMean) / (maxMean - minMean)) * 100;

    this.vciData[name].ndvi = yearsNdvi;
    this.vciData[name].vci = vci;

    this.applyPalette(parseInt(res[0].Name), vci);
    //}
    //}
};

MeanVCIManager.prototype.applyPalette = function (id, VCI) {

    var r = 0, g = 0, b = 0, a = 100;

    if (VCI <= 20) {
        //красный
        r = 255;
        g = 0;
        b = 0;
    } else if (VCI <= 40) {
        //розовый
        r = 255;
        g = 127;
        b = 127;
    } else if (VCI <= 60) {
        //желтый
        r = 255;
        g = 255;
        b = 0;
    } else if (VCI <= 80) {
        //зеленый
        r = 0;
        g = 255;
        b = 0;
    } else if (VCI <= 100) {
        //темно зеленый
        r = 0;
        g = 128;
        b = 0;
    } else {
        //VCI > 100
        r = 0;
        g = 0;
        b = 0;
    }

    this._stylesData[id] = {
        fill: { color: RGB2HEX(r, g, b), opacity: a },
        outline: { color: RGB2HEX(r, g, b), opacity: a, thickness: 1 }
    };

    this._colouredLayer.addItems([this._featuresArray[id - 1]]);
    this._itemsIDToRemove.push(id);
    this._colouredLayer.repaint();
};

MeanVCIManager.prototype.clear = function () {
    this.isClear = true;
    this.removeItems();
    this._stylesData.length = 0;
    this._pendingsQueue.length = 0;
    this._pendingsQueue = [];
};

MeanVCIManager.prototype.initializeColouredLayer = function () {
    var prop = {
        'properties': {
            'Temporal': true
            , 'TemporalColumnName': "acqdate"
        }
    };
    this._colouredLayer = gmxAPI.map.addLayer(prop);

    this._colouredLayer.filters[0].setStyle({
        fill: { color: 0x0, opacity: 0 },
        outline: { color: 0x0, thickness: 4, opacity: 0 }
    });
    this._colouredLayer.bringToBottom();
    this._colouredLayer.disableHoverBalloon();
    this._colouredLayer.setVisible(true);

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
};

MeanVCIManager.prototype.setFeatures = function (features) {
    this._featuresArray = features;
};

MeanVCIManager.prototype.removeItems = function () {
    if (this._itemsIDToRemove.length) {
        this._colouredLayer.removeItems(this._itemsIDToRemove);
        this._itemsIDToRemove.length = 0;
    }
};