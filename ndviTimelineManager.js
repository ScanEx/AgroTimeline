var NDVITimelineManager = function (lmap, params, userRole, container) {

    //leaflet map
    this.lmap = lmap;

    this._container = container || document.getElementById("flash");

    //этот параметр не рассматривается с точки зрения безопасноти, 
    //только лишь изменяет функциональность
    this._userRole = userRole;

    this._timelineVisibilityLayerID = params.timelineVisibilityLayerID;
    this._exMap = params.exMap;
    this._layersLegend = params.layers;

    this._combo = params.combo;

    //addCombo - [{ "caption": "LANDSAT-8", "rk": ["RGB753", "RGB432"] }]
    //addLayers - { "RGB753": { "viewTimeline": true, "name": "7E81339914D54801A50DD986FD4333AC", "dateColumnName": "ACQDATE" }, "RGB432": { "name": "47A9D4E5E5AE497A8A1A7EA49C7FC336", "dateColumnName": "ACQDATE" } }
    //disableOptions - true
    //selectedCombo - 4

    //дополнительные параметры
    params.addCombo && this._combo.push.apply(this._combo, JSON.parse(params.addCombo));
    if (params.addLayers) {
        var al = JSON.parse(params.addLayers);
        for (i in al) {
            params.layers[i] = al[i];
        }
    }

    if (params.disableOptions)
        this.disableOptions = true;

    this._layerConfigs = {};

    this._dateColumnNames = {};
    this._ndviProdtypes = [];
    for (var p in this._layersLegend) {
        this._dateColumnNames[this._layersLegend[p].name] = this._layersLegend[p].dateColumnName;
        var pp = this._layersLegend[p].palette;
        if (pp) {
            if (pp.ndvi) {
                this._ndviProdtypes.push(pp.ndvi.prodtype);
            }
        }
        this._layerConfigs[this._layersLegend[p].name] = this._layersLegend[p];
    }

    //к какому комбо принадлежит слой
    this._layerInCombo = {};
    //в каком комбо содержатся слои(их названия)
    this._comboAsLayers = [];
    for (var i = 0; i < this._combo.length; i++) {
        this._comboAsLayers[i] = [];
        var r = this._combo[i].rk;
        for (var j = 0; j < r.length; j++) {
            var n = this._layersLegend[r[j]].name;
            this._layerInCombo[n] = i;
            this._comboAsLayers[i][j] = n;
        }
    }

    //загруженные палитры по url'ам
    this._palettes = {};

    //текущий выбранный комбо слой
    this._selectedCombo = params.selectedCombo != undefined ? params.selectedCombo : 1;
    //this._comboSql = [];
    this._comboFilenames = [];

    this._radioButtonLabels = [];

    //текущий индекс увеличения
    this._currentZoom;

    //видимые текущие слои на экране(получаем из хука по стилям)
    this._visibleFieldsLayers = {};
    //this._visibleLayerOnTheDisplay = null;
    this._visibleLayersOnTheDisplay = [];
    this._visibleLayersOnTheDisplayPtr = [];

    //инициализация модуля посторения тематики по средним NDVI
    var ts = new ThematicStrategy(params.layers.HR.palette.ndvi.url, function (val) {
        var color;
        val = Math.round(val);
        if (val == 0 || val == -100) {
            color = shared.RGB2HEX(0, 179, 255);
        } else if (val < 101) {
            color = shared.RGB2HEX(0, 0, 0);
        } else if (val > 201) {
            color = shared.RGB2HEX(255, 255, 255);
        } else {
            var c = this.palette[val];
            color = shared.RGB2HEX(c.partRed, c.partGreen, c.partBlue);
        }
        return color;
    });

    this._themesHandler = new ThematicHandler(ts);
    this._themesHandler.manualOnly = false;
    this._themesHandler.dataSource = "F7BF28C501264773B1E7C236D81E963C";
    this._themesHandler.katalogName = this._layersLegend.HR.name;
    var that = this;
    this._themesHandler.errorCallback = function (er) {
        that.meanNdviNoDataLabel.style.display = "block";
    };

    this._themesEnabled = false;
    this._showThemesNDVI = false;
    this._doubleClick = false;

    //инициализация тематического модуля посторения тематики неоднородности
    var tsneondn = new ThematicStrategy(null, function (val) {
        if (val >= 0) {
            var color = this.palette[10 * Math.floor(val / 10)];
            return shared.RGB2HEX(color.r, color.g, color.b);
        }
        return shared.RGB2HEX(0, 179, 255);
    });
    tsneondn._requestValueCallback = ThematicStrategy.__neodnrValue;
    tsneondn.returnDataArr = ["Hist"];
    tsneondn.palette = {
        "0": { "r": 0, "g": 0, "b": 0 },
        "10": { "r": 245, "g": 12, "b": 50 },
        "20": { "r": 245, "g": 12, "b": 50 },
        "30": { "r": 245, "g": 12, "b": 50 },
        "40": { "r": 227, "g": 145, "b": 57 },
        "50": { "r": 230, "g": 200, "b": 78 },
        "60": { "r": 240, "g": 240, "b": 24 },
        "70": { "r": 223, "g": 237, "b": 92 },
        "80": { "r": 179, "g": 214, "b": 109 },
        "90": { "r": 125, "g": 235, "b": 21 },
        "100": { "r": 30, "g": 163, "b": 18 }
    };
    this._neodnrHandler = new ThematicHandler(tsneondn);
    this._neodnrHandler.manualOnly = false;
    this._neodnrHandler.dataSource = "1F7E5026D73447D09897217CE737F565";
    this._neodnrHandler.katalogName = this._layersLegend.CLASSIFICATION.name;

    this._ratingHandler = new Rating();

    //раскрашиватель по уклонам
    //this._slopeManager = new SlopeManager();
    //this._slopeManager.initializeColouredLayer();

    this._currentRKIdArr = []; //для ndvi
    this._currentFnIdArr = []; //для ndvi
    this._currentClassificationFnIdArr = [];
    this._currentClassificationRKIdArr = []; //для неоднородности
    this._selectedDate = null;
    this._selectedDateStr = null;
    this._selectedDateL = null;
    this._selectedPath = null;
    this._selectedLayers = [];
    this._selectedOption = null;

    this._selectedDate0 = null;
    this._selectedDate1 = null;
    this._selectedPeriod = false;

    //указатель на функцию, которая будет вызываться 
    //при переключении снимков по кнопкам
    this._switchYearCallback = null;

    this.timeLine = null;
    //this._deffereds = [];

    this._selectedType = [
        NDVITimelineManager.NDVI16,
        NDVITimelineManager.RGB_HR,
        NDVITimelineManager.NDVI16,
        NDVITimelineManager.NDVI16,
        NDVITimelineManager.FIRES_POINTS,
        NDVITimelineManager.RGB753];

    //ассоциативный по годам массив в котором хранятся:
    //radio - указатель на элемент переключателя,
    //caption - просто указатель на идентификатор года
    //count - указатель на элемент идентификатор кол-ва снимков NDVI за этот год
    this._yearsPanel = [];

    //для каждого снимка по ogc_fid хранит состояние видимости на экране и дату
    //this._observedItems = [];

    //for (var i = 0; i < this._combo.length; i++) {
    //    this._observedItems[i] = [];
    //}
    //текущий год активный
    this.defaultYear = (new Date()).getFullYear();
    this._selectedYear = this.defaultYear;

    //кол-во пикселей указателя мышки до конца табло таймлыйна
    this._mouseTabloPosition;
    this._mouseTabloPosition_X;

    //имя выбранного файла, которое отображается в заголовке
    this.selectedShotFilename = "";
    this.hoverShotFilename = "";

    this.hoverDiv = null;

    //были нажаты кнопки переключения по снимкам
    this.shiftNext = false;
    this.shiftPrev = false;
    //или через слайдер
    this.shiftZero = false;

    //показывает или скрывает таймлайн
    this.switcher = null;
    this._manuallyCollapsed = false;
    this._manuallyUnfolded = false;
    this._attDiv = null;

    this._currentSelection = null;
    this.selectedDiv = null;
    this._selectedDiv = null;//Образовались два указателя, по сути они одинаковые, но где-то баг, который мешает их объединить.

    this._integralIndexes = null;

    //слой и стили которые будем раскрашивать по средним vci
    this._meanVCILayer = null;

    //выбран квиклук
    this._quicklookSelected = false;

    this._firstTimeCombo = [false, false];

    //списки проинициализированных хуков и кликов слоев
    this._layersHookList = {};
    this._layersDblClickList = {};

    this._cutOff = true;

    this.productsAvailability = {};

    this.zoomRestrictionLabel = null;
    this.meanNdviNoDataLabel = null;

    this.timelineItems = [];

    this.layerCollection = {};

    this.layerBounds = null;

    this._proxyOptions = ["F2840D287CD943C4B1122882C5B92565"];
    this._proxyLayers = {};
};

var AgroShared = {};
AgroShared._meanVCIStyleData = {};

NDVITimelineManager.NDVI_HR = 100;
NDVITimelineManager.NDVI16 = 101;
NDVITimelineManager.RGB_HR = 102;
NDVITimelineManager.RGB2_HR = 1021;
NDVITimelineManager.QUALITY16 = 103;
NDVITimelineManager.NDVI_MEAN = 104;
NDVITimelineManager.CLASSIFICATION = 105;
NDVITimelineManager.CONDITIONS_OF_VEGETATION = 106;
NDVITimelineManager.INHOMOGENUITY = 107;
NDVITimelineManager.MEAN_VCI = 108;
NDVITimelineManager.RATING = 109;
NDVITimelineManager.LANDSAT = 110;
NDVITimelineManager.RGB753 = 2000;
NDVITimelineManager.RGB432 = 2001;
NDVITimelineManager.FIRES_POINTS = 5000;

NDVITimelineManager.prodTypes = [];
NDVITimelineManager.prodTypes[NDVITimelineManager.LANDSAT] = "LANDSAT";
NDVITimelineManager.prodTypes[NDVITimelineManager.RGB753] = "RGB753";
NDVITimelineManager.prodTypes[NDVITimelineManager.RGB432] = "RGB432";

//поправка слайлера на рисочках, зависит от длинны слайдера и диапазона на таймлайне
NDVITimelineManager.SLIDER_EPSILON = 28;

//если выбранный год на таймлайне отображается больше или меньше заданного интервала
NDVITimelineManager.RANGE_CALIBRATION = -3;

NDVITimelineManager.getLayerBounds = function (layersArr) {
    var minLat = 100000000,
        minLng = 100000000,
        maxLat = -100000000,
        maxLng = -100000000;

    for (var i = 0; i < layersArr.length; i++) {
        var b = layersArr[i].getBounds();
        var ne = b.getNorthEast(),
            sw = b.getSouthWest();
        if (sw.lat < minLat) minLat = sw.lat;
        if (sw.lng < minLng) minLng = sw.lng;
        if (ne.lat > maxLat) maxLat = ne.lat;
        if (ne.lng > maxLng) maxLng = ne.lng;
    }

    return L.polygon([L.latLng(minLat, minLng), L.latLng(maxLat, minLng), L.latLng(maxLat, maxLng), L.latLng(minLat, maxLng), L.latLng(minLat, minLng)]);
};

NDVITimelineManager.prototype.repaintVisibleLayers = function (hash) {
    for (var i = 0; i < this._visibleLayersOnTheDisplayPtr.length; i++) {
        if (!$.isEmptyObject(hash)) {
            this._visibleLayersOnTheDisplayPtr[i].repaint(hash);
        }
    }
};

NDVITimelineManager.prototype.repaintAllVisibleLayers = function () {
    for (var i = 0; i < this._visibleLayersOnTheDisplayPtr.length; i++) {
        this._visibleLayersOnTheDisplayPtr[i].repaint();
    }
};

// это нужно для NDVITimelineManager._normalizeFilename
NDVITimelineManager._rkId = {
    "HR": NDVITimelineManager.NDVI_HR,
    "RGB": NDVITimelineManager.RGB_HR,
    "RGB2": NDVITimelineManager.RGB2_HR,
    "MODIS": NDVITimelineManager.QUALITY16,
    "CLASSIFICATION": NDVITimelineManager.CLASSIFICATION
};

NDVITimelineManager.prototype.setWidth = function (width, right) {
    if (this.timeLine) {
        var vis = !(this.timeLine.getContainer()[0].style.display == "none");

        var deltaWidth = (right || 20) + 100;
        //content width
        $(this.timeLine.getContainer()).attr("style", "width:" + width + "px !important");

        //frame width
        var frameWidth = width - deltaWidth;
        var t = this.timeLine.getTimelineController().getTimeline();
        $(t.dom.frame).attr("style", "width:" + frameWidth + "px !important");
        t.setSize(frameWidth, t.size.frameHeight);
        t.checkResize();

        var sliderRatio = frameWidth / this._slider.getContainer().clientWidth;
        //slider
        $("#ntSliderBar").attr("style", "width:" + frameWidth + "px !important");
        this._slider.updatePositions(sliderRatio);

        //background color    
        $(".ntTimelineBackground").attr("style", "width:" + frameWidth + "px !important");

        this.setTimeLineYear(this._selectedYear);

        $(".ntRightPanel").css("width", width - 422);

        $(".ntOptionsFieldset").css("width", $("#ntRightPanel").width());


        if (this.selectedDiv) {
            this._setSliderState(null, this._selectedDate);
        }

        if (!vis) {
            this.timeLine.toggleVisibility(false);
            $(".leaflet-iconLayers.leaflet-iconLayers_bottomleft").css("margin-bottom", 10);
        } else {
            this.timeLine.toggleVisibility(true);
            $(".leaflet-iconLayers.leaflet-iconLayers_bottomleft").css("margin-bottom", 130);
        }
    }
};

//задаю соответствия слоя из this._layersLegend и радиокнопки вручную
NDVITimelineManager._comboRadios = [{
    "MODIS_QUALITY": "qualityRadio"
}, {
    "HR": "ndviRadio_hr",
    "RGB2": "rgbRadio2",
    "CLASSIFICATION": "classificationRadio",
    "SENTINEL_NDVI": "ndviRadio_hr",
    "SENTINEL_IR": "rgbRadio"
}];

//соответсвия продукт - радиокнопка, нужно для пермалинков
//TODO: было бы хорошо сделать инициализацию панелей по этому дескриптору
NDVITimelineManager.radioProduct = {
    "rgbRadio": { "prodId": NDVITimelineManager.RGB_HR, "numCombo": 1 },
    "rgbRadio2": { "prodId": NDVITimelineManager.RGB2_HR, "numCombo": 1 },
    "ndviRadio_hr": { "prodId": NDVITimelineManager.NDVI_HR, "numCombo": 1 },
    "ndviMeanRadio": { "prodId": NDVITimelineManager.NDVI_MEAN, "numCombo": 1 },
    "inhomogenuityRadio": { "prodId": NDVITimelineManager.INHOMOGENUITY, "numCombo": 1 },
    "classificationRadio": { "prodId": NDVITimelineManager.CLASSIFICATION, "numCombo": 1 },
    "ratingRadio": { "prodId": NDVITimelineManager.RATING, "numCombo": 1 },
    "ndviRadio_modis": { "prodId": NDVITimelineManager.NDVI16, "numCombo": 0 },
    "qualityRadio": { "prodId": NDVITimelineManager.QUALITY16, "numCombo": 0 },
    "conditionsOfVegetationRadio": { "prodId": NDVITimelineManager.CONDITIONS_OF_VEGETATION, "numCombo": 0 },

    "rgbRadio753": { "prodId": NDVITimelineManager.RGB753, "numCombo": 4 },
    "rgbRadio432": { "prodId": NDVITimelineManager.RGB432, "numCombo": 4 },

    "firesPoints": { "prodId": NDVITimelineManager.FIRES_POINTS, "numCombo": 3 }
};

NDVITimelineManager.MIN_ZOOM = 7;
NDVITimelineManager.MIN_ZOOM_HR = 11;

NDVITimelineManager.minZoomOption = {};
NDVITimelineManager.minZoomOption[NDVITimelineManager.NDVI_HR] = NDVITimelineManager.MIN_ZOOM_HR;
NDVITimelineManager.minZoomOption[NDVITimelineManager.NDVI16] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.RGB_HR] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.LANDSAT] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.RGB2_HR] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.QUALITY16] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.NDVI_MEAN] = NDVITimelineManager.MIN_ZOOM_HR;
NDVITimelineManager.minZoomOption[NDVITimelineManager.CLASSIFICATION] = NDVITimelineManager.MIN_ZOOM_HR;
NDVITimelineManager.minZoomOption[NDVITimelineManager.RATING] = NDVITimelineManager.MIN_ZOOM_HR;
NDVITimelineManager.minZoomOption[NDVITimelineManager.CONDITIONS_OF_VEGETATION] = 0;
NDVITimelineManager.minZoomOption[NDVITimelineManager.INHOMOGENUITY] = NDVITimelineManager.MIN_ZOOM_HR;
NDVITimelineManager.minZoomOption[NDVITimelineManager.MEAN_VCI] = NDVITimelineManager.MIN_ZOOM_HR;
NDVITimelineManager.minZoomOption[NDVITimelineManager.RGB753] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.RGB432] = NDVITimelineManager.MIN_ZOOM + 1;
NDVITimelineManager.minZoomOption[NDVITimelineManager.FIRES_POINTS] = NDVITimelineManager.MIN_ZOOM + 1;

NDVITimelineManager.prototype.getMinZoomCurrentSelection = function (prod) {
    return NDVITimelineManager.minZoomOption[prod];
};

NDVITimelineManager.prototype.applyMinZoomCurrentSelection = function (prod) {
    var minZoom = ndviTimelineManager.getMinZoomCurrentSelection(prod);
    if (this.lmap.getZoom() < minZoom) {
        this.lmap.setZoom(minZoom);
        return true;
    }
    return false;
};

NDVITimelineManager.ATTENTION_DIV = '<div id="ntFilenameText">Приблизьте карту для загрузки данных на таймлайн</div>';
NDVITimelineManager.MEANNDVI_NODATA_ERROR = 'Нет данных по выбранному продукту';

NDVITimelineManager.addDays = function (date, days) {
    var result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
};

NDVITimelineManager.prototype.start = function () {

    //Не загружаем таймлайн если карта по пермалинку имеет такой параметр
    //if (window.exportMode) {
    //    return;
    //}

    this.listenForPeramlink();

    var that = this;
    this.showLoading();

    var p = L.gmx.loadMap(this._exMap.name);

    p.then(function (h) {

        var cr = h.layersByID["04DDB23F49F84B9A9122CBA6BC26D3ED"];
        var styles = cr.getStyles();
        styles.forEach(function (it) {
            it.HoverStyle = it.RenderStyle;
        });
        cr.setStyles(styles);

        //var layersTool = new LayersTool("Адм.границы", [h.layersByID["3BCCB0F1ACFB4A56BAC87ECA31ADA199"], h.layersByID["035A32EDA95D4D2BBBF6E44AF3FA21DD"]]);

        for (var i in h.layersByID) {
            if (nsGmx && nsGmx.widgets && nsGmx.widgets.commonCalendar) {
                nsGmx.widgets.commonCalendar.unbindLayer(i);
            }
            that.layerCollection[i] = h.layersByID[i];
        }

        that._main();
    });

};

NDVITimelineManager.prototype.listenForPeramlink = function () {
    var that = this;
    this._activatePermalink = null;
    window._mapHelper && _mapHelper.customParamsManager.addProvider({
        name: "AgroNDVITimelineProvider",
        saveState: function () {

            var optionsMenu = {};
            $(".ntOptionsMenu").find("input[type='checkbox']").each(function (e, v) {
                optionsMenu[v.id] = v.checked;
            });

            var rad = $('input[name=shotsOptions_' + that._selectedCombo + ']').filter(':checked');
            var radioId = null;
            if (rad.length) {
                radioId = rad[0].id;
            }

            var selectedDate0, selectedDate1;
            if (that._selectedDate0 && that._selectedDate1) {
                selectedDate0 = {
                    "d": that._selectedDate0.getDate(), "m": that._selectedDate0.getMonth() + 1,
                    "y": that._selectedDate1.getFullYear(), "dxdw": that._slider.getOffsetLeft0() / that._slider.getContainer().clientWidth
                }
                selectedDate1 = {
                    "d": that._selectedDate1.getDate(), "m": that._selectedDate1.getMonth() + 1,
                    "y": that._selectedDate0.getFullYear(), "dxdw": that._slider.getOffsetLeft1() / that._slider.getContainer().clientWidth
                }
            }
            var selectedDate = null;
            if (that._selectedDate) {
                selectedDate = { "d": that._selectedDate.getDate(), "m": that._selectedDate.getMonth() + 1, "y": that._selectedDate.getFullYear() }
            }
            return {
                "selectedYear": that._selectedYear,
                "selectedDate": selectedDate,
                "selectedDate0": selectedDate0,
                "selectedDate1": selectedDate1,
                "selectedDiv": (that.selectedDiv ? true : false),
                "selectedCombo": that._selectedCombo,
                "radioId": radioId,
                "chkQl": document.getElementById("chkQl").checked,
                "optionsMenu": optionsMenu
            };
        },
        loadState: function (data) {
            that.loadState(data);
        }
    });
};

