var Rating = function (dataSource) {
    this.dataSource = dataSource || "F7BF28C501264773B1E7C236D81E963C";
    this._layers = [];
    this._layersStyleData = {};
};

Rating.__hookId = "ratingXXXab345pp";

Rating.palette = {
    "0": { "r": 245, "g": 12, "b": 50 },
    "10": { "r": 0, "g": 0, "b": 0 },
    "20": { "r": 0, "g": 0, "b": 0 },
    "30": { "r": 0, "g": 0, "b": 0 },
    "40": { "r": 227, "g": 145, "b": 57 },
    "50": { "r": 230, "g": 200, "b": 78 },
    "60": { "r": 240, "g": 240, "b": 24 },
    "70": { "r": 223, "g": 237, "b": 92 },
    "80": { "r": 179, "g": 214, "b": 109 },
    "90": { "r": 125, "g": 235, "b": 21 },
    "100": { "r": 30, "g": 163, "b": 18 }
};

Rating.prototype.clear = function () {
    for (var i = 0; i < this._layers.length; i++) {
        styleHookManager.removeStyleHook(this._layers[i], Rating.__hookId);
    }
    this._layersStyleData = {};
    this.redraw();
    this._layers = [];
};

Rating.prototype.setLayerStyleHook = function (layer) {
    var that = this;
    var layerName = layer.getGmxProperties().LayerID;
    this._layersStyleData[layerName] = {};

    styleHookManager.addStyleHook(layer, Rating.__hookId, function (data) {
        if (that._layersStyleData[layerName] && that._layersStyleData[layerName][data.id]) {
            return that._layersStyleData[layerName][data.id];
        } else {
            return data.style;
        }
    }, 100);
};

Rating.prototype.show = function () {
    //TODO
};

Rating.prototype.hide = function () {
    //TODO
};

Rating.prototype.redraw = function () {
    for (var i = 0; i < this._layers.length; i++) {
        this._layers[i].repaint();
    }
};

Rating.prototype.start = function (layersArr, dateStr) {

    this.clear();

    var layersStr = "[layer_id] in (";
    for (var i = 0; i < layersArr.length; i++) {
        var layer = layersArr[i];
        this._layers.push(layer);
        this.setLayerStyleHook(layer);
        layersStr += "'" + layer.getGmxProperties().LayerID + "',";
    }
    layersStr = layersStr.substr(0, layersStr.length - 1) + ")";

    var that = this;

    var useData2016 = true;
    var year = parseInt(dateStr.split('.')[2]);

    var url = "http://maps.kosmosnimki.ru/rest/ver1/layers/~/search?api_key=BB3RFQQXTR";
    var tale = '&tables=[{"LayerName":"' +  that.dataSource + '","Alias":"n"},{"LayerName":"88903D1BF4334AEBA79E1527EAD27F99","Alias":"f","Join":"Inner","On":"[n].[field_id] = [f].[gmx_id]"}]&' +
        'columns=[{"Value":"[f].[layer_id]"},{"Value":"[f].[layer_gmx_id]"},' +
        (useData2016 ?
        '{"Value":"[n].[ndvi_mean_clear]"},{"Value":"[n].[valid_area_pct]"}]' :
        '{"Value":"[n].[Value]"}]');
    if (!useData2016) {
        url += "&query=[date]='" + dateStr + "' AND (" + layersStr + ") AND [completeness]>=50.0" + tale;
    } else {
        //url += "&query=[date]='" + dateStr + "' AND (" + layersStr + ") AND [image_cover_pct]>=50.0 AND [valid_area_pct]>=90" + tale;
        url += "&query=[date]='" + dateStr + "' AND (" + layersStr + ") AND [image_cover_pct]>=50.0" + tale;
    }

    $.getJSON(url, function (response) {
        var features = response.features;

        var value;
        if (useData2016) {
            value = "ndvi_mean_clear";
        } else {
            value = "Value";
        }

        features.sort(function (a, b) {
            return a.properties[value] - b.properties[value];
        });

        var ratingFeatures = {};
        var maxValue = -1000000,
            minValue = 1000000;
        for (var i = 0; i < features.length; i++) {
            var fi = features[i];
            if (fi.properties[value] >= 0 && fi.properties.valid_area_pct >= 90) {
                if (fi.properties[value] > maxValue)
                    maxValue = fi.properties[value];
                if (fi.properties[value] < minValue)
                    minValue = fi.properties[value];
            }
            if (!ratingFeatures[fi.properties.layer_id]) {
                ratingFeatures[fi.properties.layer_id] = {};
            }
            ratingFeatures[fi.properties.layer_id][fi.properties.layer_gmx_id] = fi.properties;
        }

        if (maxValue == minValue) {
            minValue = 0;
        }

        if (useData2016) {
            maxValue = maxValue * 100 + 1;
            minValue = minValue * 100 + 1;
        }

        for (var i = 0; i < features.length; i++) {
            var fi = features[i];
            var v = ratingFeatures[fi.properties.layer_id][fi.properties.layer_gmx_id][value];
            if (useData2016) {
                v = v * 100 + 1;
            }
            if (fi.properties.valid_area_pct < 90) {
                that._layersStyleData[fi.properties.layer_id][fi.properties.layer_gmx_id] = {
                    "fillOpacity": 1,
                    "fillStyle": "rgb(0,179,255)"
                };
            }else if (v >= 0) {
                var k = (Math.floor((v - minValue) / (maxValue - minValue) * 10) * 10).toString();
                var color = Rating.palette[k];
                that._layersStyleData[fi.properties.layer_id][fi.properties.layer_gmx_id] = {
                    "fillOpacity": 1,
                    "fillStyle": "rgb(" + color.r + "," + color.g + "," + color.b + ")"
                };
            }
        }

        that.redraw();
    });
};
