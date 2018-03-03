/*
====================================
    class ThematicStrategy
====================================
*/
var ThematicStrategy = function (projFunc, url, colorCallback) {
    this.palette = [];
    url && this.loadPalette(url);
    this.colorCallback = colorCallback;

    this.projFunc = projFunc;

    //для последовательного вычисления
    this._requests = [];
    this._queue = new RequestsQueue();
    this.isClear = true;
    this._applyCallback = null;

    this.returnDataArr = ["Stat"];
    this._requestValueCallback = ThematicStrategy.__ndviValue;

    this._bagSize = 10;

    this.katalogName = "";
};

ThematicStrategy.prototype.clear = function () {
    this._queue.clear();
    this._requests = [];
    this.isClear = true;
};

ThematicStrategy.prototype.setRequestValue = function (callback) {
    this._requestValueCallback = callback;
};

ThematicStrategy.prototype.loadPalette = function (url) {
    var that = this;
    shared.loadPaletteSync(url, function (pal) {
        that.palette = pal;
    });
};

ThematicStrategy.prototype.startThemesThreadByIds = function (gmxRKIdArr, sceneIdArr, catalog, featuresArr, applyCallback, successCallback) {
    this._applyCallback = applyCallback;
    this.isClear = false;
    this._constuctRequestsArray(gmxRKIdArr, sceneIdArr, catalog, featuresArr, function () {
        this._queue.initisalize(this._requests, this, this.applyRequest, successCallback);
        this._queue.start();
    });
};

ThematicStrategy.prototype._constuctRequestsArray = function (GMX_RasterCatalogIDArr, sceneIdArr, catalog, featuresArr, proceedCallback) {

    var dArr = [];
    for (var i = 0; i < sceneIdArr.length; i++) {
        dArr[i] = new $.Deferred();
        if (ThematicHandler.shotsGeomeryCache[sceneIdArr[i]]) {
            dArr[i].resolve();
        } else {
            (function (ii) {
                var query = "[SCENEID]='" + sceneIdArr[ii] + "'";

                function _success(result) {
                    var res = result.Result;
                    var values = res.values;

                    var sid = res.fields.indexOf("sceneid");
                    if (sid == -1) {
                        sid = res.fields.indexOf("SCENEID");
                    }

                    var vi = values[0];
                    var gmxId = vi[res.fields.indexOf("GMX_RasterCatalogID")];
                    var sceneId = vi[sid];
                    var geom = vi[vi.length - 1];

                    ThematicHandler.shotsGeomeryCache[sceneId] = { "GMX_RasterCatalogID": gmxId, "geometry": geom };
                    dArr[ii].resolve();
                };

                var data = {
                    'query': query,
                    'geometry': true,
                    'layer': catalog,
                    'WrapStyle': "window"
                };

                if (nsGmx.Auth && nsGmx.Auth.getResourceServer) {
                    nsGmx.Auth.getResourceServer('geomixer').sendPostRequest("VectorLayer/Search.ashx", data).then(function (result) {
                        _success(result);
                    });
                } else {
                    sendCrossDomainPostRequest(window.serverBase + "VectorLayer/Search.ashx", data, function (result) {
                        _success(result);
                    });
                }
            }(i));
        }
    }

    var that = this;
    $.when.apply($, dArr).then(function () {

        that._requests.length = 0;

        var req = [];

        var iii = 1;

        for (var i = 1; i <= featuresArr.length; i++) {

            var fi = featuresArr[i - 1];

            var coords = fi.geometry.coordinates;

            var isInside = false;

            for (var j = 0; j < sceneIdArr.length; j++) {

                var shot = ThematicHandler.shotsGeomeryCache[sceneIdArr[j]];

                if (fi.geometry.type == "POLYGON") {
                    for (var k = 0; k < coords[0].length; k++) {
                        var ck = coords[0][k];
                        if (shared.isPointInGeometry(shot.geometry, { "x": oldAPI.merc_x(ck[0]), "y": oldAPI.merc_y(ck[1]) })) {
                            isInside = true;
                            break;
                        }
                    }
                } else {
                    for (var k = 0; k < coords.length; k++) {
                        var ck = coords[k][0];
                        for (var m = 0; m < ck.length; m++) {
                            var cm = ck[m];
                            if (shared.isPointInGeometry(shot.geometry, { "x": oldAPI.merc_x(cm[0]), "y": oldAPI.merc_y(cm[1]) })) {
                                isInside = true;
                                break;
                            }
                        }
                        if (isInside) {
                            break;
                        }
                    }
                }
            }

            if (isInside) {
                var item = {
                    "Border": fi.geometry,
                    "BorderSRS": "EPSG:4326",
                    "Items": [
                        {
                            "Name": (fi.properties.ogc_fid || fi.id),
                            "Layers": GMX_RasterCatalogIDArr,
                            "Bands": ["r", "g", "b"],
                            "Return": that.returnDataArr,
                            "NoData": [0, 0, 0]
                        }
                    ]
                };

                req.push(item);

                if (iii % that._bagSize == 0) {
                    that._requests.push(req.slice(0));
                    req.length = 0;
                    req = [];
                }

                iii++;
            }
        }



        if (req.length) {
            that._requests.push(req.slice(0));
        }

        proceedCallback.call(that);
    });
};