NDVITimelineManager.prototype.loadState = function (data) {
    var that = this;

    function restoreOptionsMenu() {
        if (data.optionsMenu) {
            for (var i in data.optionsMenu) {
                document.getElementById(i).checked = data.optionsMenu[i];
            }
        }

        if (document.getElementById("chkCut") &&
            !document.getElementById("chkCut").checked) {
            that.setCutOff(document.getElementById("chkCut"));
        }

        if (document.getElementById("cloudMask").checked) {
            that._useCloudMask = true;
        }

        if (data.chkQl) {
            that.qlCheckClick(document.getElementById("chkQl"));
        }

        data.optionsMenu = null;
    };

    //эти параметры применяются до того как произойдет инициализация таймлайна
    that._selectedCombo = data.selectedCombo;
    that._selectedYear = data.selectedYear;
    that._selectedPeriod = false;
    if (data.selectedDate0 && data.selectedDate1) {
        that._selectedPeriod = true;
    }

    if (that._selectedPeriod) {
        that._selectedDate0 = new Date(data.selectedDate0.y, data.selectedDate0.m - 1, data.selectedDate0.d);
        that._selectedDate1 = new Date(data.selectedDate1.y, data.selectedDate1.m - 1, data.selectedDate1.d);
    }

    //по умолчанию ничего не выбрано
    that._activatePermalink = function () {
        restoreOptionsMenu();
        if (that._combo[data.selectedCombo].rk[0] == "FIRES") {
            document.getElementById("ntPeriodSelectOption").style.display = "block";
            $(".ntOptionsHR").css("display", "none");
            $(".ntOptionsMODIS").css("display", "none");
        }
    }

    //этот пермалинк активируется для периода, который доступен только для пожаров.
    if (data.selectedDate0 && data.selectedDate1) {
        that._activatePermalink = function () {
            restoreOptionsMenu();
            that._slider.setPeriodSelector(true);
            document.getElementById("ntPeriodSelectOption").style.display = "block";
            $(".ntOptionsHR").css("display", "none");
            $(".ntOptionsMODIS").css("display", "none");
            $(".ntYearSwitcher").css("display", "none");
            document.getElementById("setDoubleSlide").checked = true;

            that._slider.setActivePointer(1);
            that._slider.setValue(Math.round(data.selectedDate1.dxdw * that._slider.getContainer().clientWidth));

            that._slider.setActivePointer(0);
            that._slider.setValue(Math.round(data.selectedDate0.dxdw * that._slider.getContainer().clientWidth));

            that._slider.setCaption0(data.selectedDate0.d + "." + data.selectedDate0.m + "." + data.selectedDate0.y);
            that._slider.setCaption1(data.selectedDate1.d + "." + data.selectedDate1.m + "." + data.selectedDate1.y);

            that.refreshSliderPeriod();
        }
    }

    //выбрана одна риска
    if (data.selectedDate && data.selectedDiv) {
        that._selectedDate = new Date(data.selectedDate.y, data.selectedDate.m - 1, data.selectedDate.d);
        //...а эти после
        //отложенный вызов активации по пермалику, после загрузки снимков на таймлайн
        that._activatePermalink = function () {

            restoreOptionsMenu();

            if (that._combo[data.selectedCombo].rk[0] == "FIRES") {
                document.getElementById("ntPeriodSelectOption").style.display = "block";
                $(".ntOptionsHR").css("display", "none");
                $(".ntOptionsMODIS").css("display", "none");
            }

            if (data.radioId) {
                that.setActiveRadio(data.radioId);
            }

            var tl = this.timeLine.getTimelineController().getTimeline();
            var currItem = null;
            for (var i = 0; i < tl.items.length; i++) {
                var item = tl.items[i];
                var itemDate = new Date(item.center);

                if (itemDate.getDate() == that._selectedDate.getDate() &&
                itemDate.getFullYear() == that._selectedDate.getFullYear() &&
                itemDate.getMonth() == that._selectedDate.getMonth()) {
                    currItem = item;
                    break;
                }
            }

            if (currItem) {
                that.setTimeLineYear(that._selectedYear);
                if (data.chkQl) {
                    document.getElementById("chkQl").checked = true;
                    that.qlCheckClick(document.getElementById("chkQl"), data);
                } else {
                    tl.setSelection([{ "row": tl.getItemIndex(currItem.dom) }]);
                    that.timeLine.shiftActiveItem(0);
                    that.setTimeLineYear(that._selectedYear);
                }
            }
        };
    }
}

NDVITimelineManager.prototype.refreshOptionsDisplay = function () {
    var rkName = this._combo[this._selectedCombo].rk[0];
    if (rkName == "FIRES") {
        document.getElementById("ntPeriodSelectOption").style.display = "block";
        $(".ntOptionsHR").css("display", "none");
        $(".ntOptionsMODIS").css("display", "none");
    } else if (rkName == "MODIS") {
        $(".ntOptionsMODIS").css("display", "block");
        document.getElementById("ntPeriodSelectOption").style.display = "none";
        $(".ntOptionsHR").css("display", "none");
    } if (rkName == "HR") {
        $(".ntOptionsHR").css("display", "block");
        document.getElementById("ntPeriodSelectOption").style.display = "none";
        $(".ntOptionsMODIS").css("display", "none");
    } if (rkName == "LANDSAT" || rkName == "SENTINEL") {
        $(".ntOptionsHR").css("display", "none");
        $(".ntOptionsMODIS").css("display", "none");
        $("#chkQl").parent().parent().css("display", "block");
    }
};

/** Эта функция нужна для подгона периода таймлайна при изменении его размеров. */
NDVITimelineManager.getEpsilon = function (x) {
    return 176.657 - 0.352079 * x + 0.000235975 * x * x - 5.434100986316832 * Math.pow(10, -8) * x * x * x;
};

NDVITimelineManager.prototype.setTimeLineYear = function (year) {
    this.timeLine.setVisibleRange(new Date(year, 0, 2),
        new Date(year + 1, 1, NDVITimelineManager.getEpsilon(document.getElementById("ntSliderBar").clientWidth)));
    document.getElementById("ntYear").innerHTML = year;
};

NDVITimelineManager.prototype._main = function () {

    //сохраняем слои карты в общую коллекцию
    if (nsGmx && nsGmx.gmxMap) {
        for (var i in nsGmx.gmxMap.layersByID) {
            this.layerCollection[i] = nsGmx.gmxMap.layersByID[i];
        }
    } else if (window.cosmosagro && cosmosagro.layersHash) {
        //для проекта без редактора
        for (var i in cosmosagro.layersHash) {
            this.layerCollection[i] = cosmosagro.layersHash[i];
        }
    } else if (cm) {
        var layersHash = cm.get('layersHash');
        for (var i in layersHash) {
            this.layerCollection[i] = layersHash[i];
        }
    }

    if (this._timelineVisibilityLayerID) {
        var that = this;
        this._timelineVisibilityLayer = that.layerCollection[this._timelineVisibilityLayerID];

        var that = this;
        this._timelineVisibilityLayer.on("add", function () {
            //$(".ntAttentionMessage").css("display", "block");
            that.switcher._element.style.display = "block";
            that.applyZoomRestriction(that.lmap.getZoom());
            that.resize();
            that.switcher.show();
        });

        this._timelineVisibilityLayer.on("remove", function () {
            that.switcher.hide();
            that.applyZoomRestriction(that.lmap.getZoom());
            that.resize();
            $(".ntAttentionMessage").css("display", "none");
            that.switcher._element.style.display = "none";
        });
    }

    this.hideLoading();

    if (!nsGmx.TimelineControl) {
        showErrorMessage("Для работы плагина NDVITimelinePlugin необходимо подключить плагин Timeline Rasters.");
        return;
    }

    this._initSwitcher();
    this.initializeTimeline(true);
    this.applyZoomHandler();

    //Слой на экране п промежутке, для таймлайна.
    this.layerCollection[this._layersLegend.RGB.name].setDateInterval(new Date(2000, 1, 1), new Date());

    //вначале выключаем выбор тематики по средним ndvi
    this.setRadioLabelActive("ndviMeanRadio", false);
    this.setRadioLabelActive("ratingRadio", false);

    //красная надпись при свернутом таймлайне
    this._attDiv = document.createElement('div');
    this._attDiv.style.display = "none";
    this._attDiv.classList.add("ntAttentionMessage");
    this._attDiv.innerHTML = NDVITimelineManager.ATTENTION_DIV;
    this._container.appendChild(this._attDiv);


    //баг не показываются деления при деволтном зумирвоании на хоз-ве
    setTimeout(function () { that.onMoveEnd(); }, 3000);

    //деактивация некоторых радиокнопок
    this.deactivateUnknownRadios();

    this._meanVCILayer = this.layerCollection["58B949C8E8454CF297184034DD8A62CD"];

    this._meanVCILayer.setZIndex(-1);
    AgroShared._meanVCIStyleData = {};
    var that = this;
    setTimeout(function () {
        var regionId = that._meanVCILayer._gmx.tileAttributeIndexes["Region"];
        var districtId = that._meanVCILayer._gmx.tileAttributeIndexes["District"];
        that._meanVCILayer.setStyleHook(function (data) {
            var nameId = data.properties[regionId] + ":" + data.properties[districtId];
            var s = AgroShared._meanVCIStyleData[nameId];
            if (s) {
                return s;
            } else {
                return null;
            }
        });
    }, 0);

    this.initializeLayersHooks();
    this._initLayersTreeDoubleClick();

    //инициализация слоев из внешних карт
    $(window._queryExternalMaps).bind('map_loaded', function (e) {
        for (var i in nsGmx.gmxMap.layersByID) {
            if (!that.layerCollection[i]) {
                that.layerCollection[i] = nsGmx.gmxMap.layersByID[i];
            }
        }
        that.initializeLayersHooks();
    });

    //проверяем ff
    if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
        $(".ntTimelineBackground").css("height", "22px");
    }

    //выключим
    this.setRadioLabelActive_grey("rgbRadio", false);
    this.setRadioLabelActive_grey("ndviRadio_modis", false);

    document.getElementById("ntComboBox").disabled = true;
    document.getElementById("ntComboBox").classList.add("ntDisabledLabel");

    document.getElementById('ntComboBox').value = this._selectedCombo.toString();

    $(window).resize(function () {
        that.resize();
    });

    this.resize();

    var m = this.optionsMenu.getMenuContainer();

    m.style.right = 60 + "px";

    $('#leftCollapser').on("click", function (e) {
        $(".leaflet-iconLayers.leaflet-iconLayers_bottomleft").css("margin-bottom", 125);
        that.resize();
    });

    this.applyZoomRestriction(this.lmap.getZoom());

    this.startFinishLoading();

    this.refreshOptionsDisplay();

    if (this._timelineVisibilityLayerID && !this._timelineVisibilityLayer._map) {
        that.switcher.hide();
        that.applyZoomRestriction(that.lmap.getZoom());
        $(".ntAttentionMessage").css("display", "none");
        that.switcher._element.style.display = "none";
        that.resize();
    } else {
        that.applyZoomRestriction(that.lmap.getZoom());
    }

    if (window.exportMode) {
        $(".leaflet-bottom.leaflet-right").css('display', 'none');
        $(".ntAttentionMessage").css('display', 'none');
        $(".switcherControl").css('display', 'none');

        var t = this.timeLine.getTimelineController().getTimeline();
        t.options.showCurrentTime = false;
        t.setAutoScale(false);
        t.options.showCurrentTime = false;
    }
};

NDVITimelineManager.prototype.resize = function () {
    if (window.layersShown && !(navigator.userAgent.match(/iPad/i) != null)) {
        this.setWidth(document.documentElement.clientWidth - 360);
    } else {
        this.setWidth(document.documentElement.clientWidth - 12);
    }
};

NDVITimelineManager.prototype._initSwitcher = function () {
    var that = this;
    this.switcher = new SwitchControl({
        "parentId": this._container.id,
        "onshow": function (manually) {
            if (that.lmap.getZoom() <= NDVITimelineManager.MIN_ZOOM) {
                document.getElementById("ntLoading").style.display = "none";
                that._attDiv.style.bottom = "147px";
                that._attDiv.style.right = "310px";
                //that.optHelper.style.display = "none";
                $(".ntHelp").removeClass("ntHelpLightOn");
                document.getElementById("ntZoomRestrictionLabel").style.display = "none";
            } else {
                that._attDiv.style.display = "none";
            }

            if (manually) {
                that._manuallyCollapsed = false;
                that._manuallyUnfolded = true;
            }

            that.timeLine.toggleVisibility(true);

            setTimeout(function () {
                NDVITimelineManager.fires_ht = {};
                that.timeLine.updateFilters();
                window.resizeAll && resizeAll();
            }, 200);

            $(".leaflet-iconLayers.leaflet-iconLayers_bottomleft").css("margin-bottom", 135);

            window.resizeAll && resizeAll();
        },
        "onhide": function (manually) {
            that._attDiv.style.bottom = "34px";
            that._attDiv.style.right = "350px";

            if (manually) {
                that._manuallyCollapsed = true;
                that._manuallyUnfolded = false;
            }

            //that.applyZoomRestriction(that.lmap.getZoom());

            if (that.lmap.getZoom() <= NDVITimelineManager.MIN_ZOOM) {
                that._attDiv.style.display = "block";
            }

            that.timeLine.toggleVisibility(false);

            $(".leaflet-iconLayers.leaflet-iconLayers_bottomleft").css("margin-bottom", 10);

            window.resizeAll && resizeAll();
        }
    });
};

NDVITimelineManager.prototype.setCloudMaskRenderHook = function (layer, callback, callback2) {

    layer.addRenderHook(callback);

    for (var i = 0; i < this._visibleLayersOnTheDisplayPtr.length; i++) {

        var l = this._visibleLayersOnTheDisplayPtr[i];

        var styles = l.getStyles();
        styles[0].HoverStyle.weight = styles[0].RenderStyle.weight;
        l.setStyles(styles);

        this._visibleLayersOnTheDisplayPtr[i].addPreRenderHook(callback2);
    }
};

NDVITimelineManager.prototype.setRenderHook = function (layer, callback, callback2) {

    if (this._selectedOption == "CLASSIFICATION" || this._selectedOption == "HR") {
        this.layerBounds && layer.removeClipPolygon(this.layerBounds);
    }

    if (this._cutOff) {

        if (this._selectedOption == "CLASSIFICATION" || this._selectedOption == "HR") {
            this.layerBounds = NDVITimelineManager.getLayerBounds(this._visibleLayersOnTheDisplayPtr);
            layer.addClipPolygon(this.layerBounds);
        }

        layer.addRenderHook(callback);

        for (var i = 0; i < this._visibleLayersOnTheDisplayPtr.length; i++) {

            var l = this._visibleLayersOnTheDisplayPtr[i];

            var styles = l.getStyles();
            styles[0].HoverStyle.weight = styles[0].RenderStyle.weight;
            l.setStyles(styles);

            this._visibleLayersOnTheDisplayPtr[i].addPreRenderHook(callback2);
        }
    }
};

NDVITimelineManager.prototype.clearRenderHook = function () {
    var ndviLayer = this.layerCollection[this._layersLegend.HR.name];
    var classLayer = this.layerCollection[this._layersLegend.CLASSIFICATION.name];
    var sentinelNdviLayer = this.layerCollection[this._layersLegend.SENTINEL_NDVI.name];

    ndviLayer.removeRenderHook(NDVITimelineManager.kr_hook);
    classLayer && classLayer.removeRenderHook(NDVITimelineManager.kr_hook);
    sentinelNdviLayer.removeRenderHook(NDVITimelineManager.kr_hook);

    NDVITimelineManager.tolesBG = {};

    for (var i = 0 ; i < this._visibleLayersOnTheDisplayPtr.length; i++) {
        this._visibleLayersOnTheDisplayPtr[i].removePreRenderHook(NDVITimelineManager.l_hook);
    }

    this.redrawSelectedLayers();
};

NDVITimelineManager.prototype.redrawSelectedLayers = function () {
    for (var i = 0; i < this._selectedLayers.length; i++) {
        this._selectedLayers[i].redraw();
    }
};

NDVITimelineManager.prototype.initializeLayersHooks = function () {
    var hozLayers = this.getHozLayers();
    for (var i = 0; i < hozLayers.length; i++) {
        this._setStyleHook(hozLayers[i]);
        this._setVisibilityChangingHook(hozLayers[i]);
    }
};

NDVITimelineManager.prototype._setVisibilityChangingHook = function (layer) {
    var that = this;

    layer.on("add", function () {
        that.refreshVisibleLayersOnDisplay();
    });

    layer.on("remove", function () {
        setTimeout(function () {
            that.refreshVisibleLayersOnDisplay();
        }, 100);
    });

};

NDVITimelineManager.prototype.getHozLayers = function () {
    var fieldLayers = [];
    var that = this;
    var layers = this.layerCollection;
    $.each(layers, function (i, l) {
        var v = l.getGmxProperties();
        if (!that._layersHookList[v.name]) {
            if (!($.isEmptyObject(v.MetaProperties)))
                if (!($.isEmptyObject(v.MetaProperties.product)))
                    if ($.trim(v.MetaProperties.product.Value) == "fields" || $.trim(v.MetaProperties.product.Value) == "fields_aggregation")
                        if (!($.isEmptyObject(v.MetaProperties.project)) && ($.trim(v.MetaProperties.project.Value) == "InsuranceGeo" ||
                            $.trim(v.MetaProperties.project.Value) == "cosmosagro")) {
                            that._layersHookList[v.name] = layers[v.name];
                            fieldLayers.push(layers[v.name]);
                        }
        }
    });
    return fieldLayers;
};

NDVITimelineManager.prototype._initLayersTreeDoubleClick = function () {
    if (window._layersTree) {
        var that = this;
        _layersTree.treeModel.forEachNode(function (node) {
            if (node.type === "layer") {
                if (!that._layersDblClickList[node.content.properties.name]) {
                    //var prop = gmxAPI.map.layers[node.content.properties.name].properties;
                    var prop = that.layerCollection[node.content.properties.name].getGmxProperties();
                    if (prop.type === "Vector" &&
                        prop.GeometryType === "polygon" &&
                        !prop.GMX_RasterCatalogID) {
                        that._layersDblClickList[node.content.properties.name] = that.layerCollection[node.content.properties.name];//gmxAPI.map.layers[node.content.properties.name];
                        $(node).on('dblclick', function () {
                            that._onLayerTreeDoubleClick(node.content.properties);
                        })
                    }
                }
            }
        });
    }
};

NDVITimelineManager.prototype._onLayerTreeDoubleClick = function (prop) {
    for (var i in this._visibleFieldsLayers) {
        this._visibleFieldsLayers[i].visible = false;
    }
    var layer = this.layerCollection[prop.name];
    var bounds = layer.getBounds();
    if (!this._visibleFieldsLayers[prop.name]) {
        this._visibleFieldsLayers[prop.name] = { "visible": false, "bounds": bounds, "layer": layer };
    }

    this.setVisibleYear(this._selectedYear);

    if (this._combo[this._selectedCombo].resolution == "landsat") {
        this._visibleFieldsLayers[prop.name].visible = true;
        this._doubleClick = true;
    }

    this.hoverDiv = null;
    this.hoverShotFilename = this.selectedShotFilename = "";
    this.setFilenameCaption("");

    this.switcher.show();

    var that = this;
    setTimeout(function () {
        that.resize();
    }, 20);
};

NDVITimelineManager.prototype.initializeIntegralScheme = function () {
    this._integralIndexes = new IntegralIndexes();
};

NDVITimelineManager.prototype.setVisibleYear = function (year) {

    function _normalTime(date) {
        return new Date("2000", date.getMonth(), date.getDate()).getTime();
    };

    this.setTimeLineYear(year);
    this._selectedYear = year;

    if (this._combo[this._selectedCombo].resolution == "modis" && this.selectedDiv) {
        var start = new Date(year, 0, 1);
        var end = new Date(year + 1, 1, 9);
        var tl = this.timeLine.getTimelineController().getTimeline();
        var currIndex = tl.getItemIndex(this.selectedDiv);
        var curr2000 = _normalTime(tl.items[currIndex].start);

        var minItem = null;
        var minDeltaTime = 100000000000;
        //выбираем items выбранного года и ближайщее расстояние от текущего выбранного
        for (var i = 0; i < tl.items.length; i++) {
            var item = tl.items[i];
            var itemDate = new Date(item.center);
            if (item.dom && itemDate >= start && itemDate <= end) {
                var idt = _normalTime(itemDate);
                var d = Math.abs(curr2000 - idt);
                if (d < minDeltaTime) {
                    minDeltaTime = d;
                    minItem = item;
                }
            }
        }

        tl.setSelection([{ "row": tl.getItemIndex(minItem.dom) }]);
        this.timeLine.shiftActiveItem(0);
        this.setTimeLineYear(year);

    }
    document.getElementById('ntYear').innerHTML = year;

    for (var l in this._proxyLayers) {
        this._proxyLayers[l].setDateInterval(new Date(this._selectedYear, 0, 1), new Date(this._selectedYear, 11, 31));
    }

    this.timeLine.updateFilters();
};

NDVITimelineManager.prototype.switchYear = function (year) {
    var ry = this._yearsPanel[year]
    if (ry) {
        ry.radio.checked = true;
    }
    this.setVisibleYear(year);
};

NDVITimelineManager.prototype._setStyleHook = function (layer) {
    var that = this;
    //var b = layer.getBoundsMerc();
    //var bounds = new gmxAPI.bounds([[gmxAPI.from_merc_x(b.minX), gmxAPI.from_merc_y(b.minY)], [gmxAPI.from_merc_x(b.maxX), gmxAPI.from_merc_y(b.maxY)]]);

    var bounds = layer.getBounds();

    this._visibleFieldsLayers[layer._gmx.layerID] = { "bounds": bounds, "visible": false, "layer": layer };
};

NDVITimelineManager.prototype.startFinishLoading = function () {
    var that = this;
    var intervalHandler = null;

    var success = function () {
        if ($(".timeline-event.timeline-event-line").length) {
            NDVITimelineManager.fires_ht = {};
            that.timeLine.updateFilters();
            that.hideLoadingSmall();
            document.getElementById("ntComboBox").disabled = false;
            document.getElementById("ntComboBox").classList.remove("ntDisabledLabel");

            if (that._activatePermalink) {
                setTimeout(function () {
                    that._activatePermalink();
                    that._activatePermalink = null;
                    that.refreshOptionsDisplay();
                }, 2000);
            }

            that._firstTimeCombo[that._selectedCombo] = true;

            clearInterval(intervalHandler);
        }
    };

    intervalHandler = setInterval(success, 500);
};

/*
 * ==================================================================
 * Блок панелей, и жесткая логика управления видимостью снимками
 * ==================================================================
 */

NDVITimelineManager.prototype.shadeTimeline = function () {
    $(".shadeTimeline").css("display", "block");
    $(".ntRightPanel").addClass("shadeBackground");
    $(".ntLblCombo").addClass("shadeBackground").addClass("shadeColor");
    $(".ntLblShotsType").addClass("shadeColor");
    $(".ntLblDataType").addClass("shadeColor");
    $(".layerInfoButton").addClass("shadeColor");
    $(".ntTimelineColor").addClass("shadeBackground").addClass("shadeColor");
    $(".timeline-container").addClass("shadeBackground");
    $(".timeline-axis-text-minor").addClass("shadeColor");
    $("#ntYear").addClass("shadeColor");
    $("#ntComboBox").addClass("shadeColor");
    $(".ntSliderCaption").addClass("shadeColor");
};

