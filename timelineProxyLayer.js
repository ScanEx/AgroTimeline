var TimelineProxyLayer = function (agroTimeline, layer, lmap) {
    this._agroTimeline = agroTimeline;
    this.lmap = lmap;
    this.serverLayer = null;
    this.localLayer = null;
    this._observer = null;
    this._dataCache = {};
    this.dateColumnIndex = -1;
    this.name = null;

    layer && this.bindLayer(layer);
    this._init();
    this._prevBounds = null;
    this._bounds;
};

TimelineProxyLayer.cloneProperties = function (prop) {
    var mapName = "";
    if (nsGmx && nsGmx.gmxMap) {
        mapName = nsGmx.gmxMap.properties.name;
    }

    return {
        "DateBegin": prop.DateBegin,
        "DateEnd": prop.DateEnd,
        "GeometryType": prop.GeometryType,
        "LayerID": "proxy_" + prop.LayerID,
        "MaxZoom": prop.MaxZoom,
        "MinZoom": prop.MinZoom,
        "IsRasterCatalog": prop.IsRasterCatalog,
        "RCMinZoomForRasters": prop.RCMinZoomForRasters,
        "mapName": mapName,
        "Temporal": prop.Temporal,
        "TemporalColumnName": prop.TemporalColumnName,
        "ZeroDate": prop.ZeroDate,
        "attrTypes": [].concat(prop.attrTypes),
        "attributes": [].concat(prop.attributes),
        "hostName": prop.hostName,
        "identityField": prop.identityField,
        "name": "proxy_" + prop.name,
        "type": prop.type,
        "styles": prop.styles
    }
};

TimelineProxyLayer.prototype.delete = function () {
    this._dataCache = {};
    this.serverLayer.removeObserver(this._observer);
    this._observer = null;
    this.lmap.removeLayer(this.localLayer);
    this.localLayer = null;
};

TimelineProxyLayer.prototype._init = function () {
    var that = this;
    this.lmap.on("moveend", function () {
        that.serverLayer && that.update();
    });
};

TimelineProxyLayer.prototype.update = function () {
    NDVITimelineManager.fires_ht = {};
    this._prevBounds = this._bounds;
    this._bounds = this.lmap.getBounds();
    this._observer && this._observer.setBounds(this._bounds);
    this._dataCache = {};
};

TimelineProxyLayer.prototype.bindLayer = function (layer) {

    this._prevBounds = this._bounds = this.lmap.getBounds();

    this.serverLayer = layer;

    var prop = layer.getGmxProperties();
    prop = TimelineProxyLayer.cloneProperties(prop);
    this.name = prop.name;
    this.localLayer = L.gmx.createLayer({ "properties": prop });

    var that = this;

    var tcln = layer.getGmxProperties().TemporalColumnName;
    this.dateColumnIndex = layer._gmx.tileAttributeIndexes[tcln];
    var dm = layer._gmx.dataManager;

    dm.addFilter('myDateFilter', function (item) {
        if (that.lastTimeStamp !== item.properties[that.dateColumnIndex]) {
            that.lastTimeStamp = item.properties[that.dateColumnIndex];
            return item.properties;
        }
        return null;
    });

    this._observer = layer.addObserver({
        type: "update",
        bounds: this.lmap.getBounds(),
        dateInterval: [new Date(), new Date()],
        filters: ['clipFilter', 'TemporalFilter', 'myDateFilter'],
        callback: function (data) {
            var arr = data.added || [];
            var features = [];
            for (var i = 0; i < arr.length; i++) {
                var item = arr[i].properties;
                var dt = item[that.dateColumnIndex] * 1000;
                var date = new Date(dt);
                item[that.dateColumnIndex] = Math.round(shared.clearDate(dt) / 1000);
                var key = date.getDate() + "_" + (date.getMonth() + 1) + "_" + date.getFullYear();

                if (!that._dataCache[key]) {
                    that._dataCache[key] = item;
                    features.push(item);
                }
            }
            arr.length && that.localLayer.addData(features);
            NDVITimelineManager.fires_ht = {};
            setTimeout(function () {
                NDVITimelineManager.fires_ht = {};
                that._agroTimeline.timeLine.updateFilters();
                that._agroTimeline.refreshSelections();
            }, 300);
        }
    });
};

TimelineProxyLayer.prototype.setDateInterval = function (startDate, endDate) {
    this._observer && this._observer.setDateInterval(startDate, endDate);
};