ThematicStrategy.__ndviValue = function (ri) {
    return {
        'ndvi_mean_clear': (Math.round(ri.Bands.b.Mean) - 101) / 100
    };
};

ThematicStrategy.__neodnrValue = function (ri) {
    return {
        'ndvi_std_clear': ri.Bands.b.StdDev / 100
    };
};

ThematicStrategy.prototype.getRequestProp = function (ri) {
    if (this._requestValueCallback)
        return this._requestValueCallback.call(this, ri);
};

ThematicStrategy.prototype.applyRequest = function (res) {
    for (var i = 0; i < res.length; i++) {
        var ri = res[i];
        if (ri.Bands.b) {
            var valid = ri.ValidPixels / (ri.NoDataPixels + ri.ValidPixels + ri.BackgroundPixels);
            var id = ri.Name;
            if (valid > 0.32) {
                var prop = this.getRequestProp(ri);
                this.applyPalette(parseInt(id), prop);
            } else {
                this.applyPalette(parseInt(id), null);
            }
        }
    }
};

ThematicStrategy.prototype.applyPalette = function (id, prop) {
    var color = this.colorCallback.call(this, prop);
    this._applyCallback(id, color);
};

/*
====================================
    class ThematicHandler
====================================
*/
var ThematicHandler = function (thematicStrategy) {
    //массив подключенных слоев
    this.sourceLayersArr = {};
    this._thematicStrategy = thematicStrategy;
    this._layersStyleData = {};
    this._layersFeatures = {};

    //выбранная дата
    this._dateStr = null;

    //происходит раскраска(раскраска включена)
    this.activated = false;

    //флаг того, что нет возможности быстро получать данные по rest
    this.manualOnly = false;
    this._counter = 0;
    this._pendingsQueue = [];
    this.dataSource = "";
    //this.layerCollection = null;

    //Вызывается если произошла ошибка, когда слишком много полей для раскраски в ручном режиме.
    this.errorCallback = null;
};

ThematicHandler.prototype.clearLayersStyleData = function () {
    this._layersStyleData = {};
};

ThematicHandler.prototype.repaint = function () {
    for (var l in this._layersFeatures) {
        this._applyStrategy(this._layersFeatures[l], l);
    }
};

ThematicHandler.prototype.hide = function () {
    if (this._visibility) {
        this._visibility = false;
        for (var l in this.sourceLayersArr) {
            styleHookManager.removeStyleHook(this.sourceLayersArr[l], ThematicHandler.__hookId);
            this.sourceLayersArr[l].repaint();
        }
    }
};

ThematicHandler.prototype.show = function () {
    if (!this._visibility) {
        this._visibility = true
        for (var l in this.sourceLayersArr) {
            this.setLayerStyleHook(this.sourceLayersArr[l]);
            this.sourceLayersArr[l].repaint();
        }
    }
};

ThematicHandler.prototype.removeStyleHooks = function () {
    for (var l in this.sourceLayersArr) {
        styleHookManager.removeStyleHook(this.sourceLayersArr[l], ThematicHandler.__hookId);
        this.sourceLayersArr[l].repaint();
    }
    this.sourceLayersArr = {};
};