NDVITimelineManager.prototype.removeShading = function () {
    $(".shadeTimeline").css("display", "none");
    $(".ntRightPanel").removeClass("shadeBackground");
    $(".ntLblCombo").removeClass("shadeBackground").removeClass("shadeColor");
    $(".ntLblShotsType").removeClass("shadeColor");
    $(".ntLblDataType").removeClass("shadeColor");
    $(".layerInfoButton").removeClass("shadeColor");
    $(".ntTimelineColor").removeClass("shadeBackground").removeClass("shadeColor");
    $(".timeline-container").removeClass("shadeBackground");
    $(".timeline-axis-text-minor").removeClass("shadeColor");
    $("#ntYear").removeClass("shadeColor");
    $("#ntComboBox").removeClass("shadeColor");
    $(".ntSliderCaption").removeClass("shadeColor");
};

NDVITimelineManager.prototype.createOptionsPanel = function () {

    var fsComboOptions = document.getElementById("fsComboOptions");

    var html = "";
    for (var i = 0; i < this._combo.length; i++) {
        html += '<div id="optionsPanel_' + i + '" style="height:100%; display:none; white-space: nowrap;">' +
                    '<div id="firstPanel_' + i + '" class="comboOptionsPanel"></div>' +
                    '<div id="secondPanel_' + i + '" class="comboOptionsPanel"></div>' +
                    '<div id="thirdPanel_' + i + '" class="comboOptionsPanel"></div>' +
                    '</div>';

    }
    fsComboOptions.innerHTML += html;
};


NDVITimelineManager._legendCallback = {};
NDVITimelineManager._legendCallback["qualityRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendQuality);
};

NDVITimelineManager._legendCallback["classificationRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendClassification);
};

NDVITimelineManager._legendCallback["ndviRadio_modis"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendNdvi);
};

NDVITimelineManager._legendCallback["ndviRadio_hr"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendNdvi);
};

NDVITimelineManager._legendCallback["ratingRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendRating);
};

NDVITimelineManager._legendCallback["ndviMeanRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendNdvi);
};

NDVITimelineManager._legendCallback["conditionsOfVegetationRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendConditionsOfVegetation);
};

NDVITimelineManager._legendCallback["inhomogenuityRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendInhomogenuity);
};

NDVITimelineManager._legendCallback["meanVCIRadio"] = function () {
    AgroLegend.toggleLegend(AgroLegend.legendConditionsOfVegetation);
};

/**
 * text - текст радио кнопки
 * tag - название группы
 * id - идентификатор dom
 * comboIndex - индекс вклченного комбо при котором этот элемент активен(-1 - активен для всех)
 * comboVisibility - флаг того, что элемент для этого комбо будет отображаться или нет.
 * callback - событие припереключении
 * checkrd - значение по умолчанию
 */
NDVITimelineManager.prototype.addRadio = function (elementId, text, tag, id, comboIndex, comboVisibility, callback, light, checked) {

    var element = document.getElementById(elementId);
    var div0 = document.createElement('div');
    div0.style.marginBottom = "4px";
    div0.style.marginLeft = "4px";
    div0.style.float = "left";
    div0.displayCombo = comboVisibility;
    element.appendChild(div0);

    var div;
    if (light) {
        div = document.createElement('div');
        div0.classList.add("ntHelp");
        div0.id = "light_" + id;
        div0.appendChild(div);
    } else {
        div = div0;
        div0.style.marginTop = "3px";
        div0.style.marginRight = "8px";
        div0.style.marginLeft = "7px";
    }


    var overDiv1 = document.createElement('div');
    overDiv1.style.float = "left";
    var input = document.createElement('input');
    overDiv1.appendChild(input);
    div.appendChild(overDiv1);
    input["comboIndex"] = comboIndex;
    input.style.height = "18px";
    input.type = "radio";
    input.name = tag + "_" + comboIndex;
    input.id = id;
    input.checked = checked;
    var that = this;
    input.onchange = function () {
        callback.call(that, this);
    };

    var overDiv2 = document.createElement('div');
    overDiv2.style.float = "left";
    overDiv2.style.paddingLeft = "5px";

    var label = document.createElement('label');
    overDiv2.appendChild(label);
    div.appendChild(overDiv2);

    label.innerHTML = text;
    label.for = id;
    label["comboIndex"] = comboIndex;
    label.classList.add("ntLblShotsType");
    label.classList.add(id);

    label.onclick = function (e) {
        if (!(input.disabled || input.checked)) {
            input.checked = true;
            callback.call(that, input);
        }
    };

    label.ontouchstart = function (e) {
        if (!(input.disabled || input.checked)) {
            input.checked = true;
            callback.call(that, input);
        }
    };

    if (NDVITimelineManager._legendCallback[id]) {
        var btnLegend = document.createElement('span');
        div.appendChild(btnLegend);
        btnLegend.classList.add("layerInfoButton");
        btnLegend.style.color = "blue";
        btnLegend.style.fontWeight = "normal";
        btnLegend.style.fontFamily = "serif";
        btnLegend.onclick = NDVITimelineManager._legendCallback[id];
        btnLegend.ontouchstart = NDVITimelineManager._legendCallback[id];
        btnLegend.title = "Легенда";
        btnLegend.innerHTML = "i";
    }

    this._radioButtonLabels[id] = { "label": label, "parent": div };
};

NDVITimelineManager.prototype.setVisible = function (visibility) {
    for (var i in this._layersLegend) {
        gmxAPI.map.layers[this._layersLegend[i].name].setVisible(visibility);
    }
};

NDVITimelineManager.prototype.removeLayer = function (layerName) {
    this.layerCollection[layerName] && this.lmap.removeLayer(this.layerCollection[layerName]);
};

NDVITimelineManager.prototype.addLayer = function (layerName) {
    this.layerCollection[layerName] && this.lmap.addLayer(this.layerCollection[layerName]);
};

NDVITimelineManager.prototype.hideSelectedLayer = function () {
    this._selectedPeriod && $(".timeline-event").removeClass("timeline-event-selected");
    for (var i = 0; i < this._selectedLayers.length; i++) {
        this.lmap.removeLayer(this._selectedLayers[i]);
        this._selectedLayers[i].removeFilter();
    }
    this._selectedLayers = [];
    this._selectedOption = null;
};

NDVITimelineManager.prototype._hideLayers = function () {
    this.hideSelectedLayer();

    this._hideNDVI_MEAN();
    this._hideINHOMOGENUITY();
    this._hideSLOPE();

    this._ratingHandler.clear();
    if (window.fieldsTable2) {
        fieldsTable2.redraw();
    }

    this._meanVCILayer && this.lmap.removeLayer(this._meanVCILayer);

    this.clearRenderHook();

    this.hideCloudMask(true);
};

NDVITimelineManager.prototype._prepareRedraw = function () {

    //выключаем все слои
    this._hideLayers();
};

NDVITimelineManager.prototype._showRedraw = function () {

    if (this._selectedDiv) {
        if (this._selectedType[this._selectedCombo] == NDVITimelineManager.RATING) {
            this._showRATING();
        } else if (this._isQuicklook) {
            this._showQUICKLOOK();
        } else if (this.isSentinel) {
            this._showSENTINEL();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.NDVI16) {
            this._showNDVI16();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.NDVI_HR) {
            this._showNDVI_HR();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.RGB_HR) {
            this._showRGB_HR();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.RGB2_HR) {
            this._showRGB2_HR();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.QUALITY16) {
            this._showQUALITY16();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.NDVI_MEAN) {
            this._showNDVI_MEAN();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.INHOMOGENUITY) {
            this._showINHOMOGENUITY();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.CLASSIFICATION) {
            this._showCLASSIFICATION();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.CONDITIONS_OF_VEGETATION) {
            this._showCONDITIONS_OF_VEGETATION();
        } else if (this._selectedType[this._selectedCombo] == NDVITimelineManager.FIRES_POINTS) {
            this._showFIRES_POINTS();
        } else {
            this._showLayer(NDVITimelineManager.prodTypes[this._selectedType[this._selectedCombo]]);
        }
    }
};

NDVITimelineManager.prototype._redrawShots = function () {
    this._prepareRedraw();
    this._showRedraw();

    //эти продукты активны всегда
    if (!this.isSentinel)
        this.setRadioLabelActive_grey("rgbRadio", true);
    this.setRadioLabelActive_grey("ndviRadio_modis", true);
    this.setRadioLabelActive_grey("conditionsOfVegetationRadio", true);
};

NDVITimelineManager._makeSqlFilenames = function (filenames, type) {
    var res = "";

    if (type == NDVITimelineManager.NDVI_HR) {
        for (var i = 0; i < filenames.length; i++) {
            res += (res ? ' OR ' : '') + '"sceneid"=' + "'" + filenames[i].substring(0, filenames[i].length - 5) + "'";
        }
    } else if (type == NDVITimelineManager.RGB_HR) {
        for (var i = 0; i < filenames.length; i++) {
            res += (res ? ' OR ' : '') + '"SCENEID"=' + "'" + filenames[i].substring(0, filenames[i].length - 5) + "'";
        }
    } else if (type == NDVITimelineManager.RGB2_HR) {
        for (var i = 0; i < filenames.length; i++) {
            res += (res ? ' OR ' : '') + '"SCENEID"=' + "'" + filenames[i].substring(0, filenames[i].length - 5) + "'";
        }
    } else if (type == NDVITimelineManager.CLASSIFICATION) {
        for (var i = 0; i < filenames.length; i++) {
            //res += (res ? ' OR ' : '') + '"filename"=' + "'" + filenames[i].substring(0, filenames[i].length - 5) + "_classification'";
            res += (res ? ' OR ' : '') + '"sceneid"=' + "'" + filenames[i].substring(0, filenames[i].length - 5) + "'";
        }
    } else if (type == NDVITimelineManager.NDVI16) {
        for (var i = 0; i < filenames.length; i++) {
            res += (res ? ' OR ' : '') + '"filename"=' + "'" + filenames[i] + "'";
        }
    } else if (type == NDVITimelineManager.QUALITY16) {
        for (var i = 0; i < filenames.length; i++) {
            res += (res ? ' OR ' : '') + '"filename"=' + "'" + filenames[i].substring(0, filenames[i].length - 7) + "_QUALITY16'";
        }
    }

    return res;
};

//вынести в shared
NDVITimelineManager.boundsToCoordsArray = function (bounds, offset) {
    var min_x = gmxAPI.from_merc_x(gmxAPI.merc_x(bounds.minX) - offset),
        min_y = gmxAPI.from_merc_y(gmxAPI.merc_y(bounds.minY) - offset),
        max_x = gmxAPI.from_merc_x(gmxAPI.merc_x(bounds.maxX) + offset),
        max_y = gmxAPI.from_merc_y(gmxAPI.merc_y(bounds.maxY) + offset);

    return [[min_x, min_y], [min_x, max_y], [max_x, max_y], [max_x, min_y]];
};

NDVITimelineManager.boundsToCoordsArrayMerc = function (bounds, offset) {
    var min_x = gmxAPI.merc_x(bounds.minX) - offset,
        min_y = gmxAPI.merc_y(bounds.minY) - offset,
        max_x = gmxAPI.merc_x(bounds.maxX) + offset,
        max_y = gmxAPI.merc_y(bounds.maxY) + offset;

    return [[min_x, min_y], [min_x, max_y], [max_x, max_y], [max_x, min_y]];
};

NDVITimelineManager.gmxCoordsToWKT = function (coords) {
    var l = coords.length;
    var WKTCoords = "POLYGON((";
    for (var i = 0; i < l; i++) {
        WKTCoords += coords[i][0] + " " + coords[i][1];
        if (i != l - 1) {
            WKTCoords += ",";
        } else {
            WKTCoords += "," + coords[0][0] + " " + coords[0][1] + "))";
        }
    }
    return WKTCoords;
};

//Это новый вариант визуализации условия вегетации
NDVITimelineManager.prototype._showCONDITIONS_OF_VEGETATION = function () {
    document.getElementById("chkVciType").disabled = true;
    this.hideSelectedLayer();
    var fns = this._comboFilenames[this._selectedCombo];

    if (fns) {
        var url = 'http://maps.kosmosnimki.ru/VectorLayer/Search.ashx?WrapStyle=func&geometry=false&tables=[{%22LayerName%22:%224B68E05D988E404D962F5CC79FFCE67F%22,%22Alias%22:%22v%22},{%22LayerName%22:%2258B949C8E8454CF297184034DD8A62CD%22,%22Alias%22:%22a%22,%22Join%22:%22Inner%22,%22On%22:%22[v].area_id%20=%20[a].ogc_fid%22}]&columns=[{%22Value%22:%22[a].[Region]%22},{%22Value%22:%22[a].[District]%22},{%22Value%22:%22[v].[Value]%22}]';
        var query = '&query="Type"=' + (document.getElementById("chkVciType").checked ? 1 : 0) +
            ' AND "date"=' + "'" + NDVITimelineManager.formatDate(this._selectedDate.getDate(),
            this._selectedDate.getMonth() + 1, this._selectedDate.getFullYear()) + "'";

        //делаем запрос и раскрашиваем
        var that = this;
        sendCrossDomainJSONRequest(url + query, function (res) {
            AgroShared._meanVCIStyleData = {};
            var data = res.Result;
            for (var i = 0; i < data.values.length; i++) {
                var VCI = data.values[i][2];
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

                var nameId = data.values[i][0] + ":" + data.values[i][1];

                AgroShared._meanVCIStyleData[nameId] = {
                    fillStyle: "rgb(" + r + "," + g + "," + b + ")",
                    fillOpacity: 1.0,
                    strokeStyle: "rgb(" + (r - (r > 0 ? 15 : 0)) + "," + (g - (g > 0 ? 15 : 0)) + "," + (b - (b > 0 ? 15 : 0)) + ")",
                    opacity: a,
                    weight: 1
                };
            }

            var typeId = that._meanVCILayer._gmx.tileAttributeIndexes["Type"];

            that._meanVCILayer.setFilter(function (item) {
                var p = item.properties;
                if (p[typeId] == 0) {
                    return true;
                }
                return false;
            });

            that.lmap.addLayer(that._meanVCILayer);
            that._selectedLayers.push(that._meanVCILayer);
            that._selectedOption = "VCI";
            document.getElementById("chkVciType").disabled = false;
        });
    }
};

NDVITimelineManager.prototype.setSelectedLayersDateInterval = function (date0, date1) {
    for (var i = 0; i < this._selectedLayers.length; i++) {
        this._selectedLayers[i].setDateInterval(date0, date1);
    }
};

NDVITimelineManager.prototype._showFIRES_POINTS = function () {

    if (this._selectedPeriod &&
        this._selectedDate0 &&
        this._selectedDate1) {
        if (this._selectedOption == "FIRES") {
            //this._selectedLayer.setDateInterval(this._selectedDate0, this._selectedDate1);
            this.setSelectedLayersDateInterval(this._selectedDate0, this._selectedDate1);
        } else {
            this.hideSelectedLayer();
            this._selectedOption = "FIRES";
            var layer = this.layerCollection[this._layersLegend.FIRES.name];
            layer.setDateInterval(this._selectedDate0, this._selectedDate1);
            this.lmap.addLayer(layer);
            this._selectedLayers.push(layer);
        }
    } else {
        this.hideSelectedLayer();
        this._selectedOption = "FIRES";
        var layer = this.layerCollection[this._layersLegend.FIRES.name];
        layer.removeFilter();

        var dateCn = this._layersLegend["FIRES"].dateColumnName;
        var dateId = layer._gmx.tileAttributeIndexes[dateCn];
        var that = this;
        layer.setFilter(function (item) {
            var p = item.properties;
            if (NDVITimelineManager.equalDates(new Date(p[dateId] * 1000), new Date(that._selectedDateL * 1000))) {
                return true;
            }
            return false;
        });
        layer.setDateInterval(NDVITimelineManager.addDays(this._selectedDate, -1), NDVITimelineManager.addDays(this._selectedDate, 1));
        this.lmap.addLayer(layer);
        layer.bringToFront();
        this._selectedLayers.push(layer);
    }
};

NDVITimelineManager.prototype._showLayer = function (layerTypeName) {

    this.hideSelectedLayer();

    this._selectedOption = layerTypeName;

    var layer = this.layerCollection[this._layersLegend[layerTypeName].name];
    layer.removeFilter();

    var dateCn = this._layersLegend[layerTypeName].dateColumnName;
    var pathCn = "PATH";
    var GMX_RasterCatalogIDCn = "GMX_RasterCatalogID";
    var isQl = document.getElementById("chkQl").checked;

    var dateId = layer._gmx.tileAttributeIndexes[dateCn];
    var pathId = layer._gmx.tileAttributeIndexes[pathCn];
    var GMX_RasterCatalogIDId = layer._gmx.tileAttributeIndexes[GMX_RasterCatalogIDCn];

    var sceneidIndex = layer._gmx.tileAttributeIndexes["sceneid"] || layer._gmx.tileAttributeIndexes["SCENEID"];

    var showQuicklooks = this._layerConfigs[this._layersLegend[layerTypeName].name].showQuicklooks;
    var cloudsId = this._layerConfigs[layer.options.layerID].cloudsField && (layer._gmx.tileAttributeIndexes[this._layerConfigs[layer.options.layerID].cloudsField.toUpperCase()] ||
        layer._gmx.tileAttributeIndexes[this._layerConfigs[layer.options.layerID].cloudsField.toLowerCase()]);
    var cloudsMin = this._combo[this._selectedCombo].cloudsMin;

    var that = this;
    layer.setFilter(function (item) {
        var prop = item.properties;

        if (that._isQuicklook) {
            var s = that._comboFilenames[that._selectedCombo];
            for (var i = 0; i < s.length; i++) {
                if (NDVITimelineManager._normalizeFilename(s[i]) == prop[sceneidIndex]) {
                    return true;
                }
            }
        } else if (that.isSentinel) {
            var s = that._comboFilenames[that._selectedCombo];
            for (var i = 0; i < s.length; i++) {
                if (NDVITimelineManager._normalizeFilename(s[i]) == prop[sceneidIndex]) {
                    return true;
                }
            }
        } else {
            var ql = (prop[GMX_RasterCatalogIDId].length == 0);

            if (pathId && prop[pathId] == that._selectedPath && prop[dateId] == that._selectedDateL ||
                !pathId && prop[dateId] == that._selectedDateL) {

                if (isQl && showQuicklooks && ql) {
                    return true;
                }

                if (cloudsId) {
                    if (isQl && !showQuicklooks && !ql) {
                        return true;
                    } else if (isQl && showQuicklooks && !ql) {
                        return true;
                    } else if (prop[cloudsId] <= cloudsMin) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            }
        }

        return false;
    });
    layer.setDateInterval(NDVITimelineManager.addDays(this._selectedDate, -1), NDVITimelineManager.addDays(this._selectedDate, 1));
    this.lmap.addLayer(layer);
    //layer.setZIndex(0);
    this._selectedLayers.push(layer);

    this.showCloudMask(this._selectedDate);
};

NDVITimelineManager.prototype._showQUICKLOOK = function () {
    var sProd;
    this.setRadioLabelActive_grey("rgbRadio2", true);
    document.getElementById("rgbRadio2").checked = true;
    this._selectedType[this._selectedCombo] = NDVITimelineManager.RGB2_HR;
    this._showLayer("LANDSAT_PREVIEW");
};

NDVITimelineManager.prototype._showSENTINEL = function () {
    var sProd;
    this.setRadioLabelActive_grey("rgbRadio2", true);

    if (document.getElementById("rgbRadio").checked) {
        this._selectedType[this._selectedCombo] = NDVITimelineManager.RGB_HR;
        this._showLayer("SENTINEL_IR");
    } else if (document.getElementById("rgbRadio2").checked) {
        this._selectedType[this._selectedCombo] = NDVITimelineManager.RGB2_HR;
        this._showLayer("SENTINEL");
    } else if (document.getElementById("ndviRadio_hr").checked) {
        this._showLayerNDVI_HR("SENTINEL_NDVI");
    } else if (document.getElementById("ndviMeanRadio").checked) {
        this._showNDVI_MEAN();
    }
};

NDVITimelineManager.prototype._showRGB_HR = function () {
    this._showLayer("RGB");
};

NDVITimelineManager.prototype._showRGB2_HR = function () {
    this._showLayer("RGB2");
};

NDVITimelineManager.tolesBG = {};
NDVITimelineManager.cloudMaskTolesBG = {};

NDVITimelineManager.cloudMaskKr_hook = function (tile, info) {
    var id = info.x + ':' + info.y + ':' + info.z;
    if (tile) {
        NDVITimelineManager.cloudMaskTolesBG[id] = tile;
        tile.style.display = 'none';
    }
};

NDVITimelineManager.kr_hook = function (tile, info) {
    var id = info.x + ':' + info.y + ':' + info.z;
    if (tile) {
        NDVITimelineManager.tolesBG[id] = tile;
        tile.style.display = 'none';
    }
};

NDVITimelineManager.l_hook = function (tile, info) {
    var id = info.x + ':' + info.y + ':' + info.z;
    if (NDVITimelineManager.tolesBG[id]) {
        tile.getContext('2d').drawImage(NDVITimelineManager.tolesBG[id], 0, 0, 256, 256);
    }
    if (NDVITimelineManager.cloudMaskTolesBG[id]) {
        tile.getContext('2d').drawImage(NDVITimelineManager.cloudMaskTolesBG[id], 0, 0, 256, 256);
    }
};

NDVITimelineManager.prototype._showLayerNDVI_HR = function (layerTypeName) {

    this.hideSelectedLayer();

    this._selectedOption = layerTypeName;

    var layer = this.layerCollection[this._layersLegend[layerTypeName].name];

    layer.removeFilter();

    this.setRenderHook(layer, NDVITimelineManager.kr_hook, NDVITimelineManager.l_hook);

    var dateCn = this._layersLegend[layerTypeName].dateColumnName;
    var dateId = layer._gmx.tileAttributeIndexes[dateCn];

    var that = this;
    layer.setFilter(function (item) {
        var p = item.properties;
        if (p[dateId] == that._selectedDateL) {
            return true;
        }
        return false;
    }).on('doneDraw', function () {
        ndviTimelineManager.repaintAllVisibleLayers();
    }).setDateInterval(
            NDVITimelineManager.addDays(this._selectedDate, -1),
            NDVITimelineManager.addDays(this._selectedDate, 1)
        );
    this.lmap.addLayer(layer);
    //layer.setZIndex(0);
    this._selectedLayers.push(layer);

    this.showCloudMask(this._selectedDate);
};

NDVITimelineManager.prototype._showNDVI_HR = function () {

    this.hideSelectedLayer();

    this._selectedOption = "HR";

    var layer = this.layerCollection[this._layersLegend.HR.name];

    layer.removeFilter();

    this.setRenderHook(layer, NDVITimelineManager.kr_hook, NDVITimelineManager.l_hook);

    var dateCn = this._layersLegend["HR"].dateColumnName;
    var dateId = layer._gmx.tileAttributeIndexes[dateCn];

    var that = this;
    layer.setFilter(function (item) {
        var p = item.properties;
        if (p[dateId] == that._selectedDateL) {
            return true;
        }
        return false;
    }).on('doneDraw', function () {
        ndviTimelineManager.repaintAllVisibleLayers();
    }).setDateInterval(
            NDVITimelineManager.addDays(this._selectedDate, -1),
            NDVITimelineManager.addDays(this._selectedDate, 1)
        );
    this.lmap.addLayer(layer);
    //layer.setZIndex(0);
    this._selectedLayers.push(layer);

    this.showCloudMask(this._selectedDate);
};

NDVITimelineManager.prototype._showCLASSIFICATION = function () {

    this.hideSelectedLayer();

    this._selectedOption = "CLASSIFICATION";

    var layer = this.layerCollection[this._layersLegend["CLASSIFICATION"].name];
    layer.removeFilter();

    this.setRenderHook(layer, NDVITimelineManager.kr_hook, NDVITimelineManager.l_hook);

    var dateCn = this._layersLegend["CLASSIFICATION"].dateColumnName;
    var dateId = layer._gmx.tileAttributeIndexes[dateCn];

    var that = this;
    layer.setFilter(function (item) {
        var p = item.properties;
        if (p[dateId] == that._selectedDateL) {
            return true;
        }
        return false;
    }).on('doneDraw', function () {
        ndviTimelineManager.repaintAllVisibleLayers();
    }).setDateInterval(
            NDVITimelineManager.addDays(this._selectedDate, -1),
            NDVITimelineManager.addDays(this._selectedDate, 1)
        );
    this.lmap.addLayer(layer);
    //layer.setZIndex(0);
    this._selectedLayers.push(layer);
};

NDVITimelineManager.prototype._showNDVI16 = function () {

    this.hideSelectedLayer();
    this._selectedOption = "NDVI16";
    var that = this;

    var rk = this._combo[this._selectedCombo].rk;

    for (var i = 0; i < rk.length; i++) {
        if (this._layersLegend[rk[i]].viewTimeline) {
            var name = this._layersLegend[rk[i]].name;
            var layer = this.layerCollection[name];

            layer.removeFilter();

            var dateCn = this._layersLegend[rk[i]].dateColumnName;
            var dateId = layer._gmx.tileAttributeIndexes[dateCn];

            layer.setFilter(function (item) {
                var p = item.properties;
                if (p[dateId] == that._selectedDateL) {
                    return true;
                }
                return false;
            });
            layer.setDateInterval(NDVITimelineManager.addDays(this._selectedDate, -1), NDVITimelineManager.addDays(this._selectedDate, 1));
            this.lmap.addLayer(layer);
            //layer.setZIndex(0);
            this._selectedLayers.push(layer);
        }
    }
};

NDVITimelineManager.prototype._showQUALITY16 = function () {

    var layer = this.layerCollection[this._layersLegend[this._combo[this._selectedCombo].rk[1]].name];
    this.hideSelectedLayer();

    this._selectedOption = "QUALITY16";

    layer.removeFilter();

    var dateCn = this._layersLegend[this._combo[this._selectedCombo].rk[0]].dateColumnName;
    var dateId = layer._gmx.tileAttributeIndexes[dateCn];

    var that = this;
    layer.setFilter(function (item) {
        var p = item.properties;
        if (p[dateId] == that._selectedDateL) {
            return true;
        }
        return false;
    });
    layer.setDateInterval(NDVITimelineManager.addDays(this._selectedDate, -1), NDVITimelineManager.addDays(this._selectedDate, 1));
    this.lmap.addLayer(layer);
    //layer.setZIndex(0);
    this._selectedLayers.push(layer);
};

NDVITimelineManager.prototype._showRATING = function () {
    if (this.lmap.getZoom() >= NDVITimelineManager.MIN_ZOOM_HR) {
        this.hideSelectedLayer();
        this._selectedOption = "RATING";
        if (window.fieldsTable2) {
            fieldsTable2.startRating();
            if (fieldsTable2._selectedRows.length <= 1) {
                this._ratingHandler.start(this._visibleLayersOnTheDisplayPtr, shared.dateToString(this._selectedDate, true));
            }
        } else if (window.cosmosagro) {
            cosmosagro.agroFieldProjectView._ratingHandler.startRating();
            if (cosmosagro.agroFieldProjectView._selectedFields.length <= 1) {
                this._ratingHandler.start(this._visibleLayersOnTheDisplayPtr, shared.dateToString(this._selectedDate, true));
            }
        } else {
            this._ratingHandler.start(this._visibleLayersOnTheDisplayPtr, shared.dateToString(this._selectedDate, true));
        }
    }
};

NDVITimelineManager.prototype._showNDVI_MEAN = function () {
    if (this.lmap.getZoom() >= NDVITimelineManager.MIN_ZOOM_HR) {

        if (this.isSentinel) {
            this._themesHandler.katalogName = this._layersLegend.SENTINEL_NDVI.name;
        } else {
            this._themesHandler.katalogName = this._layersLegend.HR.name;
        }

        this.hideSelectedLayer();
        this._selectedOption = "MEAN_NDVI";
        this._themesHandler.start(this._visibleLayersOnTheDisplayPtr, shared.dateToString(this._selectedDate, true), this._currentRKIdArr, this._currentFnIdArr);
    }
};

NDVITimelineManager.prototype._hideNDVI_MEAN = function () {
    if (!this._currentRKIdArr.length) {
        this.setRadioLabelActive("ndviMeanRadio", false);
    }
    this._themesHandler.clear();
};

NDVITimelineManager.prototype._showINHOMOGENUITY = function () {
    if (this.lmap.getZoom() >= NDVITimelineManager.MIN_ZOOM_HR) {
        this.hideSelectedLayer();
        this._selectedOption = "INHOMOGENUITY";
        this._neodnrHandler.start(this._visibleLayersOnTheDisplayPtr, shared.dateToString(this._selectedDate, true), this._currentClassificationRKIdArr, this._currentClassificationFnIdArr);
    }
};

NDVITimelineManager.prototype._hideINHOMOGENUITY = function () {
    if (!this._currentClassificationRKIdArr.length) {
        this.setRadioLabelActive("inhomogenuityRadio", false)
    }
    this._neodnrHandler.clear();
};


NDVITimelineManager.prototype._showSLOPE = function () {
    if (!this._showSlope) {
        this._showSlope = true;
        var that = this;
        this._selectedOption = "SLOPE";
        ThemesManager.getLayersGeometry(this._visibleLayersOnTheDisplay, null, function (result) {
            that._slopeManager._colouredLayer.setZIndex(10000000);
            that._slopeManager.setFeatures(result.features);
            that._slopeManager.startThemesThread();
        });
    }
};

NDVITimelineManager.prototype._hideSLOPE = function () {
    if (this._slopeManager) {
        this._showSlope = false;
        this._slopeManager._colouredLayer && this.lmap.removeLayer(this._slopeManager._colouredLayer);
    }
};

NDVITimelineManager.prototype._refreshOptionsPanel = function () {
    //применяем стили активности
    var lbs = this._radioButtonLabels;
    for (var i in lbs) {
        if (lbs[i].label.comboIndex != -1) {
            this.setRadioLabelActive(i, this._selectedCombo == lbs[i].label.comboIndex);
        }
    }
};

NDVITimelineManager.prototype.hideLayers = function () {
    for (var i = 0; i < this._comboAsLayers.length; i++) {
        var c = this._comboAsLayers[i];
        for (var j = 0; j < c.length; j++) {
            var l = this.layerCollection[c[j]];
            l && l.setFilter(function (item) {
                return false;
            });
        }
    }
    this.setYearsPanelToZero();
};

NDVITimelineManager.prototype.refreshDateInterval_bug = function () {
    this.layerCollection[this._layersLegend.RGB.name].setDateInterval(new Date(2000, 1, 1), new Date());
};

NDVITimelineManager.prototype.showSelectedLayers = function () {
    for (var i = 0; i < this._selectedLayers.length; i++) {
        this.lmap.addLayer(this._selectedLayers[i]);
    }
};

NDVITimelineManager.prototype.hodeSelectedLayers = function () {
    for (var i = 0; i < this._selectedLayers.length; i++) {
        this.lmap.removeLayer(this._selectedLayers[i]);
    }
};

NDVITimelineManager.prototype.applyHRZoomREstriction = function (zoom) {

    if (!this._timelineVisibilityLayerID || this._timelineVisibilityLayerID && this._timelineVisibilityLayer._map) {

        this.meanNdviNoDataLabel.style.display = "none";

        if (this._combo[this._selectedCombo].resolution == "landsat") {
            if (zoom >= NDVITimelineManager.MIN_ZOOM_HR) {
                this.showSelectedLayers();

                this.zoomRestrictionLabel.style.display = "none";
                $(".ntHelp").removeClass("ntHelpLightOn")

                this.updateRadioLabelsActivity();

            } else {
                if (zoom >= NDVITimelineManager.MIN_ZOOM) {
                    if (this.selectedDiv && this._combo[this._selectedCombo].rk.length > 1) {
                        this.zoomRestrictionLabel.style.display = "block";
                        $(".ntHelp").addClass("ntHelpLightOn")
                    }
                } else {
                    this.zoomRestrictionLabel.style.display = "none";
                    $(".ntHelp").removeClass("ntHelpLightOn")
                    if (this.selectedDiv) {
                        //this.hideSelectedLayers();

                        for (var l in this._visibleFieldsLayers) {
                            var ll = this.layerCollection[l];
                            if (ll.clearTilePattern) {
                                ll.clearTilePattern();
                            }
                        }
                    }
                }
                this.setRadioLabelActive_grey("ratingRadio", false);
                this.setRadioLabelActive_grey("ndviRadio_hr", false);
                this.setRadioLabelActive_grey("ndviMeanRadio", false);
                this.setRadioLabelActive_grey("inhomogenuityRadio", false);
                this.setRadioLabelActive_grey("classificationRadio", false);
            }
        } else {
            this.zoomRestrictionLabel.style.display = "none";
            $(".ntHelp").removeClass("ntHelpLightOn")
        }
    }

    return true;
};

NDVITimelineManager.prototype.applyZoomRestriction = function (zoom) {

    var show = false;
    if (this._timelineVisibilityLayerID) {
        this._timelineVisibilityLayer._map && this.applyHRZoomREstriction(zoom);
        show = (this._timelineVisibilityLayer._map && zoom > NDVITimelineManager.MIN_ZOOM);
    } else {
        this.applyHRZoomREstriction(zoom);
        show = (zoom > NDVITimelineManager.MIN_ZOOM);
    }

    if (this._timelineVisibilityLayerID && show || !this._timelineVisibilityLayerID) {
        if (zoom > NDVITimelineManager.MIN_ZOOM) {

            this.setFilenameCaption(this.selectedShotFilename);
            this.removeShading();

            this._attDiv.style.display = "none";

            if (!this._manuallyCollapsed || (this._prevZoom == NDVITimelineManager.MIN_ZOOM)) {
                this.switcher.show();
            }

            if (!this._firstTimeCombo[this._selectedCombo]) {
                this.showLoadingSmall();
            }

            if (this._prevZoom <= NDVITimelineManager.MIN_ZOOM) {
                this.bindTimelineCombo(this._selectedCombo);
                this._showRedraw();
            }

            return true;
        } else {
            this.setFilenameCaption(NDVITimelineManager.ATTENTION_DIV);
            this.shadeTimeline();

            if (this._manuallyCollapsed) {
                this._attDiv.style.display = "block";
            }

            this.switcher.hide();

            return false;
        }
    }
};

NDVITimelineManager.prototype.refreshTimeline = function () {
    this._refreshOptionsPanel();
    this.hideLayers();
};

//params = [{"name":<имя слоя>,"filenames":[<имя файла>,...], "id":<radio element id>} ]
NDVITimelineManager.prototype._setExistentProds = function (params, success) {
    var defArr = [];
    var that = this;
    var rkArr = [];

    this.existentShots = {};

    function sendRequest(filenames, layerName, radioId, defIndex, sender) {
        var identField = that._layerConfigs[layerName].sceneFieldName;
        if (!identField) {
            var identField = ((radioId == "rgbRadio2" || radioId == "rgbRadio") ? "SCENEID" : "filename");
            identField = (radioId == "ndviRadio_hr" || radioId == "classificationRadio" ? "sceneid" : identField);
        }

        var query = "";
        for (var i = 0; i < filenames.length; i++) {
            query += "[" + identField + "]='" + filenames[i] + (i < filenames.length - 1 ? "' OR " : "'");
        }

        var data = {
            query: query,
            geometry: false,
            layer: layerName,
        };

        sendCrossDomainPostRequest("http://maps.kosmosnimki.ru/VectorLayer/Search.ashx", {
            'query': query,
            'geometry': false,
            'layer': layerName,
            'WrapStyle': "message"
        }, function (result) {
            var res = result.Result;
            if (res && res.values.length > 0) {
                sender.existentShots[radioId] = true;
                var ind = res.fields.indexOf("GMX_RasterCatalogID");
                for (var i = 0; i < res.values.length; i++) {
                    if (!rkArr[radioId]) {
                        rkArr[radioId] = [];
                    }
                    rkArr[radioId].push(res.values[i][ind]);
                }
            }
            defArr[defIndex].resolve();
        });
    }

    for (var i = 0; i < params.length; i++) {
        defArr[i] = new $.Deferred();
        this.existentShots[params[i].radioId] = false;
        sendRequest(params[i].filenames, params[i].name, params[i].radioId, i, this);
    }

    $.when.apply($, defArr).then(function () {
        success.call(that, rkArr);
    });
};

NDVITimelineManager.prototype.getVisibility = function (l) {
    return this.lmap.hasLayer(this.layerCollection[l]);
};

NDVITimelineManager.prototype.refreshVisibleLayersOnDisplay = function () {
    var that = this;

    var prevLayers = [].concat(that._visibleLayersOnTheDisplay);

    that._visibleLayersOnTheDisplay = [];
    that._visibleLayersOnTheDisplayPtr = [];
    for (var l in that._visibleFieldsLayers) {
        var bb = this.layerCollection[l].getBounds();
        var bb2 = this.lmap.getBounds();
        if (bb2.intersects(bb) && this.getVisibility(l)) {
            that._visibleLayersOnTheDisplay.push(l);
            that._visibleLayersOnTheDisplayPtr.push(that.layerCollection[l]);
        }

        //это поле в центре
        if (bb.contains(that.lmap.getCenter())) {
            that._visibleFieldsLayers[l].visible = true;
        } else {
            that._visibleFieldsLayers[l].visible = false;
        }
    }

    if (this.lmap.getZoom() >= NDVITimelineManager.MIN_ZOOM_HR) {
        that._themesHandler.addLayers(that._visibleLayersOnTheDisplayPtr, that._currentRKIdArr, that._currentFnIdArr);
        that._neodnrHandler.addLayers(that._visibleLayersOnTheDisplayPtr, that._currentClassificationRKIdArr, that._currentClassificationFnIdArr);
    }

    if (this._selectedLayers.length && !NDVITimelineManager.equal(that._visibleLayersOnTheDisplay, prevLayers)) {
        if (this._selectedOption == "HR" || this._selectedOption == "CLASSIFICATION") {
            this.removeSelectedLayersClipPolygon();
            if (this._cutOff) {

                for (var i = 0 ; i < this._visibleLayersOnTheDisplayPtr.length; i++) {
                    this._visibleLayersOnTheDisplayPtr[i].removePreRenderHook(NDVITimelineManager.l_hook);
                }

                for (var i = 0 ; i < this._visibleLayersOnTheDisplayPtr.length; i++) {
                    this._visibleLayersOnTheDisplayPtr[i].addPreRenderHook(NDVITimelineManager.l_hook);
                }

                this.layerBounds = NDVITimelineManager.getLayerBounds(this._visibleLayersOnTheDisplayPtr);
                this.addSelectedLayersClipPolygon(this.layerBounds);
            }
        }
    }

    if (this._selectedOption == "RATING" && !NDVITimelineManager.equal(that._visibleLayersOnTheDisplay, prevLayers)) {
        if (!window.cosmosagro) {
            this._ratingHandler.start(this._visibleLayersOnTheDisplayPtr, shared.dateToString(this._selectedDate, true));
        } else if (cosmosagro.agroFieldProjectView.getSelectedFields().length) {
            cosmosagro.agroFieldProjectView._ratingHandler.refreshRatingSelection();
        }
    }

    this.updateRadioLabelsActivity();
};

NDVITimelineManager.prototype.addSelectedLayersClipPolygon = function (clipPolygon) {
    for (var i = 0; i < this._selectedLayers.length; i++) {
        this._selectedLayers[i].addClipPolygon(clipPolygon);
    }
};

NDVITimelineManager.prototype.removeSelectedLayersClipPolygon = function () {
    if (this.layerBounds) {
        for (var i = 0; i < this._selectedLayers.length; i++) {
            this._selectedLayers[i].removeClipPolygon(this.layerBounds);
        }
    }
};

NDVITimelineManager.equal = function (a, b) {

    a.sort();
    b.sort();

    if (a.length != b.length) {
        return false;
    }

    for (var i = 0; i < a.length; i++) {
        if (a[i] != b[i])
            return false;
    }

    return true;
};

NDVITimelineManager.prototype.updateRadioLabelsActivity = function () {

    this.radioActiveLabels.style.display = "none";

    if (this.selectedDiv && this._visibleLayersOnTheDisplay.length) {
        if (this.lmap.getZoom() >= NDVITimelineManager.MIN_ZOOM_HR) {
            this.getProductAvailability("ndviRadio_hr") && this.setRadioLabelActive_grey("ndviRadio_hr", true);
            this.getProductAvailability("classificationRadio") && this.setRadioLabelActive_grey("classificationRadio", true);
            if (this.getProductAvailability("ndviMeanRadio")) {
                this.setRadioLabelActive_grey("ndviMeanRadio", true);
                this.setRadioLabelActive_grey("ratingRadio", true);
            }
            this.getProductAvailability("inhomogenuityRadio") && this.setRadioLabelActive_grey("inhomogenuityRadio", true);
            $(".ntHelp").removeClass("ntHelpLightOn");
        }
    } else {

        if (this._combo[this._selectedCombo].rk.length > 1 &&
            this._combo[this._selectedCombo].resolution == "landsat" &&
            this.selectedDiv &&
            this.zoomRestrictionLabel.style.display == "none") {
            this.radioActiveLabels.style.display = "block";
            $(".ntHelp").addClass("ntHelpLightOn");
        }

        this.setRadioLabelActive_grey("ndviRadio_hr", false);
        this.setRadioLabelActive_grey("classificationRadio", false);

        this.setRadioLabelActive_grey("ratingRadio", false);
        this.setRadioLabelActive_grey("ndviMeanRadio", false);
        this.setRadioLabelActive_grey("inhomogenuityRadio", false);
    }

    if (!this._cutOff) {
        this.getProductAvailability("ndviRadio_hr") && this.setRadioLabelActive_grey("ndviRadio_hr", true);
        this.getProductAvailability("classificationRadio") && this.setRadioLabelActive_grey("classificationRadio", true);
        $("#light_ndviRadio_hr").removeClass("ntHelpLightOn");
        $("#light_classificationRadio").removeClass("ntHelpLightOn");
    }
};

NDVITimelineManager.prototype.onMoveEnd = function () {

    NDVITimelineManager.fires_ht = {};

    var that = this;

    if (!that._doubleClick) {
        that.refreshVisibleLayersOnDisplay();
    } else {
        setTimeout(function () {
            that.refreshVisibleLayersOnDisplay();
        }, 200);
    }
    that._doubleClick = false;

    //специально для ndviMean
    that.applyHRZoomREstriction(that.lmap.getZoom());

    that.setDatesStickHoverCallback();

    setTimeout(function () {
        that.refreshSelections();
    }, 500);
};

//кеш геометрий слоев
NDVITimelineManager.geomCache = [];

//Эта функция возвращает массив полигонов
NDVITimelineManager.inverseMercatorGeometry = function (geometry) {
    var res = [];
    if (geometry.type === "POLYGON") {
        res.push(gmxAPI.from_merc_geometry({ "type": "POLYGON", "coordinates": geometry.coordinates }));
    } else if (geometry.type === "MULTIPOLYGON") {
        var poligons = geometry.coordinates;
        for (var i = 0; i < poligons.length; i++) {
            res.push(gmxAPI.from_merc_geometry({ "type": "POLYGON", "coordinates": poligons[i] }));
        }
    }
    return res;
};

NDVITimelineManager.prototype.getLayersCommonGeometry = function (layersArr, callback) {

    if (gmxAPI.map.getZ() < NDVITimelineManager.MIN_ZOOM) {
        return;
    }

    var that = this;
    var defArr = [];
    var geometryArray = [];
    var equalLayers = [];

    for (var i = 0; i < layersArr.length; i++) {
        (function (index) {
            var layerName = layersArr[index];
            if (!equalLayers[layerName]) {
                equalLayers[layerName] = true;
                defArr[index] = new $.Deferred();
                if (!NDVITimelineManager.geomCache[layerName]) {
                    NDVITimelineManager.geomCache[layerName] = [];
                    //Получаем геометрию полей с сервера
                    var url = "http://maps.kosmosnimki.ru/VectorLayer/Search.ashx?WrapStyle=func" +
                              "&layer=" + layerName +
                              "&geometry=true";

                    sendCrossDomainJSONRequest(url, function (response) {
                        var res = response.Result;
                        var geom_index = res.fields.indexOf("geomixergeojson");
                        for (var j = 0; j < res.values.length; j++) {
                            var geom = NDVITimelineManager.inverseMercatorGeometry(res.values[j][geom_index]);
                            NDVITimelineManager.geomCache[layerName].push.apply(NDVITimelineManager.geomCache[layerName], geom);
                        }
                        geometryArray[index] = NDVITimelineManager.geomCache[layerName];
                        defArr[index].resolve();
                    });
                } else {
                    geometryArray[index] = NDVITimelineManager.geomCache[layerName];
                    defArr[index].resolve();
                }
            }
        }(i));
    }

    $.when.apply($, defArr).then(function () {
        var commonGeometry = { "type": "MULTIPOLYGON", "coordinates": [] };
        //делаем общую геометрию
        for (var i = 0; i < geometryArray.length; i++) {
            var geom = geometryArray[i];
            for (var j = 0; j < geom.length; j++) {
                var gj = geom[j];
                if (gj.type == "POLYGON") {
                    commonGeometry.coordinates.push(gj.coordinates);
                } else {
                    //MULTYPOLYGON
                    for (var k = 0; k < gj.coordinates.length; k++) {
                        commonGeometry.coordinates.push(gj.coordinates[k]);
                    }
                }
            }
        }

        callback && callback.call(that, commonGeometry);
    });
};

NDVITimelineManager.prototype.applyZoomHandler = function () {
    var that = this;

    this.lmap.on("moveend", function (arg) {
        that._prevZoom = that._currentZoom;
        var z = that.lmap.getZoom();
        if (that.applyZoomRestriction(z)) {

            if (z != that._currentZoom && that._currentZoom <= NDVITimelineManager.MIN_ZOOM) {
                that.refreshDateInterval_bug();
            }

            that.onMoveEnd();
        }
        that._currentZoom = z;
    });
};

NDVITimelineManager.prototype.setDatesStickHoverCallback = function () {
    var that = this;
    var dateDivs = $(".timeline-event.timeline-event-line");
    dateDivs.off("mouseover").on("mouseover", function (e) {
        that.dateDivHoverCallback.call(that, e);
    });
};

NDVITimelineManager.isPointInGeometry = function (geometry, point) {
    if (geometry.type.toUpperCase() == "POLYGON") {
        return NDVITimelineManager.isPointInPoly(geometry.coordinates[0], point);
    } else {
        for (var i = 0; i < geometry.coordinates.length; i++) {
            if (NDVITimelineManager.isPointInPoly(geometry.coordinates[i][0], point)) {
                return true;
            }
        }
    }
    return false;
};

NDVITimelineManager.prototype.dateDivHoverCallback = function (e) {

    if (this._combo[this._selectedCombo].rk[0] == "FIRES") {
        // попап для пожарных рисок точек
        //...
    } else {

        var selectedLayers = this.getViewTimelineLayers(this._selectedCombo);

        var selectedItems = [];
        for (var k = 0; k < selectedLayers.length; k++) {
            var l = selectedLayers[k];
            var ll = this.layerCollection[l];
            var items = this.timeLine.data.attributes.items[l];
            var dateColumnName = this._dateColumnNames[l];
            dateColumnName = ll._gmx.tileAttributeIndexes[dateColumnName];

            //собираем риски сосредоточенные в одном месте
            var center = L.Projection.Mercator.project(this.lmap.getCenter());
            for (var i in items) {
                var ii = items[i];
                var d0 = e.currentTarget.tip.textContent.substring(0, 10);
                var d1 = (ii.timelineItem ? ii.timelineItem.content : "xxx");
                if (d0 == d1 && NDVITimelineManager.isPointInGeometry(ii.obj.properties[ii.obj.properties.length - 1], center)) {
                    selectedItems.push({ item: ii, layer: ll });
                }
            }
        }

        if (selectedItems.length == 0)
            return;

        //иногда в одной дате несколько снимков
        var str = "";
        var clouds = 100;
        var cloudsHere = false;
        for (var i = 0; i < selectedItems.length; i++) {
            var prop = selectedItems[i].item.obj.properties;
            var ll = selectedItems[i].layer;
            var CLOUDS = ll._gmx.tileAttributeIndexes['CLOUDS'] || ll._gmx.tileAttributeIndexes['clouds'];
            if (prop[CLOUDS]) {
                var c = parseFloat(prop[CLOUDS]);
                //Общую облачность показываем минимальную
                if (c < clouds)
                    clouds = c;
                cloudsHere = true;
            }
        }

        this.hoverShotFilename = selectedItems[0].item.timelineItem.content;
        e.currentTarget.tip.children[0].textContent = this.hoverShotFilename;

        this.hoverDiv = e.currentTarget;

        if (cloudsHere) {
            e.currentTarget.tip.children[0].textContent = this.hoverShotFilename + ", облачность: " + Math.round(clouds) + "%";
        }

        var tipWidth = $(e.currentTarget.tip).width();
        if (this._mouseTabloPosition < tipWidth + 75) {
            var x = this._mouseTabloPosition_X - tipWidth;
            e.currentTarget.tip.style.left = (x < 0 ? 0 : x) + "px";
        }
    }
};

NDVITimelineManager.prototype.showLoading = function () {
    var el = document.getElementById("loading");
    if (el) {
        el.style.display = "block";
    } else {
        $('<div id="loading" class="timeline-container" style="width:42px; height:42px"></div>').appendTo($(this._container));
        $("#loading").append(
            '<div style="float: right;"> \
            <div id="floatingCirclesG"> \
            <div class="f_circleG" id="frotateG_01"></div><div class="f_circleG" id="frotateG_02"></div><div class="f_circleG" id="frotateG_03"></div><div class="f_circleG" id="frotateG_04"></div><div class="f_circleG" id="frotateG_05"></div><div class="f_circleG" id="frotateG_06"></div><div class="f_circleG" id="frotateG_07"></div><div class="f_circleG" id="frotateG_08"></div> \
            </div> \
            </div>');
    }
};

NDVITimelineManager.prototype.hideLoading = function () {
    var el = document.getElementById("loading");
    if (el) {
        el.style.display = "none";
    }
};

NDVITimelineManager.prototype.getSliderDate = function () {
    if (this._slider.getCaption().length) {
        return NDVITimelineManager.serverDateToDate(this._slider.getCaption(), true);
    } else {
        return new Date(this._selectedYear, 0, 1);
    }
};

NDVITimelineManager.serverDateToDate = function (dateStr, order) {
    var arr = dateStr.split(".");
    arr.forEach(function (el, i) { arr[i] = parseInt(el); });
    if (order) {
        return new Date(arr[2], arr[1] - 1, arr[0]);
    } else {
        return new Date(arr[0], arr[1] - 1, arr[2]);
    }
};

NDVITimelineManager.prototype.applyActiveYears = function (yearsList) {
    for (var y in this._yearsPanel) {
        var pan = this._yearsPanel[y];
        if (yearsList[y]) {
            pan.radio.disabled = false;
            pan.radio.style.cursor = "pointer";
            pan.caption.classList.remove("ntDisabledLabel");
            pan.count.classList.remove("ntDisabledLabel");
            pan.count.innerHTML = yearsList[y].toString();
        } else {
            pan.radio.disabled = true;
            pan.radio.style.cursor = "default !important";
            pan.caption.classList.add("ntDisabledLabel");
            pan.count.classList.add("ntDisabledLabel");
            pan.count.innerHTML = "(0)";
            pan.title = "";
        }
    }
};

NDVITimelineManager.prototype.setYearsPanelToZero = function () {
    for (var y in this._yearsPanel) {
        var pan = this._yearsPanel[y];
        pan.radio.disabled = true;
        pan.caption.classList.add("ntDisabledLabel");
        pan.count.classList.add("ntDisabledLabel");
        pan.count.innerHTML = "(0)";
        pan.title = "";
    }
};

//Эта функия есть в плагине таймлайна, ее бы надо вынести в утилиты
NDVITimelineManager.isPointInPoly = function (poly, pt) {
    var l = poly.length;
    poly[0][0] == poly[l - 1][0] && poly[0][1] == poly[l - 1][1] && l--;
    for (var c = false, i = -1, j = l - 1; ++i < l; j = i)
        ((poly[i][1] <= pt.y && pt.y < poly[j][1]) || (poly[j][1] <= pt.y && pt.y < poly[i][1]))
        && (pt.x < (poly[j][0] - poly[i][0]) * (pt.y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
        && (c = !c);
    return c;
}

NDVITimelineManager.prototype.initializeImageProcessor = function () {
    for (var i = 0; i < this._combo.length; i++) {
        var r = this._combo[i].rk;
        for (var j = 0; j < r.length; j++) {
            var rj = r[j];
            var lrj = this._layersLegend[rj];
            if (lrj.palette && (lrj.palette.ndvi || lrj.palette.classification)) {
                var n = lrj.name;
                if (this.layerCollection[n]) {
                    this._setLayerImageProcessing(this.layerCollection[n], rj);
                    var layer = this.layerCollection[n];
                    var styles = layer.getStyles();
                    styles[0].HoverStyle.weight = styles[0].RenderStyle.weight;
                    layer.setStyles(styles);
                } else {
                    console.log("layer undefined: " + n);
                }
            }
        }
    }

    this.landsatCloudMask = this.layerCollection[this._layersLegend.HR.mask];
    this.sentinelCloudMask = this.layerCollection[this._layersLegend.SENTINEL_NDVI.mask];
    this.landsatCloudMask.setRasterHook(function (dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info) {
        applyMask(dstCanvas, srcImage, info);
    });
    this.sentinelCloudMask.setRasterHook(function (dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info) {
        applyMask(dstCanvas, srcImage, info);
    });

    var that = this;
    function applyMask(dstCanvas, srcCanvas, info) {
        shared.zoomTile(srcCanvas, info.source.x, info.source.y, info.source.z,
                   info.destination.x, info.destination.y, that.lmap.getZoom(),
                   dstCanvas,
                   function (r, g, b, a) {
                       if (r === 0 || r === 1) {
                           return [r, g, b, 0];
                       } else {
                           return [r, g, b, a];
                       }
                   }, shared.NEAREST);
    }
};

NDVITimelineManager.prototype.initializeRGBImagePrrocessing = function () {
    var layer = this.layerCollection[this._layersLegend.RGB.name];
};

NDVITimelineManager.prototype.initializeRGB2ImagePrrocessing = function () {
    var layer = this.layerCollection[this._layersLegend.RGB2.name];
    var that = this;
    layer.setRasterHook(function (dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info) {
        shared.zoomTile(srcImage, info.source.x, info.source.y, info.source.z,
            info.destination.x, info.destination.y, that.lmap.getZoom(), dstCanvas, null, shared.LINEAR);

    });
};

NDVITimelineManager.prototype.initializeShotsObserver = function () {
    for (var i = 0; i < this._combo.length; i++) {
        var r = this._combo[i].rk;
        for (var j = 0; j < r.length; j++) {
            var rj = r[j];
            var lrj = this._layersLegend[rj];
            if (this._layersLegend[rj].viewTimeline) {
                var n = lrj.name;
            }
        }
    }

    this.bindTimelineCombo(this._selectedCombo);
};

NDVITimelineManager.prototype.unbindLayersTimeline = function () {
    this._lockUnbind = true;
    var layers = [].concat(this.timeLine.data.attributes.layers);
    for (var i = 0; i < layers.length; i++) {
        this.timeLine.unbindLayer(layers[i].layer);
    }
    this._lockUnbind = false;
};

NDVITimelineManager.prototype.getViewTimelineLayers = function (selectedCombo) {
    var res = [];
    var rkArr = this._combo[selectedCombo].rk;
    var viewTimelineLayer = 0
    for (var i = 0; i < rkArr.length; i++) {
        if (this._layersLegend[rkArr[i]].viewTimeline) {
            res.push(this._layersLegend[rkArr[i]].name);
        }
    }
    return res;
};

NDVITimelineManager.prototype.bindTimelineCombo = function (selectedCombo) {
    this.unbindLayersTimeline();
    var timelineLayerNames = this.getViewTimelineLayers(selectedCombo);

    var timelineMode = this._layersLegend[this._combo[selectedCombo].rk[0]].timelineMode || "center";
    this.timeLine.setTimelineMode(timelineMode);

    for (var l in this._proxyLayers) {
        this._proxyLayers[l].delete();
        delete this._proxyLayers[l];
    }

    for (var i = 0; i < timelineLayerNames.length; i++) {
        var timelineLayerName = timelineLayerNames[i];
        //Вобщем такая бага, приходится все время создавать прокси слой при переключении, если использовать 
        //один и тот же такое ощущение, что теряются риски на таймлайне.
        if (this.isProxyLayer(timelineLayerName) /*&& !this._proxyLayers[timelineLayerName]*/) {
            this._proxyLayers[timelineLayerName] = new TimelineProxyLayer(this, this.layerCollection[timelineLayerName], this.lmap);
            this._proxyLayers[timelineLayerName].setDateInterval(new Date(this._selectedYear, 0, 1), new Date(this._selectedYear, 11, 31));
            this.timeLine.bindLayer(this._proxyLayers[timelineLayerName].localLayer, { trackVisibility: false });
            this.layerCollection[this._proxyLayers[timelineLayerName].name] = this._proxyLayers[timelineLayerName].localLayer;
            //} else if (this.isProxyLayer(timelineLayerName) && this._proxyLayers[timelineLayerName]) {
            //    this._proxyLayers[timelineLayerName].setDateInterval(new Date(this._selectedYear, 0, 1), new Date(this._selectedYear, 11, 31));
            //    this.timeLine.bindLayer(this._proxyLayers[timelineLayerName].localLayer, { trackVisibility: false });
        } else {
            this.timeLine.bindLayer(this.layerCollection[timelineLayerName], { trackVisibility: false });
        }
    }
};

NDVITimelineManager.prototype.isProxyLayer = function (name) {
    return this._proxyOptions.indexOf(name) != -1;
};

NDVITimelineManager._normalizeFilename = function (filename, type) {
    var res = "";

    if (type == NDVITimelineManager.NDVI_HR) {
        res = filename.substring(0, filename.length - 5);
    } else if (type == NDVITimelineManager.RGB_HR) {
        res = filename.substring(0, filename.length - 5);
    } else if (type == NDVITimelineManager.RGB2_HR) {
        res = filename.substring(0, filename.length - 5);
    } else if (type == NDVITimelineManager.CLASSIFICATION) {
        //res = filename.substring(0, filename.length - 5) + "_classification";
        res = filename.substring(0, filename.length - 5);
    } else if (type == NDVITimelineManager.QUALITY16) {
        res = filename.substring(0, filename.length - 7) + "_QUALITY16";
    } else if (!type) {
        res = filename.substring(0, filename.length - 5);
    }

    return res;
};

NDVITimelineManager.prototype.deactivateUnknownRadios = function () {

    var donttouchArray = null;

    if (document.getElementById("chkQl").checked) {
        donttouchArray = ["rgbRadio"];
    }

    for (var c in NDVITimelineManager._comboRadios[this._selectedCombo]) {
        var r = NDVITimelineManager._comboRadios[this._selectedCombo][c];
        if (!donttouchArray) {
            this.setRadioLabelActive_grey(r, false);
        } else if (donttouchArray.indexOf(r) == -1) {
            this.setRadioLabelActive_grey(r, false);
        }
    }

    this.setRadioLabelActive_grey("ratingRadio", false);
    this.setRadioLabelActive_grey("ndviMeanRadio", false);
    this.setRadioLabelActive_grey("inhomogenuityRadio", false);
};

NDVITimelineManager.prototype.refreshSelections = function () {

    var layerNames = this.getViewTimelineLayers(this._selectedCombo);

    if (this._combo[this._selectedCombo].resolution == "landsat" && this._currentSelection) {

        this.selectedDiv = null;

        for (var k = 0; k < layerNames.length; k++) {
            var layerName = layerNames[k];
            var l = this.layerCollection[layerName];
            var PATHId = l._gmx.tileAttributeIndexes["PATH"];
            var ACQDATEId = l._gmx.tileAttributeIndexes["ACQDATE"] || l._gmx.tileAttributeIndexes["acqdate"];

            var done = false;
            for (var s in this._currentSelection) {
                var items = this.timeLine.data.attributes.items[s];
                for (i in items) {
                    var item = items[i];
                    if (item.timelineItem && item.obj.properties[ACQDATEId] == this._selectedDateL && item.obj.properties[PATHId] == this._selectedPath) {
                        item.timelineItem.select();
                        this.selectedDiv = item.timelineItem.dom;
                        done = true;
                        break;
                    }
                }
                if (done) {
                    break;
                }
            }
        }
    } else if (this.selectedDiv) {
        var start = new Date(this._selectedYear, 0, 1);
        var end = new Date(this._selectedYear + 1, 1, 9);
        var tl = this.timeLine.getTimelineController().getTimeline();
        var currIndex = tl.getItemIndex(this.selectedDiv);

        if (!tl.items[currIndex]) {

            var currTime = this._selectedDate.getTime();

            var minItem = null;
            var minDeltaTime = 100000000000;
            //выбираем items выбранного года и ближайщее расстояние от текущего выбранного
            for (var i = 0; i < tl.items.length; i++) {
                var item = tl.items[i];
                var itemDate = new Date(item.center);
                if (item.dom && itemDate >= start && itemDate <= end) {
                    var idt = itemDate.getTime();
                    var d = Math.abs(currTime - idt);
                    if (d < minDeltaTime) {
                        minDeltaTime = d;
                        minItem = item;
                    }
                }
            }

            if (minItem) {

                function daydiff(first, second) {
                    return (second - first) / (1000 * 60 * 60 * 24);
                }

                $(".timeline-event.timeline-event-line").removeClass("timeline-event-selected");

                if (document.getElementById("conditionsOfVegetationRadio").checked &&
                    this._selectedDate == new Date(minItem.center)) {
                    item.timelineItem.select();
                } else if (this._combo[this._selectedCombo].rk[0] == "FIRES") {
                    if (NDVITimelineManager.equalDates(this._selectedDate, new Date(minItem.center))) {
                        minItem.dom.classList.add("timeline-event-selected");
                    }
                } else if (daydiff(this._selectedDate, new Date(minItem.center)) <= 3) {
                    minItem.dom.classList.add("timeline-event-selected");
                }
            }
        }
    } else if (this._selectedPeriod && this._selectedDate0 && this._selectedDate1) {
        var tl = this.timeLine.getTimelineController().getTimeline();
        var range = tl.getVisibleChartRange();
        var sortedItems = [];
        for (var i = 0; i < tl.items.length; i++) {
            var item = tl.items[i];
            var itemDate = new Date(item.center);
            if (item.dom && itemDate >= range.start && itemDate <= range.end) {
                sortedItems.push({ "center": item.center, "dom": item.dom });
            }
        }

        sortedItems.sort(function (a, b) {
            return b.center - a.center;
        });

        this.selectPeriodItems(this._selectedDate0, this._selectedDate1, sortedItems);
    } else {
        //здесь происходит выделение риски
        for (var s in this._currentSelection) {
            var css = this._currentSelection[s];
            for (var i = 0; i < css.length; i++) {
                var item = this.timeLine.data.attributes.items[s][css[i].id];
                if (item && item.timelineItem) {
                    item.timelineItem.select();
                    this.selectedDiv = item.timelineItem.dom;
                }
            }
        }
    }
};

NDVITimelineManager.prototype.initializeTimeline = function (show) {
    var that = this;

    if (this.timeLine) {
        this.timeLine.toggleVisibility(show);
    } else {
        var lmap = this.lmap;
        this.timeLine = new nsGmx.TimelineControl(lmap, { position: "bottomright" });
        this.timeLine.setMapMode("selected");
        this.timeLine.setTimelineMode("center");
        if (lmap.getZoom() > NDVITimelineManager.MIN_ZOOM) {
            this.timeLine.toggleVisibility(true);
        } else
            this.timeLine.toggleVisibility(false);
        this.timeLine.setControlsVisibility({
            "showModeControl": false,
            "showSelectionControl": false,
            "showCalendar": false
        });

        //связываем слои NDVI с таймлайном и обработку(раскраску) тайлов этих слоев
        //я не зря разбил эти циклы на отдельные, онипригадятся в будущем кажый в отдельности
        this.initializeImageProcessor();

        //сделаем обработку для раззумливания снимков отдельным обработчиком
        this.initializeRGBImagePrrocessing();
        this.initializeRGB2ImagePrrocessing();

        //обсерверы на КР, нужно для определения кол-ва снимков,  и окончания загрузки на таймлайн
        this.initializeShotsObserver();

        this.timeLine.addFilter(function (elem, a, b, layer) {
            return that._filterTimeline(elem, layer);
        });

        $(this.timeLine.getTimelineController()).on("reflow", function () {
            that.redrawTimelineLinks();
        });

        $(this.timeLine.getTimelineController()).on('reflow', function () {
            that.setDatesStickHoverCallback();
        });

        this.timeLine.data.on('change:selection', function (x) {
            that.onChangeSelection.call(that, x);
        });

        this.initTimelineFooter();

        var that = this;
        var tablo = $(".timeline-container");
        var tabloWidth = tablo.width();
        tablo.bind("mousemove", function (e) {
            that._mouseTabloPosition = tabloWidth - e.offsetX;
            that._mouseTabloPosition_X = e.offsetX;
        });

        $(".timeline-container").prepend('<div class="shadeTimeline">')
    }

    //останавливаем перемещение таймлайна мышкой
    this.timeLine.getTimelineController().getTimeline().setOptions({ "moveable": false, "zoomable": false });

    //помещаем контрол в такой zIndex, чтобы он отображался под другими контролами
    $(".leaflet-bottom.leaflet-right.gmx-bottom-shift").css("z-index", 0);

    $(this.timeLine.getContainer()).on('click', function (event) {
        if (that.optionsMenu._isOpened && !that.optionsMenu._dontClose) {
            that.optionsMenu.hide();
        }
        event.stopPropagation();
    });

    $(this.timeLine.getContainer()).on('dblclick', function (event) {
        event.stopPropagation();
    });

    bindScrollControl("ntRightPanel", this.lmap);

    $("#ntComboBox > option").each(function (e, n) {
        if (that._combo[parseInt(n.value)].hide) {
            $(n).remove();
        }
    });
};

NDVITimelineManager.prototype.redrawTimelineLinks = function () {
    var that = this;
    if (that._lockUnbind) return;

    var layerNames = that.getViewTimelineLayers(that._selectedCombo);

    if (that._combo[that._selectedCombo].clouds/*that._combo[that._selectedCombo].rk[0] == "HR" ||
        that._combo[that._selectedCombo].rk[0] == "RGB753"*/) {

        var isQl = $("#chkQl").is(':checked');

        setTimeout(function () {
            for (var k = 0; k < layerNames.length; k++) {
                var l = layerNames[k];

                that.isProxyLayer(l) && (l = "proxy_" + l);
                var items = that.timeLine.data.attributes.items[l];

                var layer = that.layerCollection[l];

                var gmxRKid = layer._gmx.tileAttributeIndexes['GMX_RasterCatalogID'];

                for (var i in items) {
                    var ii = items[i];
                    if (ii.timelineItem && ii.timelineItem.dom) {
                        var dom = ii.timelineItem.dom;
                        var prop = ii.obj.properties;

                        if (dom && dom.childNodes.length == 0) {
                            if (!gmxRKid && isQl || gmxRKid && !prop[gmxRKid].length && isQl) {
                                dom.classList.add("ntQl");
                            }

                            var CLOUDSid = layer._gmx.tileAttributeIndexes['CLOUDS'] || layer._gmx.tileAttributeIndexes['clouds'];

                            if (CLOUDSid) {

                                var clouds = parseInt(prop[CLOUDSid]);

                                var div1 = document.createElement("div");
                                div1.style.width = "100%";
                                div1.style.backgroundColor = "rgb(131, 132, 134)";
                                div1.style.height = (100 - clouds) + "%";

                                var div2 = document.createElement("div");
                                div2.style.width = "100%";
                                div2.style.backgroundColor = "white";
                                div2.style.height = clouds + "%";

                                dom.appendChild(div1);
                                dom.appendChild(div2);
                            }
                        }
                    }
                }
            }
        });
    } else {
        setTimeout(function () {
            for (var k = 0; k < layerNames.length; k++) {
                var l = layerNames[k];

                that.isProxyLayer(l) && (l = "proxy_" + l);
                var items = that.timeLine.data.attributes.items[l];

                var layer = that.layerCollection[l];

                var gmxRKid = layer._gmx.tileAttributeIndexes['GMX_RasterCatalogID'];

                for (var i in items) {
                    var ii = items[i];
                    if (ii.timelineItem && ii.timelineItem.dom) {
                        var dom = ii.timelineItem.dom;
                        if (dom && dom.childNodes.length == 0) {
                            var div1 = document.createElement("div");
                            div1.style.width = "100%";
                            div1.style.backgroundColor = "rgb(131, 132, 134)";
                            div1.style.height = "100%";

                            if (that._selectedPeriod && that._selectedDate0 && that._selectedDate1) {
                                var d = new Date(ii.timelineItem.center);
                                if (d >= that._selectedDate0 && d <= that._selectedDate1) {
                                    dom.classList.add("timeline-event-selected");
                                }
                            }

                            dom.appendChild(div1);
                        }
                    }
                }
            }
        });
    }

};

NDVITimelineManager.prototype.onChangeSelection = function (x) {

    this._isQuicklook = false;
    this.isSentinel = false;

    this.meanNdviNoDataLabel.style.display = "none";

    this.optionsMenu.hide();

    this.setRadioLabelActive_grey("rgbRadio", false);
    this.setRadioLabelActive_grey("ndviRadio_modis", false);
    this.setRadioLabelActive_grey("conditionsOfVegetationRadio", false);

    this.zoomRestrictionLabel.style.display = "none";
    $(".ntHelp").removeClass("ntHelpLightOn");

    this.clearProductAvailability();

    function getFilename(properties, layer) {
        var sceneid = properties[layer._gmx.tileAttributeIndexes["sceneid"]] || properties[layer._gmx.tileAttributeIndexes["SCENEID"]];
        if (sceneid) {
            return sceneid + "_NDVI";
        } else {
            var filename = layer._gmx.tileAttributeIndexes["filename"];
            return properties[filename];
        }
    };

    var that = this;

    that._quicklookSelected = false;

    //снимаем выделения
    $(".timeline-event.timeline-event-line").removeClass("timeline-event-selected");

    that.selectedDiv = null;

    that._currentSelection = x.changed.selection;

    var selection = x.changed.selection;
    var selectedLayer;
    for (var sel in selection) {
        selectedLayer = sel;
    }

    var selectedItems = selection[selectedLayer];

    that._comboFilenames.length = 0;

    this.setProductAvailability("rgbRadio", true);

    this.updateRadioLabelsActivity();

    if (!selectedItems) {

        !that._dontTouchEmptyClick && window.ndviGraphicsManager && ndviGraphicsManager.graphDialog.onEmptyClick(null, true);

        that._hideLayers();
        that._currentRKIdArr = [];
        if (!that._showThemesNDVI) {
            that.setRadioLabelActive("ratingRadio", false);
            that.setRadioLabelActive("ndviMeanRadio", false);
            that.setProductAvailability("ndviMeanRadio", false);
        }
        //выключаем "неопознанные" продукты
        that.deactivateUnknownRadios();
        that._currentSelection = null;
        that._selectedPath = null;
        this._selectedDates = [];
        that._selectedDate0 = null;
        that._SelectedDate1 = null;
    } else {

        var c = this.timeLine.getTimelineController();
        var t = c.getTimeline();
        this._selectedDiv = t.selection[0].item;

        if (this._combo[this._selectedCombo].rk[0] == "FIRES") {

            NDVITimelineManager.fires_ht = {};

            var comboArr = that._combo[that._selectedCombo].rk;

            this._selectedDates = [];

            for (var u = 0; u < selectedItems.length; u++) {
                var layerItems = x.attributes.items[selectedLayer];
                var prop = layerItems[selectedItems[u].id].obj.properties;

                var qrk = comboArr[0];
                var dcln = that._layersLegend[qrk].dateColumnName;
                var date = prop[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes[dcln]];

                this._selectedDates.push(date);

            }

            this._selectedDateL = this._selectedDates[0];
            this._selectedDate = new Date(date * 1000);
            this._selectedDateStr = shared.dateToString(new Date(date * 1000));

            this._selectedType[this._selectedCombo] = NDVITimelineManager.FIRES_POINTS;

            this._prepareRedraw();
            this._showRedraw();
        } else {

            //здесь хранится имя облачного снимка
            var ql = null;
            var clouds = null;
            var qldate = "";
            var date = "";

            if (selectedLayer == "58A10C3522764BA69D2EA75B02E8A210") {
                this.isSentinel = true;
            }
            var comboArr = that._combo[that._selectedCombo].rk;
            var q;
            //TODO: вынести индекс слоя в группе в какой нибудь параметр.
            if (comboArr.length != 1 && that._combo[that._selectedCombo].resolution != "modis") {
                if (this.isSentinel) {
                    q = 4;
                } else {
                    q = 1;
                }
            } else {
                q = 0;
            }

            var qrk = comboArr[q];
            var dcln = that._layersLegend[qrk].dateColumnName;
            var filenames = [];

            for (var u = 0; u < selectedItems.length; u++) {
                var layerItems = x.attributes.items[selectedLayer];
                var prop = layerItems[selectedItems[u].id].obj.properties;

                var _GMX_RasterCatalogID = this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes["GMX_RasterCatalogID"];
                //это облачныйснимок
                if (!_GMX_RasterCatalogID || _GMX_RasterCatalogID && !this.isSentinel && !prop[_GMX_RasterCatalogID].length) {
                    this._isQuicklook = true;

                    var _CLOUDS = this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes["CLOUDS"];
                    clouds = prop[_CLOUDS];
                    that._selectedType[that._selectedCombo] = NDVITimelineManager.RGB_HR;
                    document.getElementById("rgbRadio").checked = true;
                    this.setRadioLabelActive_grey("ndviRadio_hr", false);
                    this.setRadioLabelActive_grey("ratingRadio", false);
                    this.setRadioLabelActive_grey("ndviMeanRadio", false);
                    this.setRadioLabelActive_grey("inhomogenuityRadio", false);
                    this.setRadioLabelActive_grey("classificationRadio", false);

                    this.setProductAvailability("ndviRadio_hr", false);
                    this.setProductAvailability("ratingRadio", false);
                    this.setProductAvailability("ndviMeanRadio", false);
                    this.setProductAvailability("inhomogenuityRadio", false);
                    this.setProductAvailability("classificationRadio", false);
                }

                date = prop[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes[dcln]] ||
                    prop[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes["ACQDATE"]] ||
                    prop[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes[this._layerConfigs[selectedLayer].dateColumnName]];

                if (date) {
                    that._selectedDateL = date;
                    that._selectedDate = new Date(date * 1000);
                    that._selectedDateStr = shared.dateToString(new Date(date * 1000));
                    var _PATH = this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes["PATH"];
                    that._selectedPath = prop[_PATH];
                    if (that._switchYearCallback)
                        that._switchYearCallback(that._selectedDate);

                    if (that._combo[that._selectedCombo].resolution != "modis") {
                        for (var i in layerItems) {
                            var lip = layerItems[i].obj.properties;

                            var lip_dcln = lip[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes[dcln]] ||
                                           lip[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes["ACQDATE"]] ||
                                           lip[this.layerCollection[selectedLayer]._gmx.tileAttributeIndexes["acqdate"]];

                            if (lip_dcln == date) {
                                var center = L.Projection.Mercator.project(that.lmap.getCenter());
                                var geom = lip[lip.length - 1];
                                if (NDVITimelineManager.isPointInGeometry(geom, center)) {
                                    if (document.getElementById("chkQl").checked ||
                                        _GMX_RasterCatalogID && !document.getElementById("chkQl").checked && lip[_GMX_RasterCatalogID].length) {
                                        filenames.push(getFilename(lip, this.layerCollection[selectedLayer]));
                                        that._currentRKIdArr.push(lip[_GMX_RasterCatalogID]);
                                    }
                                }
                            }
                        }
                    } else {
                        filenames.push(getFilename(prop, this.layerCollection[selectedLayer]));
                    }
                }
            }
            that._comboFilenames[that._selectedCombo] = filenames;

            //Показать снимок
            that._prepareRedraw();
            var selType = that._selectedType[that._selectedCombo];
            var isDefault = (selType == NDVITimelineManager.RGB_HR || selType == NDVITimelineManager.NDVI16 || selType == NDVITimelineManager.LANDSAT);

            if (isDefault || this._activatePermalink) {
                that._showRedraw();
            }
            if (!this._isQuicklook) {

                //выключаем "неопознанные" продукты
                that.deactivateUnknownRadios();

                //и включаем снимки
                this.setRadioLabelActive_grey("rgbRadio", true);
                this.setRadioLabelActive_grey("ndviRadio_modis", true);
                this.setRadioLabelActive_grey("qualityRadio", true);

                this.setRadioLabelActive_grey("conditionsOfVegetationRadio", true);

                //params = [{"name":<имя слоя>,"filename":<имя файла>, "id":<radio element id>} ]
                var params = [];
                var rk = that._combo[that._selectedCombo].rk;
                for (var i = 0; i < rk.length; i++) {
                    var rki = rk[i];
                    //пропускаем каталог RGB high resolution
                    if (this.isSentinel || !this.isSentinel && !(rki == "SENTINEL_IR" || rki == "SENTINEL_NDVI"))
                        if (!this._layersLegend[rki].viewTimeline) {
                            if (NDVITimelineManager._comboRadios[that._selectedCombo]) {

                                var filenames = [];
                                var sceneids = [];

                                for (var j = 0; j < that._comboFilenames[that._selectedCombo].length; j++) {
                                    filenames.push(NDVITimelineManager._normalizeFilename(that._comboFilenames[that._selectedCombo][j], NDVITimelineManager._rkId[rki]));
                                    sceneids.push(NDVITimelineManager._normalizeFilename(that._comboFilenames[that._selectedCombo][j], NDVITimelineManager._rkId["HR"]));
                                }

                                var name = that._layersLegend[rki].name;

                                params.push({
                                    "name": name,
                                    "filenames": filenames,
                                    "radioId": NDVITimelineManager._comboRadios[that._selectedCombo][rki]
                                });

                                //запоминаем filenames(sceneid) для снимков ndvi
                                if (rki == "HR") {
                                    that._currentFnIdArr.length = 0;
                                    that._currentFnIdArr = [];
                                    that._currentFnIdArr.push.apply(that._currentFnIdArr, filenames);
                                }
                                if (rki == "CLASSIFICATION") {
                                    that._currentClassificationFnIdArr.length = 0;
                                    that._currentClassificationFnIdArr = [];
                                    that._currentClassificationFnIdArr.push.apply(that._currentClassificationFnIdArr, sceneids);
                                }
                            }
                        }
                }

                //that._currentRKIdArr = [];
                that._setExistentProds(params, function (rkArr) {
                    for (var i in that.existentShots) {

                        if (i == "classificationRadio" && that._selectedDate >= new Date(2015, 10, 1)) {
                            continue;
                        }

                        that.setRadioLabelActive_grey(i, that.existentShots[i]);
                        that.setProductAvailability(i, that.existentShots[i]);

                        if (i == "classificationRadio") {
                            that.setRadioLabelActive_grey("inhomogenuityRadio", that.existentShots[i] && that.existentShots["ndviRadio_hr"]);
                            that.setRadioLabelActive_grey("classificationRadio", that.existentShots[i] && that.existentShots["ndviRadio_hr"]);

                            that.setProductAvailability("inhomogenuityRadio", that.existentShots[i] && that.existentShots["ndviRadio_hr"]);
                            that.setProductAvailability("classificationRadio", that.existentShots[i] && that.existentShots["ndviRadio_hr"]);

                            that._currentClassificationRKIdArr = [].concat(rkArr["classificationRadio"]);
                        }

                        if (i == "ndviRadio_hr" && that.existentShots["ndviRadio_hr"]) {
                            that.setRadioLabelActive("ndviMeanRadio", that.existentShots[i]);
                            that.setProductAvailability("ndviMeanRadio", that.existentShots[i]);
                            that.setRadioLabelActive("ratingRadio", that.existentShots[i]);
                            that.setProductAvailability("ratingRadio", that.existentShots[i]);

                            that._currentRKIdArr = [].concat(rkArr["ndviRadio_hr"]);
                        }
                    }

                    if (!isDefault) {
                        that._showRedraw();
                    }

                    if (that.lmap.getZoom() >= NDVITimelineManager.MIN_ZOOM_HR) {
                        that._themesHandler.addLayers(that._visibleLayersOnTheDisplayPtr, that._currentRKIdArr, that._currentFnIdArr);
                        that._neodnrHandler.addLayers(that._visibleLayersOnTheDisplayPtr, that._currentClassificationRKIdArr, that._currentClassificationFnIdArr);
                    }

                    if (that.isSentinel) {
                        that.setRadioLabelActive_grey("rgbRadio2", true);
                        if (!that.existentShots.rgbRadio && that._selectedOption == "SENTINEL_IR") {
                            that._selectedOption == "SENTINEL";
                            that.setActiveRadio("rgbRadio2");
                            that._showRedraw();
                        }
                    }

                    that.applyHRZoomREstriction(that.lmap.getZoom());
                });
            }
        }

        if (that._selectedPeriod) {
            var date = new Date(that._selectedDate);
            var div = that._selectedDiv;
            that.clearSelection();

            that._selectedDate0 = that.stringToDate(that._slider.getCaption0());
            if (date > that._selectedDate0) {
                that._selectedDate1 = date;
                that._slider.setActivePointer(1);
            } else {
                that._selectedDate0 = date;
                that._selectedDate1 = that.stringToDate(that._slider.getCaption1());
                that._slider.setActivePointer(0);
            }

            div.classList.add("timeline-event-selected");
            that._setSliderState(null, date);

            that.refreshSelections();
            that._hideLayers();
            that._showFIRES_POINTS();
            return;
        }

        that.selectedShotFilename = "";
        if (!(that.shiftNext || that.shiftPrev || that.shiftZero)) {
            if (selectedItems && selectedItems.length == 1 && that._combo[that._selectedCombo].resolution == "landsat") {
                that.selectedShotFilename = that.hoverShotFilename.substr(0, that.hoverShotFilename.length - 0);
            }
        } else {
            if (that.shiftZero) {
                that.selectedShotFilename = $("#ntFilenameCaption").text();
            } else {
                var files = that._comboFilenames[that._selectedCombo];
                if (files && selectedItems && selectedItems.length == 1 && that._combo[that._selectedCombo].resolution == "landsat") {
                    var fn = files[0];
                    //that.selectedShotFilename = date + " - " + fn.substr(0, fn.length - 5);
                    that._setSliderState(x.attributes.range, that._selectedDate, true);
                }
            }
        }
    }


    if (that._currentSelection && (that.shiftNext || that.shiftPrev || !that.shiftZero)) {
        that._setSliderState(x.attributes.range, that._selectedDate, true);
    }

    that.shiftZero = false;
    that.shiftNext = false;
    that.shiftPrev = false;

    //привязываем событие на случай повторного нажатия
    if (that._clickForUnselect) {
        that._clickForUnselect.off("click");
    }
    that._clickForUnselect = $(".timeline-event.timeline-event-line.timeline-event-selected");
    that._clickForUnselect.on("click", function (e) {
        if (!selectedItems) {
            that.timeLine.getTimelineController().getTimeline().setSelection([]);
            that.timeLine.shiftActiveItem(0);
            that._clickForUnselect.off("click");
        }
        selectedItems = null;
    });

    this.setTimeLineYear(this._selectedYear);

    document.getElementById("ntYear").innerHTML = that._selectedYear;

    that.extractTimelineItems();

    that.refreshSelections();
};

NDVITimelineManager.prototype.extractTimelineItems = function () {
    this.timelineItems = [];
    //сохраняю риски
    for (var s in this._currentSelection) {
        var items = this.timeLine.data.attributes.items[s];
        for (i in items) {
            var item = items[i];
            this.timelineItems.push(item);
        }
    }
};


NDVITimelineManager.prototype._setSliderState = function (range, date, async) {

    var that = this;
    var f = function () {
        var s = $(".timeline-event-selected")[0];
        if (s) {
            var b = $("#ntSliderBar")[0];
            //var bb = b.clientWidth;
            //var ss = parseFloat(s.style.left.substr(0, s.style.left.length - 2));
            //var l = ss * 100 / bb;
            l = parseFloat(s.style.left);
            that._slider.setValue(l, NDVITimelineManager.formatDate(date.getDate(),
                date.getMonth() + 1, date.getFullYear()));
        }
    };

    if (!async) {
        f();
    } else {
        setTimeout(f, 10);
    }
};

NDVITimelineManager.prototype.setRadioLabelActive = function (id, active) {
    var lbl = this._radioButtonLabels[id].label;
    var div = this._radioButtonLabels[id].parent;
    if (active) {
        lbl.classList.remove("ntDisabledLabel");
        document.getElementById(lbl.for).disabled = false;
        if (div.displayCombo)
            div.style.display = "block";
    } else {
        lbl.classList.add("ntDisabledLabel");
        document.getElementById(lbl.for).disabled = true;
        if (this._selectedCombo != 1 || (id != "ndviMeanRadio" && id != "inhomogenuityRadio")) {
            if (div.displayCombo)
                div.style.display = "none";
        }
    }
};

NDVITimelineManager.prototype.setRadioLabelActive_grey = function (id, active) {
    if (this._radioButtonLabels[id]) {
        var lbl = this._radioButtonLabels[id].label;
        var div = this._radioButtonLabels[id].parent;
        if (active) {
            lbl.classList.remove("ntDisabledLabel");
            document.getElementById(lbl.for).disabled = false;
        } else {
            lbl.classList.add("ntDisabledLabel");
            document.getElementById(lbl.for).disabled = true;
        }
    }
};

NDVITimelineManager.prototype.setProductAvailability = function (id, active) {
    this.productsAvailability[id] = active;
};

NDVITimelineManager.prototype.getProductAvailability = function (id) {
    return this.productsAvailability[id];
};

NDVITimelineManager.prototype.clearProductAvailability = function () {
    for (var i in this.productsAvailability) {
        this.productsAvailability[i] = false;
    }
    this.productsAvailability = {};
};

NDVITimelineManager.prototype.createYearsPanel = function () {
    var pan = document.getElementById("ntYearsPanel");

    for (var year = 2015; year >= 2000; year--) {
        var yearDiv = document.createElement('div');
        yearDiv.classList.add("ntYearDiv");
        pan.appendChild(yearDiv);

        var radioDiv = document.createElement('div');
        radioDiv.classList.add("ntYearRadioDiv");
        var radio = document.createElement('input');
        radio.year = year;
        radio.type = "radio";
        radio.name = "years";
        radio.id = "radioYear_" + year;
        radio.style.cursor = "pointer";
        radioDiv.appendChild(radio);
        if (year == this.defaultYear) {
            radio.checked = true;
        }
        var that = this;
        radio.onchange = function () {
            that.setVisibleYear(this.year);
        }
        yearDiv.appendChild(radioDiv);

        var labelDiv = document.createElement('div');
        labelDiv.classList.add("ntYearLabel");
        labelDiv.innerHTML = year;
        labelDiv.radioPtr = radio;
        labelDiv.onclick = function () {
            if (!this.radioPtr.disabled) {
                that.setVisibleYear(this.radioPtr.year);
                this.radioPtr.checked = true;
            }
        };
        yearDiv.appendChild(labelDiv);

        var count = document.createElement('div');
        count.classList.add("ntYearCount");
        count.innerHTML = "(0)";
        yearDiv.appendChild(count);

        this._yearsPanel[year] = { "radio": radio, "caption": labelDiv, "count": count };
    }
};

NDVITimelineManager.prototype.setFilenameCaption = function (caption) {
    //document.getElementById("ntFilenameCaption").innerHTML = caption;
};

NDVITimelineManager.formatDate = function (d, m, y) {
    return NDVITimelineManager.strpad(d.toString(), 2) + '.' +
        NDVITimelineManager.strpad(m.toString(), 2) + '.' +
        NDVITimelineManager.strpad(y.toString(), 4);
}

NDVITimelineManager.strpad = function (str, len) {
    if (typeof (len) == "undefined") { var len = 0; }
    if (len + 1 >= str.length) {
        str = Array(len + 1 - str.length).join("0") + str;
    }
    return str;
};

NDVITimelineManager.prototype.showLoadingSmall = function () {
    document.getElementById("ntLoading").style.display = "block";
    var that = this;
    setTimeout(function () {
        that.hideLoadingSmall();
    }, 3000);
};

NDVITimelineManager.prototype.hideLoadingSmall = function () {
    document.getElementById("ntLoading").style.display = "none";
};

NDVITimelineManager.equalDates = function (d1, d2) {
    return d1.getDate() == d2.getDate() && d1.getMonth() == d2.getMonth() && d1.getFullYear() == d2.getFullYear();
};

NDVITimelineManager.prototype.stringToDate = function (str) {
    var a = str.split('.');
    return (a.length == 3 ? new Date(parseInt(a[2]), parseInt(a[1]) - 1, parseInt(a[0])) : new Date(this._selectedYear));
};

NDVITimelineManager.prototype.initSlider = function () {
    var that = this;

    var tl = this.timeLine.getTimelineController().getTimeline();

    var _moved = false;

    //прикручиваем слайдер снимков
    this._slider = new NDVITimelineSlider("ntShotsSlider", {
        "onmouseup": function (e) {
            if (that._selectedPeriod) {

                if (!_moved) {
                    if (that._selectedDate0) {
                        that.unselectPeriod();
                    } else {
                        that.selectPeriod(this, e.bag.sortedItems);
                    }
                }

            } else {
                if (!_moved && that.selectedDiv) {
                    tl.setSelection([]);
                    that.timeLine.shiftActiveItem(0);
                    e.bag.currIndex = -1;
                    return;
                }

                if (e.bag.currIndex != -1) {
                    that.shiftZero = true;
                    tl.setSelection([{ "row": e.bag.currIndex }]);
                    that.timeLine.shiftActiveItem(0);
                    that.setTimeLineYear(that._selectedYear);

                    var range = tl.getVisibleChartRange();
                    that._setSliderState(range, that._selectedDate);
                } else {
                    var items = e.bag.sortedItems;
                    var range = tl.getVisibleChartRange();
                    var size = document.getElementById("ntSliderBar").clientWidth;
                    var offset = this.getOffsetLeft();
                    var daysRange = 365;//(range.end - range.start) / (1000 * 60 * 60 * 24) - NDVITimelineManager.SLIDER_EPSILON;
                    var daysFrom = daysRange * offset / size;;//Math.round(daysRange * e.state / 100.0);
                    var slideDate = new Date(range.start.getTime() + 86400000 * daysFrom);
                    var minDelta = 100000000000000;
                    var curr_i;
                    for (var i = 0; i < items.length; i++) {
                        var ii = items[i];
                        var iiDate = new Date(ii.center);
                        var deltaTime = Math.abs(iiDate.getTime() - slideDate.getTime());
                        if (deltaTime <= minDelta) {
                            curr_i = i;
                            minDelta = deltaTime;
                        }
                    }

                    var tItem = items[curr_i];
                    if (!tItem) {
                        tItem = items[items.length - 1];
                    }
                    e.bag.currIndex = tl.getItemIndex(tItem.dom);

                    that.shiftZero = true;
                    tl.setSelection([{ "row": e.bag.currIndex }]);
                    that.timeLine.shiftActiveItem(0);
                    that.setTimeLineYear(that._selectedYear);

                    that._setSliderState(range, that._selectedDate);
                }
            }
        },
        "onmove": function (e, caption) {

            _moved = true;

            var range = tl.getVisibleChartRange();

            var size = document.getElementById("ntSliderBar").clientWidth;
            var offset = this.getOffsetLeft(e.pointerIndex);

            var daysRange = 365;

            var daysFrom = daysRange * offset / size;

            var slideDate = new Date(range.start.getTime() + 86400000 * daysFrom);
            caption.innerHTML = NDVITimelineManager.formatDate(slideDate.getDate(), slideDate.getMonth() + 1, slideDate.getFullYear());

            if (that._selectedPeriod) {
                that.selectPeriod(this, e.bag.sortedItems);
            } else {

                var curr_i;
                var notFound = true;
                var items = e.bag.sortedItems;
                for (var i = 0; i < items.length; i++) {
                    var ii = items[i];
                    var iiDate = new Date(ii.center);
                    ii.dom.classList.remove("timeline-event-selected");

                    if (notFound) {
                        if (iiDate <= slideDate || NDVITimelineManager.equalDates(iiDate, slideDate)) {
                            curr_i = i;
                            notFound = false;
                        }
                    }
                }

                if (notFound) {
                    curr_i = items.length - 1;
                    notFound = false;
                }

                //значит нашли ближайший левый
                if (items[curr_i - 1]) {
                    //проверяем который ближе, того делаем curr_i
                    var rCounter = 1;
                    var lItem = items[curr_i];
                    var rItem = items[curr_i - rCounter];
                    while (items[curr_i - rCounter] && rItem.center == lItem.center) {
                        rCounter++;
                        rItem = items[curr_i - rCounter];
                    }

                    var rItemDate = new Date(rItem.center),
                        lItemDate = new Date(lItem.center);
                    if (rItem.dom && rItemDate <= new Date(that._selectedYear, 11, 31)/*range.end*/ && lItem.dom && lItemDate >= range.start) {
                        var r = slideDate - rItemDate,
                            l = lItemDate - slideDate;
                        if (r > l) {
                            curr_i -= rCounter;
                        }
                    }
                }

                e.bag.currIndex = -1;
                if (!notFound) {
                    //зажигаем рисочку
                    var tItem = items[curr_i];
                    if (tItem && tItem.dom && new Date(tItem.center) >= range.start) {
                        e.bag.currIndex = tl.getItemIndex(tItem.dom);
                        tItem.dom.classList.add("timeline-event-selected");
                    }

                    //показываем название снимка в заголовке только для landsat
                    if (that._combo[that._selectedCombo].resolution == "landsat"/*that._selectedCombo == 1*/) {
                        var tItemDate = shared.dateToString(new Date(tItem.center));
                        var timelineItems = that.timeLine.data.attributes.items[that._comboAsLayers[that._selectedCombo][1]];
                        var filenames = [];
                        var dates = [];
                        var chkQl = document.getElementById("chkQl").checked;
                        for (var ii in timelineItems) {
                            var item = timelineItems[ii];
                            var date = item.obj.properties['ACQDATE'];
                            if (tItemDate === date && (chkQl || !chkQl && item.obj.properties.GMX_RasterCatalogID.length) &&
                                NDVITimelineManager.isPointInGeometry(item.obj.geometry, { "x": gmxAPI.map.getX(), "y": gmxAPI.map.getY() })) {
                                var prop = item.obj.properties;
                                filenames.push(prop["sceneid"] || prop["SCENEID"]);
                                dates.push(date);
                            }
                        }

                        var str = "";
                        for (var j = 0; j < filenames.length; j++) {
                            str += filenames[j] + ", ";
                        }
                        str = str.substring(0, str.length - 2);
                        that.setFilenameCaption(dates[dates.length - 1] + " - " + str);
                    }
                }
            }
        },
        "onclick": function (e) {

            _moved = false;

            var range = tl.getVisibleChartRange();
            var sortedItems = [];
            for (var i = 0; i < tl.items.length; i++) {
                var item = tl.items[i];
                var itemDate = new Date(item.center);
                if (item.dom && itemDate >= range.start && itemDate <= range.end) {
                    sortedItems.push({ "center": item.center, "dom": item.dom });
                }
            }

            sortedItems.sort(function (a, b) {
                return b.center - a.center;
            });

            e.bag.sortedItems = sortedItems;
            e.bag.currIndex = -1;
        }
    }, this.lmap);

    $(".timeline-axis").parent().on("click", function () {
        if (that._selectedPeriod) {
            if (that._selectedDate0) {
                that.unselectPeriod();
            }
        }
    });
};

NDVITimelineManager.prototype.unselectPeriod = function () {
    this._selectedDate0 = null;
    this._selectedDate1 = null;
    this._hideLayers();
};


NDVITimelineManager.prototype.refreshSliderPeriod = function () {

    //Это непонтяный баг, почему то надо дважды очищать включенные слои.
    for (var b = 0; b < 2; b++) {
        this.unselectPeriod();

        var tl = this.timeLine.getTimelineController().getTimeline();
        var range = tl.getVisibleChartRange();
        var sortedItems = [];
        for (var i = 0; i < tl.items.length; i++) {
            var item = tl.items[i];
            var itemDate = new Date(item.center);
            if (item.dom && itemDate >= range.start && itemDate <= range.end) {
                sortedItems.push({ "center": item.center, "dom": item.dom });
            }
        }

        sortedItems.sort(function (a, b) {
            return b.center - a.center;
        });

        this.selectPeriod(this._slider, sortedItems);
    }
};

NDVITimelineManager.prototype.selectPeriod = function (slider, items) {
    this._selectedDate0 = this.stringToDate(slider.getCaption0());
    this._selectedDate1 = this.stringToDate(slider.getCaption1());
    this._selectedType[this._selectedCombo] = NDVITimelineManager.FIRES_POINTS;
    this._showFIRES_POINTS();
    this.selectPeriodItems(this._selectedDate0, this._selectedDate1, items);
};

NDVITimelineManager.prototype.selectPeriodItems = function (date0, date1, items) {
    for (var i = 0; i < items.length; i++) {
        var ii = items[i];
        var iiDate = new Date(ii.center);
        if (iiDate >= date0 && iiDate <= date1) {
            ii.dom.classList.add("timeline-event-selected");
        } else {
            ii.dom.classList.remove("timeline-event-selected");
        }
    }
};

NDVITimelineManager.prototype.initTimelineFooter = function () {

    var that = this;

    var getComboRadios = function () {

        return '<select id="ntComboBox">' +
        '<option value="' + 1 + '">' + this._combo[1].caption + '</option>' +
        '<option value="' + 0 + '">' + this._combo[0].caption + '</option>' +
        '<option value="' + 2 + '">' + this._combo[2].caption + '</option>' +
        ((this._combo[3] && '<option value="' + 3 + '">' + this._combo[3].caption + '</option>') || "") +
        ((this._combo[4] && '<option value="' + 4 + '" selected>' + this._combo[4].caption + '</option>') || "") +
        ((this._combo[5] && '<option value="' + 5 + '">' + this._combo[5].caption + '</option>') || "") +
        ((this._combo[6] && '<option value="' + 6 + '">' + this._combo[6].caption + '</option>') || "") +
        '</select>';
    }

    var htmlTxt = '<div class="ntFooter">' +
        '<div class="ntLeftPanel">' +
        '</div>' +
                getComboRadios.call(this) +
        '<div class="ntRightPanel" id="ntRightPanel">' +
        '<div class="ntOptionsFieldset">' +
        '<div id="fsComboOptions"></div>' +
        '</div>' +
        '</div>' +
        '</div>';


    this.loadingDiv = '<div id="ntLoading">Загрузка...</div>';

    this.timeLine.getFooterContainer().html(htmlTxt + this.loadingDiv);

    this.zoomRestrictionLabel = document.createElement("div");
    this.zoomRestrictionLabel.id = "ntZoomRestrictionLabel";
    this.zoomRestrictionLabel.innerHTML = "Приблизьте карту для доступа к опциям";
    this.zoomRestrictionLabel.style.display = "none";
    this.timeLine.getFooterContainer()[0].appendChild(this.zoomRestrictionLabel);

    this.radioActiveLabels = document.createElement("div");
    this.radioActiveLabels.id = "ntRadioActiveLabels";
    this.radioActiveLabels.innerHTML = "Для активации опций, наведите карту на контуры полей";
    this.radioActiveLabels.style.display = "none";
    this.timeLine.getFooterContainer()[0].appendChild(this.radioActiveLabels);

    this.meanNdviNoDataLabel = document.createElement("div");
    this.meanNdviNoDataLabel.id = "ntMeanNdviNoDataLabel";
    this.meanNdviNoDataLabel.innerHTML = NDVITimelineManager.MEANNDVI_NODATA_ERROR;
    this.meanNdviNoDataLabel.style.display = "none";
    this.timeLine.getFooterContainer()[0].appendChild(this.meanNdviNoDataLabel);

    document.getElementById("ntComboBox").ontouchstart = function (e) {
        e.stopPropagation();
    };

    document.getElementById("ntComboBox").onchange = function (e) {

        e.stopPropagation();

        var index = parseInt(this.value);
        that.setTimelineCombo(index);
    };

    var visQl = '<div><div id="qlVis" style="float:left;display: block;"></div></div>';

    var filenameCaption = '<div id="ntFilenameCaption"></div>';
    var datelineHtml = '<div class="ntDatesLine">' +
          '<div id="ntYearsScrollPanel"><div id="ntYearsPanel"></div></div>' +
        '</div>';
    var shotsSlider = '<div id=ntSliderBar><div id="ntShotsSlider" style="width:100%; height:100%;"></div></div>';

    this.timeLine.getHeaderContainer().html(filenameCaption + visQl + shotsSlider);

    var tl = this.timeLine.getTimelineController().getTimeline();

    this.initSlider();

    var panels = this.createOptionsPanel();

    this.addRadio("secondPanel_1", "NDVI", "shotsOptions", "ndviRadio_hr", 1, false, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.NDVI_HR;
        that._redrawShots();
    }, true);

    this.addRadio("firstPanel_0", "Композит NDVI", "shotsOptions", "ndviRadio_modis", 0, false, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.NDVI16;
        that._redrawShots();
    }, false, true);

    this.addRadio("secondPanel_1", "NDVI - среднее", "shotsOptions", "ndviMeanRadio", 1, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.NDVI_MEAN;
        that._redrawShots();
    }, true);

    this.addRadio("thirdPanel_1", "Рейтинг", "shotsOptions", "ratingRadio", 1, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.RATING;
        that._redrawShots();
    }, true);

    //this.addRadio("thirdPanel_1", "Состояние полей", "shotsOptions", "classificationRadio", 1, true, function (r) {
    //    that._selectedType[that._selectedCombo] = NDVITimelineManager.CLASSIFICATION;
    //    that._redrawShots();
    //}, true);

    this.addRadio("thirdPanel_1", "Однородность", "shotsOptions", "inhomogenuityRadio", 1, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.INHOMOGENUITY;
        that._redrawShots();
    }, true);

    this.addRadio("firstPanel_0", "Оценка качества", "shotsOptions", "qualityRadio", 0, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.QUALITY16;
        that._redrawShots();
    });

    this.addRadio("secondPanel_0", "Условия вегетации", "shotsOptions", "conditionsOfVegetationRadio", 0, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.CONDITIONS_OF_VEGETATION;
        that._redrawShots();
    });

    this.addRadio("firstPanel_1", "Снимок-ИК", "shotsOptions", "rgbRadio", 1, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.RGB_HR;
        that._redrawShots();
    }, false, true);

    this.addRadio("firstPanel_1", "Снимок", "shotsOptions", "rgbRadio2", 1, true, function (r) {
        that._selectedType[that._selectedCombo] = NDVITimelineManager.RGB2_HR;
        that._redrawShots();
    });

    for (var k = 2; k < this._combo.length; k++) {
        if (this._combo[k].rk[0] == "FIRES") {
            this.addRadio("firstPanel_" + k, "Термоточки", "shotsOptions", "firesPoints", k, true, function (r) {
                that._selectedType[that._selectedCombo] = NDVITimelineManager.FIRES_POINTS;
                that._redrawShots();
            }, false, true);
        } else if (this._combo[k].rk[0] == "LANDSAT") {
            this._selectedType[k] = NDVITimelineManager.LANDSAT;
        } else if (this._combo[k].rk[0] == "SENTINEL") {
            that._selectedType[k] = NDVITimelineManager.RGB_HR;
        } else if (this._combo[k].rk[0] == "MODIS143") {
            that._selectedType[k] = NDVITimelineManager.NDVI16;
            this.addRadio("firstPanel_" + k, "MODIS 1-4-3", "shotsOptions", "modis143", k, true, function (r) {
                that._selectedType[that._selectedCombo] = NDVITimelineManager.FIRES_POINTS;
                that._redrawShots();
            }, false, true);
        } else if (this._combo[k].rk[0] == "EVERYDAY250") {
            that._selectedType[k] = NDVITimelineManager.NDVI16;
            this.addRadio("firstPanel_" + k, "Композит NDVI", "shotsOptions", "ndviRadio_modis", k, false, function (r) {
                that._selectedType[that._selectedCombo] = NDVITimelineManager.NDVI16;
                that._redrawShots();
            }, false, true);

            this.addRadio("firstPanel_" + k, "Оценка качества", "shotsOptions", "qualityRadio", k, true, function (r) {
                that._selectedType[that._selectedCombo] = NDVITimelineManager.QUALITY16;
                that._redrawShots();
            });
        } else if (this._combo[k].rk[0] == "TERRA_NDVI" || this._combo[k].rk[0] == "AQUA_NDVI") {
            that._selectedType[k] = NDVITimelineManager.NDVI16;
            this.addRadio("firstPanel_" + k, "Композит NDVI", "shotsOptions", "ndviRadio_modis", k, false, function (r) {
                that._selectedType[that._selectedCombo] = NDVITimelineManager.NDVI16;
                that._redrawShots();
            }, false, true);

            this.addRadio("firstPanel_" + k, "Оценка качества", "shotsOptions", "qualityRadio", k, true, function (r) {
                that._selectedType[that._selectedCombo] = NDVITimelineManager.QUALITY16;
                that._redrawShots();
            });
        }
    }

    //if (this._combo[2] && this._combo[2].rk[0] == "FIRES") {
    //    this.addRadio("firstPanel_2", "Термоточки", "shotsOptions", "firesPoints", 2, true, function (r) {
    //        that._selectedType[that._selectedCombo] = NDVITimelineManager.FIRES_POINTS;
    //        that._redrawShots();
    //    }, false, true);
    //}

    //if (this._combo[3] && this._combo[3].rk[0] == "LANDSAT") {
    //    that._selectedType[3] = NDVITimelineManager.LANDSAT;
    //}

    //if (this._combo[4] && this._combo[4].rk[0] == "SENTINEL") {
    //    that._selectedType[4] = NDVITimelineManager.RGB_HR;
    //}

    for (var i = 0; i < this._combo.length; i++) {
        document.getElementById("optionsPanel_" + i).style.display = (i == this._selectedCombo ? "block" : "none");
    }

    this.refreshTimeline();

    //добавим фон на циферблат
    $(".timeline-frame").prepend('<div class="ntTimelineBackground"><div class="ntTimelineColor"></div></div>');

    //переключатель годов
    $(this.timeLine.getContainer()).append('<div id="ntYearChanger"><div id="ntYearUp"></div><div id="ntYear">' + this._selectedYear +
        '</div><div id="ntYearDown"></div></div>');

    this.setVisibleYear(this._selectedYear);

    var yearUp = function () {
        var yearDiv = document.getElementById("ntYear");
        var year = parseInt(yearDiv.innerHTML) + 1;
        if (year <= new Date().getFullYear()) {
            yearDiv.innerHTML = year;
            var sDate = that._slider.getCaption();
            sDate.length && that._slider.setCaption(sDate.substr(0, sDate.length - 4) + year);
            that.setVisibleYear(year);
            that._updateFiresSelection(false);
        }
    };

    var yearDown = function () {
        var yearDiv = document.getElementById("ntYear");
        var year = parseInt(yearDiv.innerHTML) - 1;
        yearDiv.innerHTML = year;
        var sDate = that._slider.getCaption();
        sDate.length && that._slider.setCaption(sDate.substr(0, sDate.length - 4) + year);
        that.setVisibleYear(year);
        that._updateFiresSelection(false);
    };

    shared.disableHTMLSelection("#ntYearUp");
    shared.disableHTMLSelection("#ntYearDown");

    document.getElementById("ntYearUp").onclick = function () {
        yearUp();
    };

    if (!shared.isTablet()) {
        document.getElementById("ntYearUp").onmouseover = function () {
            this.classList.add("ntYearUp_hover");
        };

        document.getElementById("ntYearUp").onmouseleave = function () {
            this.classList.remove("ntYearUp_hover");
        };
    } else {
        document.getElementById("ntYearUp").ontouchend = function () {
            this.classList.remove("ntYearUp_hover");
        };

        document.getElementById("ntYearUp").ontouchstart = function (e) {
            this.classList.add("ntYearUp_hover");
            e.preventDefault();
            yearUp();
        };
    }

    document.getElementById("ntYearDown").onclick = function () {
        yearDown();
    };

    if (!shared.isTablet()) {
        document.getElementById("ntYearDown").onmouseover = function () {
            this.classList.add("ntYearDown_hover");
        };

        document.getElementById("ntYearDown").onmouseleave = function () {
            this.classList.remove("ntYearDown_hover");
        };
    } else {
        document.getElementById("ntYearDown").ontouchend = function () {
            this.classList.remove("ntYearDown_hover");
        };

        document.getElementById("ntYearDown").ontouchstart = function (e) {
            this.classList.add("ntYearDown_hover");
            e.preventDefault();
            yearDown();
        };
    }


    //переключатель снимков
    $(this.timeLine.getContainer()).append('<div class="ntShotsChanger"></div>');

    $(".ntShotsChanger").append(
        '<div style="float:left; margin-top: 4px;">' +
        '<div id="ntPrevYear" class="ntYearSwitcher"></div>' +
        '<div id="ntNextYear" class="ntYearSwitcher"></div>' +
        '</div>');

    function switchShot(dir) {
        that._switchYearCallback = that._switchYear;
        that.shiftPrev = true;

        if (that.selectedDiv && that._selectedDate.getFullYear() == that._selectedYear) {

            var tl = that.timeLine.getTimelineController().getTimeline();
            var rangeStart = new Date(that._selectedYear - 1, 0, 1),
                rangeEnd = new Date(that._selectedYear + 1, 11, 31);
            var datesCounter = 0;
            //снимки в одной дате(в одной риске)
            var itemsArr = [];
            //смотрим сколько снимков за одну дату, а заодно ближайшую слева и справа ищем дату
            var minPlus = 99999999999999;
            var minMinus = -99999999999999;
            var t = that._selectedDate.getTime();
            var minItemMinus,
                minItemPlus;
            for (var i = 0; i < tl.items.length; i++) {
                var item = tl.items[i];
                var itemDate = new Date(item.center);
                if (item.dom && itemDate >= rangeStart && itemDate <= rangeEnd) {
                    if (NDVITimelineManager.equalDates(that._selectedDate, itemDate)) {
                        datesCounter++;
                        itemsArr.push(item);
                    } else {
                        var it = itemDate.getTime();
                        var dit = t - it;
                        if (dit < minPlus && dit > 0) {
                            minPlus = dit;
                            minItemPlus = item;
                        }
                        if (dit > minMinus && dit < 0) {
                            minMinus = dit;
                            minItemMinus = item;
                        }
                    }
                }
            }

            var index = null;
            var date;
            if (dir == 1) {
                if (minItemMinus && minItemMinus.dom) {
                    index = tl.getItemIndex(minItemMinus.dom);
                    date = new Date(minItemMinus.center);
                }
            } else {
                if (minItemPlus && minItemPlus.dom) {
                    index = tl.getItemIndex(minItemPlus.dom);
                    date = new Date(minItemPlus.center);
                }
            }

            if (index != null) {
                $(".timeline-event.timeline-event-line").removeClass("timeline-event-selected");
                tl.setSelection([{ "row": index }]);
                that.setTimeLineYear(that._selectedYear);
                that._setSliderState(tl.getVisibleChartRange(), date, true);
                setTimeout(function () {
                    that.timeLine.shiftActiveItem(0);
                    that.setTimeLineYear(that._selectedYear);
                }, 50);
            }

        } else {
            that.shiftFromEmpty(dir);
        }
    };

    shared.disableHTMLSelection("#ntPrevYear");

    shared.disableHTMLSelection("#ntNextYear");

    var _lock = false;

    document.getElementById("ntPrevYear").onclick = function () {
        if (!_lock) {
            _lock = true;
            switchShot(-1);
            setTimeout(function () {
                _lock = false;
            }, 100);
        }
    };

    if (!shared.isTablet()) {
        document.getElementById("ntPrevYear").onmouseover = function () {
            this.classList.add("ntPrevYear_hover");
        };

        document.getElementById("ntPrevYear").onmouseleave = function () {
            this.classList.remove("ntPrevYear_hover");
        };
    } else {
        document.getElementById("ntPrevYear").ontouchend = function () {
            this.classList.remove("ntPrevYear_hover");
        };

        document.getElementById("ntPrevYear").ontouchstart = function (e) {
            this.classList.add("ntPrevYear_hover");
            e.preventDefault();
            switchShot(-1);
        };
    }

    document.getElementById("ntNextYear").onclick = function () {
        if (!_lock) {
            _lock = true;
            switchShot(1);
            setTimeout(function () {
                _lock = false;
            }, 100);
        }
    };

    if (!shared.isTablet()) {
        document.getElementById("ntNextYear").onmouseover = function () {
            this.classList.add("ntNextYear_hover");
        };

        document.getElementById("ntNextYear").onmouseleave = function () {
            this.classList.remove("ntNextYear_hover");
        };
    } else {
        document.getElementById("ntNextYear").ontouchend = function () {
            this.classList.remove("ntNextYear_hover");
        };

        document.getElementById("ntNextYear").ontouchstart = function (e) {
            this.classList.add("ntNextYear_hover");
            e.preventDefault();
            switchShot(1);
        };
    }

    //выключим гомогенность на время
    NDVITimelineManager.disableHomogenuity();

    var items =
    [{
        "id": "chkVciType",
        "type": "checkbox",
        "class": "ntOptionsMODIS",
        "text": "Условия вегетации по маске с\х угодий",
        "click": function (e) {
            if (document.getElementById("conditionsOfVegetationRadio").checked) {
                that._redrawShots();
            }
        }
    }, {
        "id": "chkQl",
        "class": "ntOptionsHR",
        "type": "checkbox",
        "text": "Показать превью облачных снимков (облачность>50%)",
        "click": function (e) {
            that.qlCheckClick(e);
        }
    }, {
        "id": "setDoubleSlide",
        "type": "checkbox",
        "text": "Включить выборку данных за период",
        "lineId": "ntPeriodSelectOption",
        "click": function (e) {
            if (e.checked) {
                $(".ntYearSwitcher").css("display", "none");
            } else {
                $(".ntYearSwitcher").css("display", "block");
            }
            that._selectedPeriod = e.checked;
            that.clearSelection();
            that._hideLayers();
            that._slider.setPeriodSelector(e.checked);
        }
    }, {
        "id": "cloudMask",
        "class": "ntOptionsHR",
        "type": "checkbox",
        "text": "Маска облачности и теней",
        "click": function (e) {
            that._useCloudMask = e.checked;
            if (e.checked) {
                that.showCloudMask(that._selectedDate);
            } else {
                that.hideCloudMask(true);
                if (that._cutOff && (that._selectedOption === "SENTINEL_NDVI" || that._selectedOption === "HR")) {
                    that._redrawShots();
                }
            }
        }
    }];


    if (!this._userRole) {
        items.push({
            "id": "chkCut",
            "class": "ntOptionsHR",
            "type": "checkbox",
            "text": "Обрезать по маске полей",
            "click": function (e) {
                that.setCutOff(e);
            }
        });
    }

    this.optionsMenu = new OptionsMenu("qlVis", {
        "items": items
    });

    document.getElementById("ntPeriodSelectOption").style.display = "none";

    //if (document.getElementById("cloudMask")) {
    document.getElementById("cloudMask").checked = false;
    this._useCloudMask = false;
    //}

    if (document.getElementById("chkCut")) {
        document.getElementById("chkCut").checked = true;
    }

    if (this.disableOptions) {
        document.getElementById("qlVis").style.display = "none";
    }

    $(document).click(function (event) {
        if (!$(event.target).closest('.ntOptionsMenu').length) {
            if ($('.ntOptionsMenu').is(":visible")) {
                that.optionsMenu.hide();
            }
        }
    });
};