ThematicHandler.prototype.addLayers = function (layersArr, alternativeGMX_RKArr, sceneIds) {
    if (this.activated) {
        this._alternativeGMX_RKArr = alternativeGMX_RKArr;
        this._sceneIds = sceneIds;
        for (var i = 0; i < layersArr.length; i++) {
            if (!this.sourceLayersArr[layersArr[i].getGmxProperties().LayerID]) {
                //var layer = gmxAPI.map.layers[layersArr[i]];
                var layer = layersArr[i];
                this._applyLayer(layer);
                this.sourceLayersArr[layersArr[i].getGmxProperties().LayerID] = layer;
            }
        }
    }
};

ThematicHandler.__hookId = "xxx5ge9iop1";
ThematicHandler.prototype.setLayerStyleHook = function (layer) {
    var that = this;
    var layerName = layer.getGmxProperties().LayerID;

    styleHookManager.addStyleHook(layer, ThematicHandler.__hookId, function (data) {
        if (that._layersStyleData[layerName] && that._layersStyleData[layerName][data.id]) {
            return that._layersStyleData[layerName][data.id];
        } else {
            return data.style;
        }
    }, -10);
};

ThematicHandler.prototype._applyStrategy = function (features, layerName) {
    this._layersStyleData[layerName] = {};
    var identityField = "layer_gmx_id";
    for (var i = 0; i < features.length; i++) {
        var fi = features[i];
        var prop = fi.properties;
        var color = shared.RGB2HEX(0, 179, 255);
        if (prop.valid_area_pct >= 90.0) {
            color = this._thematicStrategy.colorCallback.call(this._thematicStrategy, prop);
        }
        var opacity = (color ? (color[3] || 1.0) : 0.0);
        this._layersStyleData[layerName][prop[identityField]] = {
            fillStyle: shared.DEC2RGBA(color, opacity),
            fillOpacity: opacity
        };
    }
};

ThematicHandler.shotsGeomeryCache = {};

ThematicHandler.prototype._applyLayer = function (layer) {

    this.setLayerStyleHook(layer);

    var identityField = "layer_gmx_id";
    var layerName = layer.getGmxProperties().LayerID;

    this._layersStyleData[layerName] = {};
    var query = "";
    //проверяем пересечение геометрии слоя со снимками
    for (var i = 0; i < this._sceneIds.length; i++) {
        query += "[SCENEID]='" + this._sceneIds[i] + (i < this._sceneIds.length - 1 ? "' OR " : "'");
    }

    var b = layer.getBounds();
    var min = L.Projection.Mercator.project(b._southWest),
        max = L.Projection.Mercator.project(b._northEast);
    //var min = this._thematicStrategy.projFunc.project(b._southWest),
    //    max = this._thematicStrategy.projFunc.project(b._northEast);

    var p = [{ "x": min.x, "y": min.y }, { "x": min.x, "y": max.y },
             { "x": max.x, "y": max.y }, { "x": max.x, "y": min.y }];

    var that = this;

    function _success(result) {
        var res = result.Result;
        var values = res.values;

        var sid = res.fields.indexOf("sceneid");
        if (sid == -1) {
            sid = res.fields.indexOf("SCENEID");
        }

        var isInside = false;
        for (var i = 0; i < values.length; i++) {
            var vi = values[i];
            var gmxId = vi[res.fields.indexOf("GMX_RasterCatalogID")];
            var sceneId = vi[sid];
            var geom = vi[vi.length - 1];

            ThematicHandler.shotsGeomeryCache[sceneId] = { "GMX_RasterCatalogID": gmxId, "geometry": geom };

            var clips = L.gmxUtil.bounds([[min.x, min.y], [max.x, max.y]]).clipPolygon(geom.coordinates[0]);

            if (clips.length) {
                isInside = true;
                break;
            }
        }

        if (!isInside)
            return;

        var year = parseInt(that._dateStr.split('.')[2]);
        var source = that.dataSource;

        if (!that.manualOnly) {
            var url = "http://maps.kosmosnimki.ru/rest/ver1/layers/~/search?";
            var tale = '&tables=[{"LayerName":"' + source + '","Alias":"n"},{"LayerName":"88903D1BF4334AEBA79E1527EAD27F99","Alias":"f","Join":"Inner","On":"[n].[field_id] = [f].[gmx_id]"}]&' +
                        'columns=[{"Value":"[f].[Farm]"},{"Value":"[f].[Region]"},{"Value":"[f].[Subregion]"},{"Value":"[f].[layer_id]"},{"Value":"[f].[' + identityField + ']"},' +
                        '{"Value":"[n].[ndvi_mean_clear]"},{"Value":"[n].[ndvi_std_clear]"},{"Value":"[n].[ndvi_min_clear]"},{"Value":"[n].[ndvi_max_clear]"},{"Value":"[n].[image_cover_pct]"},{"Value":"[n].[valid_area_pct]"}]';

            url += "&query=[date]='" + that._dateStr + "' AND [layer_id]='" + layerName + "' AND [image_cover_pct]>=50.0" + tale;

            fetch(url, { credentials: 'include' }).then(function (response) { return response.json(); }).then(function (response) {
                //раскраска по полученным с сервера данным
                if (!that.sourceLayersArr[layerName]) {
                    return;
                }
                var features = response.features;
                if (features.length) {
                    that._layersFeatures[layerName] = features;
                    that._applyStrategy(features, layerName);
                    layer.repaint();
                } else {
                    //рассчет вручную
                    that._manualLayerHandler(layer);
                }
            });
        } else {
            //рассчет вручную
            that._manualLayerHandler(layer);
        }
    };

    var data = {
        'query': query,
        'geometry': true,
        'layer': this.katalogName,
        'WrapStyle': "window"
    };

    if (nsGmx.Auth && nsGmx.Auth.getResourceServer) {
        nsGmx.Auth.getResourceServer('geomixer').sendPostRequest("VectorLayer/Search.ashx", data).then(function (result) {
            _success(result);
        });
    } else {
        sendCrossDomainPostRequest(window.serverBase + "VectorLayer/Search.ashx", data, function (result) {
            _success(result);
        });
    }
};