NDVITimelineManager.prototype.showCloudMask = function (date) {

    var that = this;

    function showCloudLayer(layer, cutOff) {
        layer.removeFilter();

        if (cutOff) {
            that.setCloudMaskRenderHook(layer, NDVITimelineManager.cloudMaskKr_hook, NDVITimelineManager.l_hook);
        } else {
            //that.sentinelCloudMask.removeRenderHook(NDVITimelineManager.cloudMaskKr_hook);
            //that.landsatCloudMask.removeRenderHook(NDVITimelineManager.cloudMaskKr_hook);
            //NDVITimelineManager.cloudMaksTolesBG = {};
            //that.redrawSelectedLayers();
        }

        var dateCn = "acqdate";
        var dateId = layer._gmx.tileAttributeIndexes[dateCn];

        layer.setFilter(function (item) {
            var p = item.properties;
            if (p[dateId] == that._selectedDateL) {
                return true;
            }
            return false;
        })
        .on('doneDraw', function () {
            ndviTimelineManager.repaintAllVisibleLayers();
        })
        .setDateInterval(
                NDVITimelineManager.addDays(that._selectedDate, -1),
                NDVITimelineManager.addDays(that._selectedDate, 1)
            );
        layer.setZIndex(1);
        that.lmap.addLayer(layer);
    };

    if (this._useCloudMask && this._selectedDiv) {
        if (this._selectedOption === "SENTINEL_NDVI") {
            showCloudLayer(this.sentinelCloudMask, this._cutOff);
        } else if (this._selectedOption === "RGB" || this._selectedOption === "RGB2") {
            showCloudLayer(this.landsatCloudMask);
        } else if (this._selectedOption === "SENTINEL" || this._selectedOption === "SENTINEL_IR") {
            showCloudLayer(this.sentinelCloudMask);
        } else if (this._selectedOption === "HR") {
            showCloudLayer(this.landsatCloudMask, this._cutOff);
        }
    }
};

NDVITimelineManager.prototype.hideCloudMask = function (force) {
    if (!this.selectedDiv || force) {
        this.lmap.removeLayer(this.landsatCloudMask);
        this.lmap.removeLayer(this.sentinelCloudMask);

        this.sentinelCloudMask.removeRenderHook(NDVITimelineManager.cloudMaskKr_hook);
        this.landsatCloudMask.removeRenderHook(NDVITimelineManager.cloudMaskKr_hook);
        NDVITimelineManager.cloudMaskTolesBG = {};
    }
};

NDVITimelineManager.prototype.setTimelineCombo = function (index) {

    $("#ntComboBox > option").each(function (e, x) {
        (x.value == index && (x.selected = true));
    });

    that = this;
    that.selectedShotFilename = "";
    that.setFilenameCaption("");

    var timelineMode = that._layersLegend[that._combo[index].rk[0]].timelineMode || "center";

    that.timeLine.setTimelineMode(timelineMode);

    //при переключении сбрасываем опции в ndvi
    that._selectedType[0] = NDVITimelineManager.NDVI16;
    that._selectedType[1] = NDVITimelineManager.RGB_HR;

    document.getElementById("rgbRadio").checked = true;
    document.getElementById("ndviRadio_modis").checked = true;

    document.getElementById("optionsPanel_" + that._selectedCombo).style.display = "none";

    that._selectedCombo = index;
    document.getElementById("optionsPanel_" + index).style.display = "block";
    that.bindTimelineCombo(index);

    that.refreshTimeline();
    that._hideLayers();
    that.setRadioLabelActive("ndviMeanRadio", false);
    that.setRadioLabelActive("ratingRadio", false);

    that.setDatesStickHoverCallback();

    that.selectedDiv = null;
    that._currentZoom = that.lmap.getZoom();
    that.applyZoomRestriction(that._currentZoom);

    //выключим гомогенность на время
    if (index) {
        NDVITimelineManager.disableHomogenuity();
    }

    //выключаем "неопознанные" продукты
    that.deactivateUnknownRadios();

    //выключеам кнопки
    that.setRadioLabelActive_grey("rgbRadio", false);
    that.setRadioLabelActive_grey("ndviRadio_modis", false);
    that.setRadioLabelActive_grey("conditionsOfVegetationRadio", false);

    NDVITimelineManager.fires_ht = {};
    that.timeLine.updateFilters();

    if (!that._firstTimeCombo[index]) {
        that.showLoadingSmall();
    }

    //снимаем выделение
    that._dontTouchEmptyClick = true;
    that.clearSelection();
    that._dontTouchEmptyClick = false;

    that.startFinishLoading();

    document.getElementById("ntRightPanel").scrollLeft = 0;

    that.resetFireOption();

    that.refreshOptionsDisplay();
};