ThematicHandler.prototype._manualLayerHandler = function (layer) {
    if (this._counter >= 1) {
        this._pendingsQueue.push(layer);
    } else {
        this._exec(layer);
    }
};

ThematicHandler.prototype._exec = function (layer) {

    if (!this.activated) {
        return;
    }

    this._counter++;
    var layerName = layer.getGmxProperties().LayerID;

    var that = this;
    shared.getLayersGeometry([layerName], null, function (result) {

        for (var i = 0; i < result.features.length; i++) {
            if (!that._layersFeatures[layerName]) {
                that._layersFeatures[layerName] = [];
            }
            that._layersFeatures[layerName].push(result.features[i]);
        }

        that._thematicStrategy.startThemesThreadByIds(that._alternativeGMX_RKArr, that._sceneIds, that.katalogName, result.features,
            function (id, color) {
                that._layersStyleData[layerName][id] = {
                    fillStyle: shared.DEC2RGB(color),
                    fillOpacity: 1.0
                };
                layer.repaint();
            }, function () {
                that._dequeueRequest();
            });
    }, this.errorCallback);
};

ThematicHandler.prototype._dequeueRequest = function () {
    this._counter--;
    if (this._pendingsQueue.length && this._counter < 1) {
        var req;
        if (req = this._whilePendings())
            this._exec(req);
    }
};

ThematicHandler.prototype._whilePendings = function () {
    while (this._pendingsQueue.length) {
        return this._pendingsQueue.pop();
    }
};

ThematicHandler.prototype.start = function (layersArr, date, alternativeGMX_RKArr, alternativeFilenames) {
    this._visibility = true;
    this._dateStr = date;
    this.clear();
    this.activated = true;
    this.addLayers(layersArr, alternativeGMX_RKArr, alternativeFilenames);
};

ThematicHandler.prototype.clear = function () {
    this._counter = 0;
    this._pendingsQueue = [];
    this._thematicStrategy.clear();
    this._alternativeGMX_RKArr = null;
    this._sceneIds = null;
    this.activated = false;
    this.clearLayersStyleData();
    this.removeStyleHooks();
};