NDVITimelineManager.prototype.resetFireOption = function () {
    if (this._combo[this._selectedCombo].rk[0] != "FIRES") {
        $(".ntYearSwitcher").css("display", "block");
        document.getElementById("ntPeriodSelectOption").style.display = "none";
        this._slider.setPeriodSelector(false);
        this._hideLayers();
        this._slider.setActivePointer(-1);
        this._selectedDate0 = null;
        this._selectedDate1 = null;
        this._selectedPeriod = false;
        if (this._combo[this._selectedCombo].rk[0] == "HR") {
            $(".ntOptionsHR").css("display", "block");
        } else {
            $(".ntOptionsHR").css("display", "none");
            $(".ntOptionsMODIS").css("display", "block");
        }
    } else {
        $(".ntOptionsMODIS").css("display", "none");
        $(".ntOptionsHR").css("display", "none");
        $(".ntYearSwitcher").css("display", "none");
        document.getElementById("setDoubleSlide").checked = true;
        document.getElementById("ntPeriodSelectOption").style.display = "block";
        this._selectedDate0 = this._selectedDate0 || new Date(this._selectedYear, 0, 1);
        this._selectedDate1 = this._selectedDate1 || new Date(this._selectedYear, 11, 31);
        this._selectedPeriod = true;

        this._slider.setPeriodSelector(true);

        this._slider.setActivePointer(1);
        var c = this._slider.getContainer();
        this._slider.setValue(c.clientWidth - 2, NDVITimelineManager.formatDate(this._selectedDate1.getDate(),
            this._selectedDate1.getMonth() + 1, this._selectedDate1.getFullYear()));

        this._slider.setActivePointer(0);
        this._slider.setValue(0, NDVITimelineManager.formatDate(this._selectedDate0.getDate(),
            this._selectedDate0.getMonth() + 1, this._selectedDate0.getFullYear()));

        this.refreshSelections();
        var that = this;
        that._hideLayers();
        that._showFIRES_POINTS();
        //вот тут тоже странный баг надо дважды включить и выключить слой.
        that._hideLayers();
        that._showFIRES_POINTS();
    }
};

NDVITimelineManager.prototype._updateFiresSelection = function (forced) {

    var d = this._slider.getCaption0();
    d = d.split(".");
    this._slider.setCaption0(d[0] + "." + d[1] + "." + this._selectedYear);

    d = this._slider.getCaption1();
    d = d.split(".");
    this._slider.setCaption1(d[0] + "." + d[1] + "." + this._selectedYear);

    if (this._selectedPeriod && this._selectedDate0 && this._selectedDate0 || forced) {
        this._selectedDate0 = new Date(this._selectedYear, this._selectedDate0.getMonth(), this._selectedDate0.getDate());
        this._selectedDate1 = new Date(this._selectedYear, this._selectedDate1.getMonth(), this._selectedDate1.getDate());

        this.refreshSelections();
        this._hideLayers();
        this._showFIRES_POINTS();
    }
};

NDVITimelineManager.prototype.clearSelection = function () {
    //this.onChangeSelection({ changed: { selection: {} } });
    this.timeLine.getTimelineController().getTimeline().setSelection([]);
    this.timeLine.shiftActiveItem(0);
};

NDVITimelineManager.prototype.setCutOff = function (e) {
    this._cutOff = e.checked;
    if (this.selectedDiv) {
        if (!e.checked) {
            this.hideCloudMask(true);
            this.clearRenderHook();
        }
        this._prepareRedraw();
        this._showRedraw();
    }

    this.applyHRZoomREstriction(this.lmap.getZoom());
};

NDVITimelineManager.prototype.setActiveRadio = function (radioId) {
    if (NDVITimelineManager.radioProduct[radioId]) {
        var prod = NDVITimelineManager.radioProduct[radioId].prodId;
        var selectedCombo = NDVITimelineManager.radioProduct[radioId].numCombo;
        this._selectedType[selectedCombo] = prod;
        document.getElementById(radioId).checked = true;
    }
};

NDVITimelineManager.prototype.qlCheckClick = function (e, data) {

    NDVITimelineManager.fires_ht = {};
    this.timeLine.updateFilters();

    NDVITimelineManager.fires_ht = {};
    this.timeLine.updateFilters();

    if (this.selectedDiv) {
        this._showRedraw();
    }

    //запуск из пермалинка
    if (data) {
        var tl = this.timeLine.getTimelineController().getTimeline();
        var currItem = null;
        for (var i = 0; i < tl.items.length; i++) {
            var item = tl.items[i];
            var itemDate = new Date(item.center);

            if (itemDate.getDate() == this._selectedDate.getDate() &&
                itemDate.getFullYear() == this._selectedDate.getFullYear() &&
                itemDate.getMonth() == this._selectedDate.getMonth()) {
                currItem = item;
                break;

            }
        }

        tl.setSelection([{ "row": tl.getItemIndex(currItem.dom) }]);
        this.timeLine.shiftActiveItem(0);
        this.setTimeLineYear(this._selectedYear);
    }
};

NDVITimelineManager.prototype.shiftFromEmpty = function (dir) {
    var tl = this.timeLine.getTimelineController().getTimeline();
    var range = tl.getVisibleChartRange();
    var sortedItems = [];
    //var minDate = range.end;
    var nearItem = null;
    var minNegItem = null;
    var minPosItem = null;

    var rangeStart = new Date(this._selectedYear - 1, 0, 1),
        rangeEnd = new Date(this._selectedYear + 1, 11, 31),
        minDate = new Date(this._selectedYear - 1, 0, 1);

    var sDate = this.getSliderDate();

    if (sDate) {

        var minArr = [];

        var sDate_ms = sDate.getTime();

        var minNeg = -1000000000000;
        var minPos = 1000000000000;
        var date;

        for (var i = 0; i < tl.items.length; i++) {
            var item = tl.items[i];
            var itemDate = new Date(item.center);
            var itemDate_ms = itemDate.getTime();

            var distance = sDate_ms - itemDate_ms;

            if (item.dom && itemDate >= rangeStart && itemDate <= rangeEnd) {
                if (distance >= 0) {
                    if (distance <= minPos) {
                        minPos = distance;
                        minPosItem = item;
                        date = new Date(item.center);
                    }
                } else {
                    if (distance >= minNeg) {
                        minNeg = distance;
                        minNegItem = item;
                        date = new Date(item.center);
                    }
                }
            }
        }

        if (!dir || dir == -1) {
            nearItem = minPosItem;
        } else if (dir == 1) {
            nearItem = minNegItem;
        }

    }

    if (nearItem) {
        $(".timeline-event.timeline-event-line").removeClass("timeline-event-selected");
        var index = tl.getItemIndex(nearItem.dom);
        tl.setSelection([{ "row": index }]);
        this.setTimeLineYear(date.getFullYear());
        this._setSliderState(tl.getVisibleChartRange(), date, true);
        var that = this;
        setTimeout(function () {
            that.timeLine.shiftActiveItem(0);
            that.setTimeLineYear(that._selectedYear);
        }, 50);
    }
};


NDVITimelineManager.disableHomogenuity = function () {
    document.getElementById("inhomogenuityRadio").disabled = true;
    $(".inhomogenuityRadio").addClass("ntDisabledLabel");
};

NDVITimelineManager.prototype._switchYear = function (date) {
    this._selectedDate = date;
    this.switchYear(date.getFullYear());
    this._switchYearCallback = null;
};

NDVITimelineManager.fires_ht = {};

NDVITimelineManager.prototype._filterTimeline = function (elem, layer) {

    var prop = elem.obj.properties;

    if (this._combo[this._selectedCombo].rk[0] == "FIRES") {
        var dateCn = this._layersLegend["FIRES"].dateColumnName;
        var date = prop[layer._gmx.tileAttributeIndexes[dateCn]];
        var d = new Date(date * 1000);
        var y = d.getFullYear();
        var name = d.getDate() + "_" + d.getMonth() + "_" + y;
        if (this._selectedYear != y || NDVITimelineManager.fires_ht[name]) {
            return false;
        } else {
            NDVITimelineManager.fires_ht[name] = elem;
            return true;
        }
    } else if (this._combo[this._selectedCombo].resolution === "landsat") {
        var isQl = $("#chkQl").is(':checked');
        var gmxRKid = layer._gmx.tileAttributeIndexes['GMX_RasterCatalogID'];
        var ql;
        if (gmxRKid) {
            ql = (prop[gmxRKid].length == 0);
        } else {
            if (isQl) {
                return true;
            }
            return false;
            //ql = true;
        }
        var showQuicklooks = this._layerConfigs[layer.options.layerID].showQuicklooks;

        if (isQl && showQuicklooks && ql) {
            return true;
        }

        var cloudsId = this._layerConfigs[layer.options.layerID].cloudsField && (
            layer._gmx.tileAttributeIndexes[this._layerConfigs[layer.options.layerID].cloudsField.toUpperCase()] ||
            layer._gmx.tileAttributeIndexes[this._layerConfigs[layer.options.layerID].cloudsField.toLowerCase()]);

        if (cloudsId) {
            if (isQl && !showQuicklooks && !ql) {
                return true;
            } else if (isQl && showQuicklooks && !ql) {
                return true;
            } else if (showQuicklooks && (prop[cloudsId] <= this._combo[this._selectedCombo].cloudsMin || prop[cloudsId] <= this._layerConfigs[layer.options.layerID].cloudsMin)) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    } else {
        return true;
    }

    return false;
};

NDVITimelineManager.prototype._setLayerImageProcessing = function (layer, shotType) {
    if (this._layersLegend[shotType].palette) {
        var layerPalette = this._layersLegend[shotType].palette;
        var q = layerPalette.quality,
            n = layerPalette.ndvi,
            c = layerPalette.classification;

        n && (this._palettes[n.url] = []);
        q && (this._palettes[q.url] = []);
        c && (this._palettes[c.url] = []);

        n && (shared.loadPaletteSync(n.url, null, this._palettes[n.url]));
        q && (shared.loadPaletteSync(q.url, null, this._palettes[q.url]));
        c && (shared.loadPaletteSync(c.url, null, this._palettes[c.url]));
        var that = this;
        layer.setRasterHook(
            function (dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info) {
                that._tileImageProcessing(dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info, shotType, layer);
            });
    }
};

NDVITimelineManager.prototype._tileImageProcessing = function (dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info, shotType, layer) {

    var layerPalette = this._layersLegend[shotType].palette,
        url;

    if (shotType === "CLASSIFICATION") {
        var n = layerPalette.classification;
        var url = n.url;
        this._applyClassificationPalette(url, dstCanvas, srcImage, info);
    } else {
        if (layerPalette) {
            var q = layerPalette.quality,
                n = layerPalette.ndvi;

            if (n) {
                url = n.url
            } else if (q) {
                url = q.url
            }
        }

        this._applyPalette(url, dstCanvas, srcImage, shotType, info);
    }
};

NDVITimelineManager.checkGreyImageData = function (data) {
    for (var i = 0; i < data.length; i += 4) {
        if (((data[i] & data[i + 1]) ^ data[i + 2])) {
            return false;
        }
    }
    return true;
};

NDVITimelineManager.prototype._applyClassificationPalette = function (url, dstCanvas, srcCanvas, info) {
    var that = this;
    var palette = this._palettes[url];
    var canvas = document.createElement("canvas");
    var w = 256,
        h = 256;
    canvas.width = w;
    canvas.height = h;
    var context = canvas.getContext('2d');
    context.drawImage(srcCanvas, 0, 0, w, h);
    var imgd = context.getImageData(0, 0, w, h);
    var pix = imgd.data;

    if (NDVITimelineManager.checkGreyImageData(pix)) {
        shared.zoomTile(srcCanvas, info.source.x, info.source.y, info.source.z,
           info.destination.x, info.destination.y, that.lmap.getZoom(),
           dstCanvas,
           function (r, g, b, a) {
               var px = r;
               var pal = palette[px];
               if (pal !== undefined) {
                   if (r == 0 && g == 0 && b == 0) {
                       return [0, 179, 255, 255];
                   } else {
                       return [pal.partRed, pal.partGreen, pal.partBlue, 255];
                   }
               }
               return [0, 0, 0, 255];
           }, shared.NEAREST);

    } else {
        shared.zoomTile(srcCanvas, info.source.x, info.source.y, info.source.z,
           info.destination.x, info.destination.y, that.lmap.getZoom(),
           dstCanvas, null, shared.NEAREST);
    }
};

NDVITimelineManager.prototype._applyPalette = function (url, dstCanvas, srcCanvas, shotType, info) {
    //если есть url, значит есть палитра.
    var that = this;
    if (url) {
        var palette = this._palettes[url];
        shared.zoomTile(srcCanvas, info.source.x, info.source.y, info.source.z,
        info.destination.x, info.destination.y, that.lmap.getZoom(),
        dstCanvas,
        function (r, g, b, a) {
            var pal = palette[r];
            if (pal) {
                return [pal.partRed, pal.partGreen, pal.partBlue, 255];
            } else {
                if (r == 0 && g == 0 && b == 0) {
                    return [0, 179, 255, 255];
                }
                if (r < 101) {
                    return [0, 0, 0, 255];
                }
                if (r > 201) {
                    return [255, 255, 255, 255];
                }
                return [0, 0, 0, 255];
            }
        }, shared.NEAREST);
    } else {
        dstCanvas = srcCanvas;
    }
};